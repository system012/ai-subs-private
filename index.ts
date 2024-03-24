import ollama from 'ollama'

const SUBTITLE_DELIMITER = '\n\n'
const LINE_DELIMITER = '\n'
const LINE_REGEX = /\d+\n[\s\S]*?(?=(\n\d+\n|$))/g

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
    const normalizedSubs = sourceSubs.replace(/\r\n/g, '\n')

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

    for (const subtitle of subtitles) {
        const newCharCount = charCount + subtitle.length;
        const subEndsWithDot = subtitle.endsWith('.')

        if (newCharCount > 1000 && subEndsWithDot) {
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

            // Start a new chunk with the current subtitle
            chunk = subtitle + SUBTITLE_DELIMITER
            charCount = subtitle.length;
        } else {
            // Add the subtitle to the current chunk
            chunk += subtitle + SUBTITLE_DELIMITER
            charCount = newCharCount;
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
        return false
    }
    
    let lineNumber = 0
    const originalSubLines = originalChunk.match(LINE_REGEX) ?? []
    const previousSubLines = previousChunks.match(LINE_REGEX) ?? []

    for (const [index, line] of lines.entries()) {
        // for each line, check that the first element is a number
        const splitLine = line.split(LINE_DELIMITER)
        const firstElement = parseInt(splitLine[0])
        const isNumber = !isNaN(firstElement)
        if (!isNumber) {
            console.error('First element is not a number. Sequence is not valid.', { firstElement })
            return false
        }
        // check if the number is sequentially after the previousChunk
        // e.g. if the previous chunk ends with 10, the next chunk should start with 11
        if (index === 0 && previousChunks.length > 0) {
            const previousLine = previousSubLines[previousSubLines.length - 1]
            const previousLineSplit = previousLine.split(LINE_DELIMITER)
            const previousFirstElement = parseInt(previousLineSplit[0])
            if (previousFirstElement !== 0 && firstElement !== previousFirstElement + 1) {
                console.error('Line number is not sequential after the previous chunk. Sequence is not valid.', { previousFirstElement, firstElement, previousChunk: previousLine, currentChunk: line })
                return false
            }
        }
        // check if the number is sequential
        if (lineNumber !== 0 && firstElement !== lineNumber) {
            console.error('Line number is not sequential. Sequence is not valid.', { lineNumber: firstElement, firstElement })
            return false
        }
        lineNumber = firstElement + 1

        // check if the second element is a valid timecode
        const timecode = splitLine[1]
        const timecodeRegex = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/
        const isValidTimecode = timecodeRegex.test(timecode)
        if (!isValidTimecode) {
            console.error('Second element is not a timecode. Sequence is not valid.', { timecode })
            return false
        }

        // check if the whole line is not more than double or less than half the length of the original subtitle
        const originalLine = originalSubLines[index]
        const originalLineLength = originalLine.length
        const splitLineLength = line.length
        const isWithinRange = splitLineLength <= originalLineLength * 2 && splitLineLength >= originalLineLength / 2
        if (!isWithinRange) {
            console.error('Line length is not within range. Sequence is not valid.', { originalSubtitleLength: originalLineLength, splitLineLength, originalLine, newSubtitle: line })
            return false
        }
    }

    return true
}

function processResponse(content: string) {
    // trim spaces
    return content.trim()
}

async function translate({ chunk, subtitles, attempts = 0, maxAttempts = 100 }:
    { chunk: string, subtitles: string, attempts?: number, maxAttempts?: number } = {
        chunk: "",
        subtitles: "",
        attempts: 0,
        maxAttempts: 3
    }): Promise<{
        translated: string,
        error: boolean
    }> {
    // recursively translate the subtitles if content is not valid
    console.log('Generating response...')
    const translated = await generate(chunk)
    const isValid = validate(translated, chunk, subtitles)

    if (!isValid) {
        if (attempts >= maxAttempts) {
            console.error('Max attempts reached')
            return { translated, error: true }
        }
        console.error('Response is not valid. Retrying...', attempts + 1, ' out of ', maxAttempts)
        console.log('Response:', translated)
        return translate({ chunk, subtitles, attempts: attempts + 1, maxAttempts })
    }

    console.log('Response generated')
    const processed = processResponse(translated)

    return { translated: processed + SUBTITLE_DELIMITER, error: false }
}

async function generate(content: string) {
    try {
        console.log('Input sent', { length: content.length, content })
        const response = await ollama.generate({
            model: 'mixtral:8x7b-instruct-v0.1-q3_K_M',
            system: `You are a professional translator from english to italian.
            You're going to receive english subtitles in SRT format.
            Your job is to ONLY translate the text from english to italian.
            Leave everything else as is.
            DO NOT change the timecode.
            DO NOT change the line number.
            DO NOT change the structure of the text.
            DO NOT say anything else.`,
            prompt: content,
            options: {
                temperature: 0.5,
            }
        })
        return response.response
    } catch (error) {
        console.error('Error generating response:', error)
        return generate(content)
    }
}

main()