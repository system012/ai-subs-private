import { LINE_DELIMITER } from "../utils/constants";

export type Timecode = `${number}:${number}:${number},${number} --> ${number}:${number}:${number},${number}`;
export type SubtitleT = {
    lineNumber: number;
    timecode: Timecode;
    text: string[];
    toString(): string;
}

export class Subtitle implements SubtitleT {
    constructor(public lineNumber: number, public timecode: Timecode, public text: string[]) {
        this.lineNumber = lineNumber;
        this.timecode = timecode;
        this.text = text;
     }

    get size(): number {
        return this.text.join(LINE_DELIMITER).length;
    }

    toString(): string {
        return `${this.lineNumber}\n${this.timecode}\n${this.text.join(LINE_DELIMITER)}`;
    }
}