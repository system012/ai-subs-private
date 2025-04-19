import { type SubtitleT, Subtitle } from "../../entities/subtitle";

export const createMockSubtitle = (
    lineNumber: number,
    text: string[],
    timecode = "00:00:01,000 --> 00:00:02,000",
): SubtitleT => new Subtitle(lineNumber, timecode as any, text);