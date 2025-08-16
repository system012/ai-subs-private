import { type SubtitleT } from "../entities/subtitle";
import { createLogger } from "./logger";

type Logger = ReturnType<typeof createLogger>;

interface RemoveDuplicateLineNumbersParams<T extends SubtitleT> {
  subtitles: T[];
  logger: Logger;
}

/**
 * Removes duplicate line numbers from subtitles array.
 * When duplicates are found, keeps the first occurrence and removes subsequent ones.
 * 
 * @param params Object containing subtitles array and logger instance
 * @returns Array with duplicate line numbers removed
 */
export function removeDuplicateLineNumbers<T extends SubtitleT>(params: RemoveDuplicateLineNumbersParams<T>): T[] {
  const { subtitles, logger } = params;
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return subtitles;
  }

  const seenLineNumbers = new Set<number>();
  const validSubtitles: T[] = [];

  for (const subtitle of subtitles) {
    const { lineNumber } = subtitle;

    if (seenLineNumbers.has(lineNumber)) {
      logger.warn(`Removing duplicate line number: ${lineNumber}`);
      continue;
    }

    seenLineNumbers.add(lineNumber);
    validSubtitles.push(subtitle);
  }

  return validSubtitles;
}
