import { removeDuplicateLineNumbers } from "../utils/preprocessors";
import { Subtitle } from "../entities/subtitle";

describe("removeDuplicateLineNumbers", () => {
  it("should remove the last occurrence of a duplicated line number", () => {
    const subtitles = [
      new Subtitle(1, "00:00:01,000 --> 00:00:02,000", ["text1"]),
      new Subtitle(2, "00:00:02,000 --> 00:00:03,000", ["text2"]),
      new Subtitle(1, "00:00:03,000 --> 00:00:04,000", ["text3"]),
    ];
    const result = removeDuplicateLineNumbers(subtitles);
    expect(result).toHaveLength(2);
    expect(result[0].lineNumber).toBe(1);
    expect(result[1].lineNumber).toBe(2);
  });
});
