import { LINE_DELIMITER, LINE_REGEX } from './constants';
import { type SubtitleT, type Timecode, Subtitle } from '../entities/subtitle';

export type SubtitleCallbackArguments<T> = {
    subtitle: SubtitleT
    index: number
    prevSubtitle: SubtitleT
    originalSub: SubtitleT
    result?: SubtitleCallbackReturn<T>
}
export type SubtitleCallbackReturn<T> = {
    ok: boolean
    value: T
    message?: Error
}
export type SubtitleCallbackFunction<T> = (args: SubtitleCallbackArguments<T>) => SubtitleCallbackReturn<T>

type SubtitleError = {
    error: true,
    message: Error
    value?: undefined
}
type SubtitleReturnValue = {
    error: false,
    value: SubtitleT[]
}
type SubtitleResult = SubtitleError | SubtitleReturnValue;

export function createSubtitles(subtitleText: string): SubtitleResult {
    const rawSubs = subtitleText.trim().match(LINE_REGEX);
    if (!rawSubs || (rawSubs?.length ?? 0) === 0) {
        return {
            error: true,
            message: new Error('No lines found in subtitle text. The structure might not be valid.')
        }
    }

    const subtitles: SubtitleT[] = [];
    for (const line of rawSubs) {
        const result = createSubtitle(line);
        if (isSubtitleError(result)) {
            return {
                error: true,
                message: result.message
            };
        }
        subtitles.push(result);
    }

    return {
        error: false,
        value: subtitles
    }
}

export function iterateSubtitles<T>(subtitles: SubtitleT[], originalSubs: SubtitleT[], callbacks: SubtitleCallbackFunction<T>[]): SubtitleCallbackReturn<T> {
    let prevSubtitle: SubtitleT = { lineNumber: 0, timecode: '00:00:00,000 --> 00:00:00,000', text: [] };
    let result: ReturnType<SubtitleCallbackFunction<T>> = { ok: true, value: "" as T };

    for (const [index, subtitle] of subtitles.entries()) {
        for (const callback of callbacks) {
            const originalSub = originalSubs[index];
            result = callback({ subtitle, index, prevSubtitle, originalSub, result });
            if (!result.ok) return result
        }
        prevSubtitle = subtitle
    }

    return result
}
export function createSubtitle(line: string): SubtitleT | SubtitleError {
    const [lineNumber, timecode, ...text] = line.split(LINE_DELIMITER);
    const lineToNumber = parseInt(lineNumber)
    if (isNaN(lineToNumber)) {
        return {
            error: true,
            message: new Error('[createSubtitle] First element is not a number.')
        }
    }

    const timecodeRegex = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/;
    const isValidTimecode = timecodeRegex.test(timecode);

    if (!isValidTimecode) return {
        error: true,
        message: new Error('[createSubtitle] Second element is not a timecode.')
    }
    if (text.length === 0) return {
        error: true,
        message: new Error('[createSubtitle] Text is missing.')
    }

    return new Subtitle(lineToNumber, timecode as Timecode, text);
}

function isSubtitleError(sub: SubtitleT | SubtitleError): sub is SubtitleError {
    return 'error' in sub && sub.error;
}