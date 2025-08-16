import { describe, it, expect, beforeEach } from "bun:test";
import { removeDuplicateLineNumbers } from "../utils/preprocessors";
import { Subtitle } from "../entities/subtitle";
import { createLogger } from "../utils/logger";

describe("removeDuplicateLineNumbers", () => {
  const logger = createLogger();
  
  it("should remove subsequent occurrences of duplicated line numbers", () => {
    const subtitles = [
      new Subtitle(1, "00:00:01,000 --> 00:00:02,000", ["text1"]),
      new Subtitle(2, "00:00:02,000 --> 00:00:03,000", ["text2"]),
      new Subtitle(1, "00:00:03,000 --> 00:00:04,000", ["text3"]),
    ];
    const result = removeDuplicateLineNumbers({ subtitles, logger });
    expect(result).toHaveLength(2);
    expect(result[0].lineNumber).toBe(1);
    expect(result[0].text).toEqual(["text1"]);
    expect(result[1].lineNumber).toBe(2);
    expect(result[1].text).toEqual(["text2"]);
  });

  it("should handle empty array", () => {
    const result = removeDuplicateLineNumbers({ subtitles: [], logger });
    expect(result).toEqual([]);
  });

  it("should handle array with no duplicates", () => {
    const subtitles = [
      new Subtitle(1, "00:00:01,000 --> 00:00:02,000", ["text1"]),
      new Subtitle(2, "00:00:02,000 --> 00:00:03,000", ["text2"]),
      new Subtitle(3, "00:00:03,000 --> 00:00:04,000", ["text3"]),
    ];
    const result = removeDuplicateLineNumbers({ subtitles, logger });
    expect(result).toHaveLength(3);
    expect(result).toEqual(subtitles);
  });

  it("should handle multiple duplicates", () => {
    const subtitles = [
      new Subtitle(1, "00:00:01,000 --> 00:00:02,000", ["text1"]),
      new Subtitle(2, "00:00:02,000 --> 00:00:03,000", ["text2"]),
      new Subtitle(1, "00:00:03,000 --> 00:00:04,000", ["text3"]),
      new Subtitle(3, "00:00:04,000 --> 00:00:05,000", ["text4"]),
      new Subtitle(1, "00:00:05,000 --> 00:00:06,000", ["text5"]),
    ];
    const result = removeDuplicateLineNumbers({ subtitles, logger });
    expect(result).toHaveLength(3);
    expect(result[0].lineNumber).toBe(1);
    expect(result[0].text).toEqual(["text1"]);
    expect(result[1].lineNumber).toBe(2);
    expect(result[2].lineNumber).toBe(3);
  });
});
