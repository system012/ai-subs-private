import ollama from 'ollama'

const SUBTITLE_DELIMITER = '\n\n'
const LINE_DELIMITER = '\n'
const LINE_REGEX = /(\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n[\s\S]*?)(?=(\n\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n|$))/g;

async function main() {
    // get argument from command line
    const inputPath = process.argv[2]
    const outputPath = process.argv[3]
    const resumeFromFile = process.argv[4]
    if (!inputPath) {
        console.error('Please provide a file path')
        return
    }
    if (!outputPath) {
        console.error('Please provide an output file path')
        return
    }

    // read file
    const sourceSubs = await readFile(inputPath)
    const normalizedSubs = normalizeSubs(sourceSubs)

    let subtitles: string[] = normalizedSubs.split(SUBTITLE_DELIMITER)
    let newSubtitles = ''

    if (resumeFromFile) {
        console.log('Resuming from file: ', resumeFromFile)
        newSubtitles = await readFile(resumeFromFile)
        subtitles = subtitles.slice(newSubtitles.split(SUBTITLE_DELIMITER).length - 1)
    }

    console.log('Starting translation timer...')
    console.time('translation')

    let chunk = "";
    let charCount = 0;
    let isChunkEnd = false

    for (const subtitle of subtitles) {
        if (charCount > 800 && isChunkEnd) {
            // Generate translations for the current chunk
            const { translated, error } = await translate({ chunk, subtitles: newSubtitles });
            if (error) {
                console.error('Error generating translations', { currentLength: newSubtitles.length, currentChunk: chunk })
                console.log('Writing file to save progress...')
                writeFile(outputPath, newSubtitles)
                console.timeEnd('translation')
                return
            }
            console.log('Translations generated')
            newSubtitles += translated
            writeFile(outputPath, newSubtitles)

            // Start a new chunk with the current subtitle, because we just translated the previous chunk
            chunk = subtitle + SUBTITLE_DELIMITER
            charCount = subtitle.length;
            isChunkEnd = subtitle.endsWith('.') || subtitle.endsWith('!') || subtitle.endsWith(')')
        } else {
            // Add the subtitle to the current chunk
            chunk += subtitle + SUBTITLE_DELIMITER
            charCount = chunk.length;
            isChunkEnd = subtitle.endsWith('.') || subtitle.endsWith('!') || subtitle.endsWith(')')
        }
    }

    // Generate translations for the remaining chunk (which will be less than 1000 characters)
    const { translated, error } = await translate({ chunk, subtitles: newSubtitles });
    if (error) {
        console.error('Error generating translations', { currentLength: newSubtitles.length, currentChunk: subtitles.length })
        console.log('Writing file to save progress...')
        writeFile(outputPath, newSubtitles)
        console.timeEnd('translation')
        return
    }
    console.log('Translations generated')
    newSubtitles += translated

    console.timeEnd('translation')

    // write file
    console.log('Writing file...')
    writeFile(outputPath, newSubtitles)
    console.log('File written')
}

function readFile(path: string) {
    return Bun.file(path).text()
}

function writeFile(path: string, content: string): void {
    try {
        Bun.write(path, content)
    } catch (error) {
        console.error(`Error writing file: ${error}`)
    }
}

function validate(chunk: string, originalChunk: string, previousChunks: string) {
    const trimmedContent = chunk.trim()

    // split lines by number followed by \n.
    const lines = trimmedContent.match(LINE_REGEX)
    if (!lines) {
        console.error('No lines found. Sequence is not valid.')
        console.log('Content:', [trimmedContent])
        return { isValid: false, promptAddendum: 'Be EXTRA careful with respecting the SRT structure.' }
    }

    let lineNumber = 0
    const originalSubLines = originalChunk.match(LINE_REGEX) ?? []

    if (originalSubLines.length !== lines.length) {
        console.error('Number of lines do not match original subtitle. Sequence is not valid.', { originalLength: originalSubLines.length, newLength: lines.length })
        return { isValid: false, promptAddendum: 'DOUBLE CHECK if all lines are accounted for but DO NOT say anything about it' }
    }

    for (const [index, line] of lines.entries()) {
        // for each line, check that the first element is a number
        const splitLine = line.split(LINE_DELIMITER)
        const firstElement = parseInt(splitLine[0])
        const isNumber = !isNaN(firstElement)
        if (!isNumber) {
            console.error('First element is not a number. Sequence is not valid.', { firstElement })
            return { isValid: false, promptAddendum: 'Make sure to include the line number.' }
        }
        // check if the number is sequential
        if (lineNumber !== 0 && firstElement !== lineNumber) {
            console.error('Line number is not sequential. Sequence is not valid.', { lineNumber: firstElement, firstElement })
            return { isValid: false, promptAddendum: 'Make sure to be ACCURATE and NOT MISS ANY line number' }
        }
        lineNumber = firstElement + 1

        // check if the second element is a valid timecode
        const timecode = splitLine[1]
        const timecodeRegex = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/
        const isValidTimecode = timecodeRegex.test(timecode)
        if (!isValidTimecode) {
            console.error('Second element is not a timecode. Sequence is not valid.', { timecode })
            return { isValid: false, promptAddendum: 'Make sure to RESPECT the timecode structure.' }
        }

        // check if the whole line is not more than double or less than half the length of the original subtitle
        const originalLine = originalSubLines[index]
        const originalLineLength = originalLine.length
        const splitLineLength = line.length
        const isWithinRange = splitLineLength <= originalLineLength * 2 && splitLineLength >= originalLineLength / 2
        if (!isWithinRange) {
            console.error('Line length is not within range. Sequence is not valid.', { originalSubtitleLength: originalLineLength, splitLineLength, originalLine, newSubtitle: line })
            return { isValid: false, promptAddendum: 'Make sure to BE ACCURATE with each dialogue.' }
        }
    }

    return { isValid: true, promptAddendum: '' }
}

