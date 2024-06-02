import { LINE_DELIMITER, DEFAULT_MAX_CHUNK_SIZE } from "../utils/constants";
import { isDialogueOver } from "../utils/subtitles";

export class Chunk {
    public data: string = ''
    private maxSize: number = DEFAULT_MAX_CHUNK_SIZE

    constructor() {
    }

    get size() {
        return this.data.length;
    }

    append(data: string) {
        this.data += data + LINE_DELIMITER
    }

    isChunkFull() {
        return this.size > this.maxSize && isDialogueOver(this.data.trimEnd())
    }

    withMaxSize(size: number) {
        this.maxSize = size
        return this
    }
}

export class ArrayChunk {
    public data: string[] = [];
    private maxSize: number = DEFAULT_MAX_CHUNK_SIZE;

    constructor() {
    }

    get size() {
        return this.data.length;
    }

    append(item: string) {
        this.data.push(item);
    }

    isChunkFull() {
        const lastElement = this.data.at(-1)
        return this.size > this.maxSize && isDialogueOver(lastElement ?? '');
    }

    withMaxSize(size: number) {
        this.maxSize = size;
        return this;
    }
}

// export class Chunks {
//     private chunks: Chunk[] = []
//     private maxSize: number = DEFAULT_MAX_CHUNK_SIZE

//     constructor(chunks: Chunk[] = []) {
//         this.chunks = chunks
//     }

//     get size() {
//         return this.chunks.reduce((acc, chunk) => acc + chunk.size, 0)
//     }

//     add(chunk: Chunk) {
//         this.chunks.push(chunk)
//     }

//     withMaxSize(size: number = DEFAULT_MAX_CHUNK_SIZE) {
//         this.maxSize = size
//         return this
//     }

//     append(data: string) {
//         const lastChunk = this.chunks.at(-1)
//         if (!lastChunk || lastChunk?.isChunkFull()) {
//             this.add(new Chunk(data).withMaxSize(this.maxSize))
//             return
//         }

//         lastChunk?.append(data)
//     }

//     *[Symbol.iterator]() {
//         for (const chunk of this.chunks) {
//             yield chunk
//         }
//     }
// }

// export class ArrayChunks {
//     public chunks: ArrayChunk[] = [];
//     private maxSize: number = DEFAULT_MAX_CHUNK_SIZE;

//     constructor(chunks: ArrayChunk[] = []) {
//         this.chunks = chunks;
//     }

//     get size() {
//         return this.chunks.reduce((acc, chunk) => acc + chunk.size, 0);
//     }

//     add(chunk: ArrayChunk) {
//         this.chunks.push(chunk);
//     }

//     withMaxSize(size: number = DEFAULT_MAX_CHUNK_SIZE) {
//         this.maxSize = size;
//         return this;
//     }

//     append(data: string) {
//         const lastChunk = this.chunks.at(-1);
//         if (!lastChunk || lastChunk?.isChunkFull()) {
//             this.add(new ArrayChunk(data).withMaxSize(this.maxSize));
//             return;
//         }

//         lastChunk?.append(data);
//     }

//     map<T>(callback: (chunk: ArrayChunk, index: number) => T): T[] {
//         return this.chunks.map(callback);
//     }

//     *[Symbol.iterator]() {
//         for (const chunk of this.chunks) {
//             yield chunk;
//         }
//     }
// }