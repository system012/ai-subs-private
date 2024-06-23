import { ArrayChunk, Chunk } from "../entities/chunk";
import { DEFAULT_MAX_CHUNK_SIZE } from "./constants";

type DataT = {
  toString(): string;
};

type ChunkOptions<C extends Chunk | ArrayChunk> = {
  maxSize: number;
  ChunkClass: { new (): C };
};
export const createChunks = <T extends DataT, C extends Chunk | ArrayChunk>(
  data: T[],
  { maxSize, ChunkClass }: ChunkOptions<C> = {
    maxSize: DEFAULT_MAX_CHUNK_SIZE,
    ChunkClass: Chunk as { new (): C },
  },
) => {
  return data.reduce((chunks, sub) => {
    const lastChunk = chunks.at(-1);
    if (!lastChunk || lastChunk?.isChunkFull()) {
      const chunk = new ChunkClass();
      chunk.withMaxSize(maxSize).append(sub.toString());
      chunks.push(chunk);
      return chunks;
    }

    lastChunk?.append(sub.toString());
    return chunks;
  }, [] as C[]);
};
