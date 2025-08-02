import { describe, it, expect } from "bun:test";
import { createSubtitles } from "../utils/subtitles";
import { Subtitle } from "../entities/subtitle";
import { LINE_DELIMITER, SUBTITLE_DELIMITER } from "../utils/constants";

describe("createSubtitles Function", () => {
    it("should correctly parse a single valid subtitle entry", () => {
        const srtInput = `1${LINE_DELIMITER}00:00:01,000 --> 00:00:02,000${LINE_DELIMITER}Hello world`;
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("success");
        if (result.type === "success") {
            expect(result.value).toHaveLength(1);
            expect(result.value[0]).toEqual(
                new Subtitle(1, "00:00:01,000 --> 00:00:02,000", ["Hello world"]),
            );
        }
    });

    it("should correctly parse multiple valid subtitle entries", () => {
        const srtInput = `1${LINE_DELIMITER}00:00:01,000 --> 00:00:02,000${LINE_DELIMITER}Hello world${SUBTITLE_DELIMITER}2${LINE_DELIMITER}00:00:03,000 --> 00:00:04,000${LINE_DELIMITER}Second line`;
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("success");
        expect(result.value).toHaveLength(2);
        expect(result.value?.[0]).toEqual(
            new Subtitle(1, "00:00:01,000 --> 00:00:02,000", ["Hello world"]),
        );
        expect(result.value?.[1]).toEqual(
            new Subtitle(2, "00:00:03,000 --> 00:00:04,000", ["Second line"]),
        );
    });

    it("should correctly parse subtitle entries with multi-line text", () => {
        const srtInput = `1${LINE_DELIMITER}00:00:01,000 --> 00:00:02,000${LINE_DELIMITER}Hello world${LINE_DELIMITER}This is line two.`;
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("success");
        if (result.type === "success") {
            expect(result.value).toHaveLength(1);
            expect(result.value[0]).toEqual(
                new Subtitle(1, "00:00:01,000 --> 00:00:02,000", ["Hello world", "This is line two."]),
            );
        }
    });

    it("should return an error for empty input string", () => {
        const srtInput = "";
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("error");
    });

    it("should return an error for input with only whitespace", () => {
        const srtInput = `   ${SUBTITLE_DELIMITER}   `;
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("error");
    });

    it("should return an error for invalid line number", () => {
        const srtInput = `A${LINE_DELIMITER}00:00:01,000 --> 00:00:02,000${LINE_DELIMITER}Hello world`;
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("error");
    });

    it("should return an error for invalid timecode format", () => {
        const srtInput = `1${LINE_DELIMITER}00:00:01 --> 00:00:02${LINE_DELIMITER}Hello world`; // Missing milliseconds
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("error");
    });

    it("should return an error for missing timecode", () => {
        const srtInput = `1${LINE_DELIMITER}Hello world`;
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("error");
    });

    it("should return an error for missing text", () => {
        const srtInput = `1${LINE_DELIMITER}00:00:01,000 --> 00:00:02,000`;
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("error");
    });

    it("should handle subtitle text ending with a blank line correctly", () => {
        const srtInput = `1${LINE_DELIMITER}00:00:01,000 --> 00:00:02,000${LINE_DELIMITER}Hello world${LINE_DELIMITER}`; // Note the trailing newline
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("success");
        expect(result.value).toHaveLength(1);
        expect(result.value?.[0]).toEqual(
            new Subtitle(1, "00:00:01,000 --> 00:00:02,000", ["Hello world"])
        );
    });

    it("should handle subtitle text ending with multiple blank lines correctly", () => {
        const srtInput = `1${LINE_DELIMITER}00:00:01,000 --> 00:00:02,000${LINE_DELIMITER}Hello world${LINE_DELIMITER}${LINE_DELIMITER}`; // Note multiple trailing newlines
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("success");
        expect(result.value).toHaveLength(1);
        expect(result.value?.[0]).toEqual(
            new Subtitle(1, "00:00:01,000 --> 00:00:02,000", ["Hello world"])
        );
    });

    it("should handle input with leading/trailing whitespace around entries", () => {
        const srtInput = `  ${SUBTITLE_DELIMITER} 1${LINE_DELIMITER}00:00:01,000 --> 00:00:02,000${LINE_DELIMITER}Hello world ${SUBTITLE_DELIMITER}  `;
        console.log("Input SRT:", srtInput);
        const result = createSubtitles(srtInput);
        expect(result.type).toBe("success");
        expect(result.value).toHaveLength(1);
        expect(result.value?.[0]).toEqual(
            new Subtitle(1, "00:00:01,000 --> 00:00:02,000", ["Hello world"]),
        );
    });

  it("should trim leading spaces from subtitle text lines", () => {
    const subtitleText = `1
00:00:01,000 --> 00:00:02,000
      (crickets chirping)

2
00:00:08,440 --> 00:00:11,441
   (people shouting over tv)

3
00:00:13,000 --> 00:00:19,074
                 Multiple lines with
                    leading spaces`;

    const result = createSubtitles(subtitleText);
    expect(result.type).toBe("success");
    
    if (result.type === "success") {
      const subtitles = result.value;
      
      expect(subtitles[0].text).toEqual(["(crickets chirping)"]);
      expect(subtitles[1].text).toEqual(["(people shouting over tv)"]);
      // check third subtitle with multiple lines
      expect(subtitles[2].text).toEqual(["Multiple lines with", "leading spaces"]);
    }
  });

});
