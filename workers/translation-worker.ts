import { parentPort } from 'worker_threads';
import { fileExists, readFile, appendToFile } from '../utils/io';
import { translate } from '../utils/translation';
import { createSubtitles } from '../utils/subtitles';
import { createChunks } from '../utils/chunks';
import { Chunk, type ArrayChunk } from '../entities/chunk';
import { DEFAULT_MAX_CHUNK_SIZE } from '../utils/constants';

export type WorkerData = {
    rawSubtitles: ArrayChunk
    tempFilePath: string
    index: number
}

parentPort?.on('message', async (data: WorkerData) => {
    const { rawSubtitles, tempFilePath, index } = data
    const logger = createLogger(index)
    const savedSubtitles = await fileExists(tempFilePath) && await readFile(tempFilePath) || ''
    savedSubtitles.length > 0 && logger.log('Resuming translation')

    const { type, value: savedSubs } = savedSubtitles.length > 0 ? createSubtitles(savedSubtitles) : { type: 'success', value: [] } as const
    if (type === 'error') {
        logger.error('Error processing new sub. Sub is invalid')
        return
    }

    const chunks = createChunks(
        rawSubtitles.data.slice(Math.max(savedSubs.length, 0)),
        { maxSize: DEFAULT_MAX_CHUNK_SIZE, ChunkClass: Chunk }
    )

    console.time('translation ' + tempFilePath)

    for (const chunk of chunks) {
        logger.log('Generating translations... ' + tempFilePath)
        const { translated, type } = await translate({ chunk });
        if (type === 'error') {
            logger.error('Error generating translations')
            console.timeEnd('translation ' + tempFilePath)
            return
        }

        appendToFile(tempFilePath, translated)
    }

    console.timeEnd('translation ' + tempFilePath)
    logger.log('Sending translations to main thread...')
    parentPort?.postMessage(await readFile(tempFilePath))
})

function createLogger(index: number) {
    return {
        log: (...msg: any[]) => console.log(`[worker ${index}]`, ...msg),
        error: (...msg: any) => console.error(`[worker ${index}]`, ...msg)
    }
}