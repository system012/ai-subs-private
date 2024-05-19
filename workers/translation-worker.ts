import { parentPort } from 'worker_threads';
import { writeFile, fileExists, readFile } from '../utils/io';
import { translate } from '../utils/translation';
import { SUBTITLE_DELIMITER } from '../utils/constants';

parentPort?.on('message', async (data) => {
    const { subtitles, tempFilePath } = data
    let chunk = "";
    let charCount = 0;
    let isChunkEnd = false
    let newSubtitles = await fileExists(tempFilePath) && await readFile(tempFilePath) || ''
    const subChunks = subtitles.slice(newSubtitles.split(SUBTITLE_DELIMITER).length - 1)

    if (newSubtitles.length > 0) {
        console.log('Resuming translation...')
    }

    console.time('translation ' + tempFilePath)

    for (const subtitle of subChunks) {
        if (charCount > 600 && isChunkEnd) {
            // Generate translations for the current chunk
            console.log('Generating translations... ' + 'worker: ' + tempFilePath)
            const { translated, error } = await translate({ chunk });
            if (error) {
                console.error('Error generating translations')
                console.log('Writing file to save progress...')
                writeFile(tempFilePath, newSubtitles)
                console.timeEnd('translation')
                return
            }
            console.log('\nTranslations generated for file:', tempFilePath)
            newSubtitles += translated
            writeFile(tempFilePath, newSubtitles)

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

    if (chunk.length > 0) {
        const { translated, error } = await translate({ chunk });
        if (error) {
            console.error('Error generating translations', { currentLength: newSubtitles.length, currentChunk: subtitles.length })
            console.log('Writing file to save progress...')
            writeFile(tempFilePath, newSubtitles)
            console.timeEnd('translation')
            return
        }
        console.log('Translations generated')
        newSubtitles += translated

        // write file
        console.log('Writing file...')
        writeFile(tempFilePath, newSubtitles)
        console.log('File written')
    }

    console.timeEnd('translation ' + tempFilePath)

    console.log('Sending translations to main thread...')
    parentPort?.postMessage(newSubtitles)
})
