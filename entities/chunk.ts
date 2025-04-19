import { LINE_DELIMITER, DEFAULT_MAX_CHUNK_SIZE } from "../utils/constants";
import { isDialogueOver } from "../utils/subtitles";
import type { SubtitleT } from "./subtitle";

export class Chunk {
  private _maxSize: number = DEFAULT_MAX_CHUNK_SIZE;

  private constructor(
    public id: number = 0,
    public data: string = "",
  ) {
    this.id = id;
    this.data = data;
  }

  get size() {
    return this.data.length;
  }

  get maxSize() {
    return this._maxSize;
  }

  append(data: string) {
    this.data += data + LINE_DELIMITER;
  }

  toString() {
    //
  }
  isChunkFull() {
    return this.size >= this._maxSize && isDialogueOver(this.data.trimEnd());
  }

  withMaxSize(size: number) {
    this._maxSize = size;
    return this;
  }

  static fromString(id: number, data: string) {
    return new Chunk(id, data);
  }

  /**
   * This method exists to convert translated subtitles into a chunk.
   * We can't use "createChunks" function because it might create multiple chunks since the translation can be longer than the original text.
   **/
  static fromSubtitles(id: number, subtitles: SubtitleT[]) {
    const subToString = subtitles.reduce((acc, sub) => {
      acc += sub.toString();
      return acc;
    }, "");

    return new Chunk(id, subToString);
  }

  static create(id: number = 0) {
    return new Chunk(id);
  }
}
