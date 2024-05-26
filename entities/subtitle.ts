export type Timecode = `${number}:${number}:${number},${number} --> ${number}:${number}:${number},${number}`;
export type SubtitleT = {
    lineNumber: number;
    timecode: Timecode;
    text: string[];
}

export class Subtitle implements SubtitleT {
    constructor(public lineNumber: number, public timecode: Timecode, public text: string[]) {
        this.lineNumber = lineNumber;
        this.timecode = timecode;
        this.text = text;
     }

    toString(): string {
        return `${this.lineNumber}\n${this.timecode}\n${this.text.join('\n')}`;
    }
}