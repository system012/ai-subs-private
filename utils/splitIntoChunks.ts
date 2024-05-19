import { SUBTITLE_DELIMITER } from "./constants";

export function splitIntoChunks(data: string, size: number) {
    const lines = data.split(SUBTITLE_DELIMITER)
    const chunkSize = Math.ceil(lines.length / size)
    const chunks = []

    for (let i = 0; i < lines.length; i += chunkSize) {
        chunks.push(lines.slice(i, i + chunkSize))
    }
    return chunks
}