import ollama from 'ollama'
import { LINE_REGEX, LINE_DELIMITER } from './constants'

export async function translate({ chunk, promptAddendum = "", temperature = 0.7, attempts = 0, maxAttempts = 100 }:
    { chunk: string, promptAddendum?: string, temperature?: number, attempts?: number, maxAttempts?: number } = {
        chunk: "",
        promptAddendum: "",
        temperature: 0.7,
        attempts: 0,
        maxAttempts: 3
    }): Promise<{
        translated: string,
        error: boolean
    }> {
    const translated = await generate(chunk, promptAddendum, temperature)
    const { isValid, promptAddendum: prompt } = validate(translated, chunk)

    // recursively translate the subtitles if content is not valid
    if (!isValid) {
        // const addendum = createRandomPromptAddendum(attempts)
        const temperature = adjustTemperature(attempts)
        if (attempts >= maxAttempts) {
            console.error('Max attempts reached')
            return { translated, error: true }
        }
        console.error('Response is not valid. Retrying...', attempts + 1, ' out of ', maxAttempts)
        console.log('Response:', translated)
        return translate({
            // chunk, promptAddendum: prompt + '\n' + addendum, temperature, attempts: attempts + 1, maxAttempts
            chunk, promptAddendum: prompt + '\n', temperature, attempts: attempts + 1, maxAttempts
        })
    }

    console.log('Response generated')
    const processed = processResponse(translated, chunk)

    return { translated: processed, error: false }
}

export async function generate(content: string, promptAddendum = "", temperature = 0.7) {
    try {
        const system = `You are a professional translator from english to Italian.
            You're going to receive english subtitles in SRT format.
            Read the text carefully.
            Your job is to ONLY translate the text from english to italian.
            Translate it as accurately as possible, like a native speaker.
            The translated text should sound natural and fluent in Italian.
            Leave everything else as is.
            DO NOT change the timecode.
            DO NOT change the line number.
            DO NOT change the structure of the text.
            DO NOT say anything else.
            ${promptAddendum}`

        console.log('Input sent', { length: content.length, content, prompt: promptAddendum !== "" ? system : "" })
        const response = await ollama.generate({
            model: 'mixtral:8x7b-instruct-v0.1-q3_K_M',
            // model: 'dolphin-llama3:8b-v2.9-q8_0',
            // model: 'llava-llama3:latest',
            system,
            prompt: content,
            options: {
                temperature,
            }
        })
        return response.response
    } catch (error) {
        console.error('Error generating response:', error)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return generate(content, promptAddendum)
    }
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
        "Respect the pacing of the original subtitle and DO NOT merge multiple dialogues into one.",
        "EXTREMELY IMPORTANT: do NOT miss any dialogue.",
        "Make sure to include ALL the lines, otherwise someone might get hurt.",
        "DOUBLE CHECK if all lines are accounted for but DO NOT say anything about it",
    ]
    // rotate the prompts based on the number of attempts
    const index = attempts % prompts.length
    return '\n' + prompts[index]
}

function validate(chunk: string, originalChunk: string) {
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
        // return { isValid: false, promptAddendum: 'DOUBLE CHECK if all lines are accounted for but DO NOT say anything about it' }
        // get the first dialogue number and the last one
        const firstDialogue = originalSubLines.at(0)?.split(LINE_DELIMITER)[0]
        const lastDialogue = originalSubLines.at(-1)?.split(LINE_DELIMITER)[0] ?? 0
        return { isValid: false, promptAddendum: `There are ${originalSubLines.length} lines in the original subtitle: from ${firstDialogue} to ${lastDialogue}. Make sure to include ALL of them.` }
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
        // const originalLineLength = originalLine.length
        // const splitLineLength = line.length
        const text = splitLine.slice(2).reduce((acc, sub) => { acc += sub; return acc }, '')
        const originalText = originalLine.split(LINE_DELIMITER).slice(2).reduce((acc, sub) => { acc += sub; return acc }, '')
        const textLength = text.length
        const originalTextLength = originalText.length
        const moreThanTriple = textLength > originalTextLength * 3
        const lessThanThird = textLength < originalTextLength / 3
        const isWithinRange = !moreThanTriple && !lessThanThird
        const exceptions = ['♪']

        if (exceptions.includes(originalText)) {
            console.log('[WithinRange check] Skipping line with exception:', originalLine)
            continue
        }

        if (!isWithinRange) {
            console.error('Line length is not within range. Sequence is not valid.', {
                originalTextLength,
                textLength,
                originalSub: originalLine.split(LINE_DELIMITER).slice(2).reduce((acc, sub) => { acc += sub; return acc }, ''),
                newSub: splitLine.slice(2).reduce((sub, acc) => { acc += sub; return acc }, ''),
                moreThanTriple,
                lessThanHalf: lessThanThird
            })
            return { isValid: false, promptAddendum: `Translate the dialogue number ${firstElement} FAITHFULLY to the original language, without adding or removing anything.` }
        }
    }

    return { isValid: true, promptAddendum: '' }
}

function processResponse(content: string, originalChunk: string) {
    // trim spaces
    const trimmedContent = content.trim()
    const lines = trimmedContent.match(LINE_REGEX) ?? []
    console.log('Lines:', lines)
    const originalSubLines = originalChunk.match(LINE_REGEX) ?? []

    let processed = ''
    for (const [index, line] of lines.entries()) {
        const originalLine = originalSubLines[index]
        const splitLine = line.trim().split(LINE_DELIMITER)
        const splitOriginalLine = originalLine.split(LINE_DELIMITER)

        // replace timecode with original one
        const timecode = splitOriginalLine[1]
        splitLine[1] = timecode

        // check how many new lines are at the end of the dialogue: if one, add a new line; if none, add two new lines
        // line example: "10\n00:00:15,363 --> 00:00:16,451\nSarebbe disponibile\na sentirti."
        // in this case, there is none so we add two new lines
        const newLines = splitLine.at(-1)?.match(/\n/g)?.length ?? 0
        const newLinesToAdd = newLines === 1 ? '\n' : newLines === 2 ? '' : '\n\n'
        splitLine[splitLine.length - 1] = splitLine.at(-1) + newLinesToAdd

        // join the line back
        processed += splitLine.join(LINE_DELIMITER)
    }

    // return processed + LINE_DELIMITER
    return processed
}