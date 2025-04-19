import { describe, it, expect, jest as mocker } from "bun:test";
import {
  validate,
  isLineNumberSequential,
  isWithinLengthRange,
} from "../validation/validation";
import { type SubtitleT } from "../entities/subtitle";
import { type SubtitleResult } from "../utils/subtitles";
import { createMockSubtitle } from "./common/helpers";

// Mock logger
const mockLogger = {
    debug: mocker.fn(),
    log: mocker.fn(),
    warn: mocker.fn(),
    error: mocker.fn(),
}

// Helper to create SubtitleResult
const createSuccessResult = (subs: SubtitleT[]): SubtitleResult => ({
  type: "success",
  value: subs,
});
const createErrorResult = (message: string): SubtitleResult => ({
  type: "error",
  message: new Error(message),
});

describe("validation", () => {
  describe("isLineNumberSequential", () => {
    it("should return success for sequential line numbers", () => {
      const subtitle = createMockSubtitle(2, ["Test line 2"]);
      const prevSubtitle = createMockSubtitle(1, ["Test line 1"]);
      const result = isLineNumberSequential({
        subtitle,
        prevSubtitle,
        logger: mockLogger,
        index: 1,
        originalSub: subtitle, // Not used in this function but required by type
      });
      expect(result.type).toBe("success");
      expect(result.value).toBe("");
    });

    it("should return error for non-sequential line numbers", () => {
      const subtitle = createMockSubtitle(3, ["Test line 3"]);
      const prevSubtitle = createMockSubtitle(1, ["Test line 1"]);
      const result = isLineNumberSequential({
        subtitle,
        prevSubtitle,
        index: 1,
        originalSub: subtitle,
      });
      expect(result.type).toBe("error");
    });
  });

  describe("isWithinLengthRange", () => {
    const originalSub = createMockSubtitle(1, [
      "This is the original text with enough words.",
    ]);

    it("should return success if text length is within range", () => {
      const subtitle = createMockSubtitle(1, [
        "This is translated text, similar length.",
      ]);
      const result = isWithinLengthRange({
        subtitle,
        originalSub,
        logger: mockLogger,
        index: 0,
        prevSubtitle: createMockSubtitle(0, []), // Not used but required
      });
      expect(result.type).toBe("success");
      expect(result.value).toBe("");
    });

    it("should return error if text length is too long", () => {
      const subtitle = createMockSubtitle(1, [
        "This translated text is significantly much much longer than the original source text provided, exceeding the allowed multiplication factor by a large margin.",
      ]);
      const result = isWithinLengthRange({
        subtitle,
        originalSub,
        logger: mockLogger,
        index: 0,
        prevSubtitle: createMockSubtitle(0, []),
      });
      expect(result.type).toBe("error");
    });

    it("should return error if text length is too short", () => {
      const subtitle = createMockSubtitle(1, ["Too short."]);
      const result = isWithinLengthRange({
        subtitle,
        originalSub,
        index: 0,
        prevSubtitle: createMockSubtitle(0, []),
      });
      expect(result.type).toBe("error");
    });

    it("should return success for exception characters like ♪", () => {
      const originalSubException = createMockSubtitle(1, ["♪"]);
      const subtitle = createMockSubtitle(1, ["♪"]);
      const result = isWithinLengthRange({
        subtitle,
        originalSub: originalSubException,
        index: 0,
        prevSubtitle: createMockSubtitle(0, []),
      });
      expect(result.type).toBe("success");
      expect(result.value).toBe("");
    });

    it("should return success if original text has less than 4 words", () => {
      const originalSubShort = createMockSubtitle(1, ["Short original text."]);
      const subtitle = createMockSubtitle(1, ["Any translation"]);
      const result = isWithinLengthRange({
        subtitle,
        originalSub: originalSubShort,
        index: 0,
        prevSubtitle: createMockSubtitle(0, []),
      });
      expect(result.type).toBe("success");
      expect(result.value).toBe("");
    });
  });

  describe("validate", () => {
    const originalSubs = [
      createMockSubtitle(1, ["Line one original."]),
      createMockSubtitle(2, ["Line two original, slightly longer."]),
      createMockSubtitle(3, ["Line three original."]),
    ];
    const translatedSubs = [
      createMockSubtitle(1, ["Line one translated."]),
      createMockSubtitle(2, ["Line two translated, similar length."]),
      createMockSubtitle(3, ["Line three translated."]),
    ];

    it("should return success for valid subtitles", () => {
      const result = validate(
        createSuccessResult(translatedSubs),
        createSuccessResult(originalSubs),
        mockLogger
      );
      expect(result.type).toBe("success");
      expect(result.value).toBe("");
    });

    it("should return error if translatedSubs has an error", () => {
      const result = validate(
        createErrorResult("Invalid SRT structure"),
        createSuccessResult(originalSubs),
        mockLogger
      );
      expect(result.type).toBe("error");
    });

    it("should return error if originalSubs has an error", () => {
      const result = validate(
        createSuccessResult(translatedSubs),
        createErrorResult("Invalid original SRT"),
        mockLogger
      );
      expect(result.type).toBe("error");
      expect(result.value).toBe("");
    });

    it("should return error if line counts do not match", () => {
      const shortTranslatedSubs = [
        createMockSubtitle(1, ["Line one translated."]),
      ];
      const result = validate(
        createSuccessResult(shortTranslatedSubs),
        createSuccessResult(originalSubs),
        mockLogger,
      );
      expect(result.type).toBe("error");
    });
  });
});
