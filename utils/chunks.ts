import { Chunk } from "../entities/chunk";
import { DEFAULT_MAX_CHUNK_SIZE } from "./constants";

type DataT = {
  toString(): string;
};

type ChunkOptions = {
  maxSize: number;
};
export const createChunks = <T extends DataT>(
  data: T[],
  { maxSize }: ChunkOptions = {
    maxSize: DEFAULT_MAX_CHUNK_SIZE,
  },
) => {
  return data.reduce((chunks: Chunk[], sub) => {
    const lastChunk = chunks.at(-1);
    if (!lastChunk || lastChunk?.isChunkFull()) {
      const chunk = Chunk.create(chunks.length);
      chunk.withMaxSize(maxSize).append(sub.toString());
      chunks.push(chunk);
      return chunks;
    }

    lastChunk?.append(sub.toString());
    return chunks;
  }, []);
};
