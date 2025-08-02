
import { Subtitle } from "../entities/subtitle";
import { LINE_DELIMITER } from "./constants";

export function removeDuplicateLineNumbers(subtitles: Subtitle[]): Subtitle[] {
  const seen = new Set<number>();
  const toRemove = new Set<number>();

  for (let i = 0; i < subtitles.length; i++) {
    const { lineNumber } = subtitles[i];
    if (seen.has(lineNumber)) {
      toRemove.add(i);
    } else {
      seen.add(lineNumber);
    }
  }

  return subtitles.filter((_, i) => !toRemove.has(i));
}