function processResponse(content: string, originalChunk: string) {
    // trim spaces
    const trimmedContent = content.trim()
    const lines = trimmedContent.match(LINE_REGEX) ?? []
    const originalSubLines = originalChunk.match(LINE_REGEX) ?? []

    let processed = ''
    for (const [index, line] of lines.entries()) {
        const originalLine = originalSubLines[index]
        const splitLine = line.split(LINE_DELIMITER)
        const splitOriginalLine = originalLine.split(LINE_DELIMITER)

        // replace timecode with original one
        const timecode = splitOriginalLine[1]
        splitLine[1] = timecode

        // join the line back
        processed += splitLine.join(LINE_DELIMITER)

        // add line delimiter
        processed += LINE_DELIMITER
    }

    return processed + LINE_DELIMITER
}

async function translate({ chunk, subtitles, promptAddendum = "", temperature = 0.7, attempts = 0, maxAttempts = 100 }:
    { chunk: string, subtitles: string, promptAddendum?: string, temperature?: number, attempts?: number, maxAttempts?: number } = {
        chunk: "",
        subtitles: "",
        promptAddendum: "",
        temperature: 0.7,
        attempts: 0,
        maxAttempts: 3
    }): Promise<{
        translated: string,
        error: boolean
    }> {
    console.log('Generating response...')
    const translated = await generate(chunk, promptAddendum, temperature)
    const { isValid, promptAddendum: prompt } = validate(translated, chunk, subtitles)

    // recursively translate the subtitles if content is not valid
    if (!isValid) {
        const addendum = createRandomPromptAddendum(attempts)
        const temperature = adjustTemperature(attempts)
        if (attempts >= maxAttempts) {
            console.error('Max attempts reached')
            return { translated, error: true }
        }
        console.error('Response is not valid. Retrying...', attempts + 1, ' out of ', maxAttempts)
        console.log('Response:', translated)
        return translate({
            chunk, subtitles, promptAddendum: prompt + '\n' + addendum, temperature, attempts: attempts + 1, maxAttempts
        })
    }

    console.log('Response generated')
    const processed = processResponse(translated, chunk)

    return { translated: processed, error: false }
}

async function generate(content: string, promptAddendum = "", temperature = 0.7) {
    try {
        const system = `You are a professional translator from english to italian.
            You're going to receive english subtitles in SRT format.
            Your job is to ONLY translate the text from english to italian.
            Leave everything else as is.
            DO NOT change the timecode.
            DO NOT change the line number.
            DO NOT change the structure of the text.
            DO NOT say anything else.` + '\n' + promptAddendum

        console.log('Input sent', { length: content.length, content, prompt: promptAddendum !== "" ? system : "" })
        const response = await ollama.generate({
            model: 'command-r:35b-v0.1-q3_K_S',
            system,
            prompt: content,
            options: {
                temperature
            }
        })
        return response.response
    } catch (error) {
        console.error('Error generating response:', error)
        return generate(content, promptAddendum)
    }
}

function normalizeSubs(subs: string) {
    return subs.replace(/\r\n/g, '\n').replace(/\n\n$/, '\n')
}

function adjustTemperature(attempts: number) {
    // adjust temperature based on the number of attempts, using the modulo operator
    // temperatures is a range of values between 0.1 and 1.0
    const temperatures = [0.1, 0.3, 0.5, 0.7, 0.9]
    const index = attempts % temperatures.length

    return temperatures[index]
}

function createRandomPromptAddendum(attempts: number) {
    const prompts = [
        "Be EXTRA careful with respecting the SRT structure.",
        "EXTREMELY IMPORTANT: do NOT miss any dialogue.",
        "Make sure to include ALL the lines, otherwise someone might get hurt.",
        "DOUBLE CHECK if all lines are accounted for but DO NOT say anything about it",
    ]
    // rotate the prompts based on the number of attempts
    const index = attempts % prompts.length
    return '\n' + prompts[index]
}

main()