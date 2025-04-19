import { LINE_DELIMITER, LINE_REGEX } from "./constants";
import { type SubtitleT, type Timecode, Subtitle } from "../entities/subtitle";
import { createLogger } from "./logger";

export type SubtitleCallbackArguments<T> = {
  subtitle: SubtitleT;
  index: number;
  prevSubtitle: SubtitleT;
  originalSub: SubtitleT;
  result?: SubtitleCallbackReturn<T>;
  logger?: ReturnType<typeof createLogger>;
};
export type SubtitleCallbackReturn<T> = {
  type: "error" | "success";
  value: T;
  message?: Error;
};
export type SubtitleCallbackFunction<T> = (
  // eslint-disable-next-line
  args: SubtitleCallbackArguments<T>,
) => SubtitleCallbackReturn<T>;

type SubtitleError = {
  message: Error;
  value?: undefined;
  type: "error";
};
type SubtitleReturnValue = {
  value: SubtitleT[];
  type: "success";
};
export type SubtitleResult = SubtitleError | SubtitleReturnValue;

export function createSubtitles(subtitleText: string): SubtitleResult {
  const rawSubs = subtitleText.match(LINE_REGEX);
  if (!rawSubs || (rawSubs?.length ?? 0) === 0) {
    return {
      type: "error",
      message: new Error(
        "No lines found in subtitle text. The structure might not be valid.",
      ),
    };
  }

  const subtitles: SubtitleT[] = [];
  for (const line of rawSubs) {
    const result = createSubtitle(line);
    if (isSubtitleError(result)) {
      return {
        type: "error",
        message: result.message,
      };
    }
    subtitles.push(result.value);
  }

  return {
    type: "success",
    value: subtitles,
  };
}

export function iterateSubtitles<T>(
  subtitles: SubtitleT[],
  originalSubs: SubtitleT[],
  callbacks: SubtitleCallbackFunction<T>[],
  logger: ReturnType<typeof createLogger> = createLogger(true),
): SubtitleCallbackReturn<T> {
  let prevSubtitle: SubtitleT = {
    lineNumber: 0,
    timecode: "00:00:00,000 --> 00:00:00,000",
    text: [],
  };
  let result: SubtitleCallbackReturn<T> = {
    type: "success",
    value: [] as T,
  };

  for (const [index, subtitle] of subtitles.entries()) {
    for (const callback of callbacks) {
      const originalSub = originalSubs[index];
      result = callback({
        subtitle,
        index,
        prevSubtitle,
        originalSub,
        result,
        logger,
      });
      if (result.type === "error") return result;
    }
    prevSubtitle = subtitle;
  }

  return result;
}
export function createSubtitle(
  block: string,
): { value: SubtitleT; type: "success" } | SubtitleError {
  const trimmedBlock = block.trim();
  const [lineNumber, timecode, ...text] = trimmedBlock.split(LINE_DELIMITER);
  const lineToNumber = parseInt(lineNumber);
  if (isNaN(lineToNumber)) {
    return {
      type: "error",
      message: new Error("[createSubtitle] First element is not a number."),
    };
  }

  const timecodeRegex = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/;
  const isValidTimecode = timecodeRegex.test(timecode);

  if (!isValidTimecode)
    return {
      type: "error",
      message: new Error("[createSubtitle] Second element is not a timecode."),
    };
  if (text.length === 0)
    return {
      type: "error",
      message: new Error("[createSubtitle] Text is missing."),
    };

  return {
    type: "success",
    value: new Subtitle(
      lineToNumber,
      timecode as Timecode,
      text.filter((line) => line.trim() !== ""),
    ),
  };
}

function isSubtitleError(
  sub: ReturnType<typeof createSubtitle>,
): sub is SubtitleError {
  return sub.type === "error";
}

export function isDialogueOver(word: string): boolean {
  return word?.at(-1) === "." || word?.at(-1) === "!" || word?.at(-1) === ")";
}
