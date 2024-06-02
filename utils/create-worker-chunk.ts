import { createSubtitles } from "./subtitles";
import { createChunks } from "./chunks";
import { ArrayChunk } from "../entities/chunk";

export function createWorkerChunks(data: string, size: number) {
    /*
    * Create chunks, each of which contains an array of subtitles in string format.
    * The number of chunks is determined by the size parameter, which is typically the number of workers.
    * E.g. size is 2, there are 1000 subtitle elements, then the function will return 2 chunks, each of which contains roughly 500 subtitle strings.
    */
    const subResult = createSubtitles(data)
    if (subResult.type === 'error') {
        return {
            type: 'error',
            message: subResult.message,
            value: []
        }
    }

    const chunkSize = Math.ceil(subResult.value.length / size)
    const chunks = createChunks(subResult.value, { maxSize: chunkSize, ChunkClass: ArrayChunk })

    return {
        type: 'success',
        message: '',
        value: chunks
    }
}