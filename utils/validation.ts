import {
  type SubtitleCallbackArguments,
  iterateSubtitles,
  type SubtitleResult,
} from "./subtitles";
import { type SubtitleT } from "../entities/subtitle";

type ValidationResult = {
  type: "error" | "success";
  value: string;
};

type ValidationFunctionParams = SubtitleCallbackArguments<string> & {
  subtitle: SubtitleT;
  prevSubtitle?: SubtitleT;
  originalSub?: SubtitleT;
};

export function validate(
  translatedSubs: SubtitleResult,
  originalSubs: SubtitleResult,
): ValidationResult {
  if (translatedSubs.type === "error") {
    console.error(
      "There was a problem with subtitles. Sequence is not valid. Error: \n",
      translatedSubs.message,
      "\n",
      [translatedSubs.value],
    );
    return {
      type: "error",
      value: "Be EXTRA careful with respecting the SRT structure.",
    };
  }
  if (originalSubs.type === "error") {
    console.error(
      "No lines found in original subtitle. Sequence is not valid. Error: \n",
      originalSubs.message,
    );
    console.log("Content:", [originalSubs]);
    return { type: "error", value: "" };
  }

  const { value: subtitles } = translatedSubs;
  const { value: originalSubtitles } = originalSubs;

  if (originalSubtitles.length !== subtitles.length) {
    console.error(
      "Number of lines do not match original subtitle. Sequence is not valid.",
      { originalLength: originalSubtitles.length, newLength: subtitles.length },
    );
    /* usually, the LLM will merge two lines of dialogue into one.
            The goal is to, hopefully, find the problematic line by checking if it is much longer/shorter than the original one
            and give feedback on the specific line, to avoid repeating the error
        */
    // const potentiallyProblematicLine = iterateSubtitles(subtitles, originalSubtitles, [
    //     isWithinLengthRange
    // ]) as ValidationResult
    // if (!potentiallyProblematicLine.ok) {
    //     console.log('potentially problematic line', potentiallyProblematicLine)
    //     return potentiallyProblematicLine
    // }

    // get the first dialogue number and the last one
    const { lineNumber: firstDialogue } = originalSubtitles.at(0) ?? {
      lineNumber: 0,
    };
    const { lineNumber: lastDialogue } = originalSubtitles.at(-1) ?? {
      lineNumber: 0,
    };
    return {
      type: "error",
      value: `There are ${originalSubtitles.length} lines in the original subtitle: from ${firstDialogue} to ${lastDialogue}. Make sure to include ALL of them.`,
    };
  }

  return iterateSubtitles(subtitles, originalSubtitles, [
    isLineNumberSequential,
    isWithinLengthRange,
  ]);
}

export function isLineNumberSequential({
  subtitle,
  prevSubtitle,
}: ValidationFunctionParams): ValidationResult {
  const { lineNumber } = subtitle;
  const { lineNumber: prevLineNumber } = prevSubtitle;
  // if it is 0, then we are in the first iteration and we have no previous sub
  if (prevLineNumber === 0) return { type: "success", value: "" };

  const ok = lineNumber === prevLineNumber + 1;
  if (!ok) {
    console.error("Line number is not sequential. Sequence is not valid.", {
      currentNumber: lineNumber,
      prevNumber: prevLineNumber,
    });
    return {
      type: "error",
      value: "Make sure to be ACCURATE and NOT MISS ANY line number",
    };
  }
  return { type: "success", value: "" };
}

// function isValidTimecode({ subtitle }: ValidationFunctionParams): boolean {
//     const { timecode } = subtitle
//     const timecodeRegex = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/;
//     return timecodeRegex.test(timecode);
// }

export function isWithinLengthRange({
  subtitle,
  originalSub,
}: ValidationFunctionParams): ValidationResult {
  const { text: currentText } = subtitle;
  const currentTextWordsArray =
    currentText
      ?.reduce((acc: string[], sub) => {
        acc.push(...sub.split(" "));
        return acc;
      }, [])
      .filter((word) => word !== "") ?? [];
  const currentTextWordsLength = currentTextWordsArray?.length ?? 0;

  const { text: originalText } = originalSub;
  const originalTextString =
    originalText?.reduce((acc: string, sub) => {
      acc += sub;
      return acc;
    }, "") ?? "";
  const originalTextWordsArray = originalTextString.split(" ");
  const originalTextWordsLength = originalTextWordsArray?.length ?? 0;

  const exceptions = ["♪"];
  if (exceptions.includes(originalTextString)) {
    console.warn(
      "[WithinRange check] Skipping line with exception:",
      originalTextString,
    );
    return { type: "success", value: "" };
  }
  if (originalTextWordsLength < 4) {
    console.warn(
      "[WithinRange check] Skipping line with less than 4 words:",
      originalTextString,
    );
    return { type: "success", value: "" };
  }

  const isTooLong = currentTextWordsLength > originalTextWordsLength * 2.5;
  const isTooShort = currentTextWordsLength < originalTextWordsLength * 0.3;

  const isWithinRange = !(isTooLong || isTooShort);

  if (!isWithinRange) {
    console.error("Line length is not within range. Sequence is not valid.", {
      originalTextLength: originalTextWordsLength,
      textLength: currentTextWordsLength,
      originalSub: originalTextWordsArray,
      newSub: currentTextWordsArray,
      isTooLong,
      isTooShort,
    });
    return {
      type: "error",
      value: `Translate the dialogue number ${subtitle.lineNumber} FAITHFULLY to the original language, without adding or removing anything.`,
    };
  }

  return { type: "success", value: "" };
}
