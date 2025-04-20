import { describe, it, expect, beforeEach } from "bun:test";
import { Chunk } from "../entities/chunk";
import { createChunks } from "../utils/chunks";
import { DEFAULT_MAX_CHUNK_SIZE, LINE_DELIMITER } from "../utils/constants";
import { createMockSubtitle } from "./common/helpers";

describe("Chunk Entity", () => {
    it("should create an empty chunk with ID 0 by default", () => {
        const chunk = Chunk.create();
        expect(chunk.id).toBe(0);
        expect(chunk.data).toBe("");
        expect(chunk.size).toBe(0);
    });

    it("should create a chunk with a specific ID", () => {
        const chunk = Chunk.create(5);
        expect(chunk.id).toBe(5);
    });

    it("should create a chunk from a string", () => {
        const data = "Test data";
        const chunk = Chunk.fromString(1, data);
        expect(chunk.id).toBe(1);
        expect(chunk.data).toBe(data);
        expect(chunk.size).toBe(data.length);
    });

    it("should create a chunk from subtitles", () => {
        const sub1 = createMockSubtitle(1, ["Line one."]);
        const sub2 = createMockSubtitle(2, ["Line two!"]);
        const expectedData = `${sub1.toString()}${sub2.toString()}`;
        const chunk = Chunk.fromSubtitles(3, [sub1, sub2]);
        expect(chunk.id).toBe(3);
        expect(chunk.data).toBe(expectedData);
        expect(chunk.size).toBe(expectedData.length);
    });

    it("should append data with a line delimiter", () => {
        const chunk = Chunk.create(0);
        const data1 = "First line.";
        const data2 = "Second line.";
        chunk.append(data1);
        expect(chunk.data).toBe(data1 + LINE_DELIMITER);
        expect(chunk.size).toBe(data1.length + LINE_DELIMITER.length);
        chunk.append(data2);
        expect(chunk.data).toBe(data1 + LINE_DELIMITER + data2 + LINE_DELIMITER);
        expect(chunk.size).toBe(
            data1.length + LINE_DELIMITER.length + data2.length + LINE_DELIMITER.length,
        );
    });

    it("should set custom max size using withMaxSize", () => {
        const chunk = Chunk.create(0);
        chunk.withMaxSize(500);
        expect(chunk.maxSize).toBe(500);
    });

    describe("isChunkFull", () => {
        const maxSize = 50;
        let chunk: Chunk;

        beforeEach(() => {
            chunk = Chunk.create(0).withMaxSize(maxSize);
        });

        it("should return false if size is less than maxSize", () => {
            chunk.append("Small data");
            expect(chunk.size).toBeLessThan(maxSize);
            expect(chunk.isChunkFull()).toBe(false);
        });

        it("should return false if size is greater than maxSize but does not end with dialogue punctuation", () => {
            chunk.append("This data is longer than the max size but has no end punctuation");
            expect(chunk.size).toBeGreaterThan(maxSize);
            expect(chunk.isChunkFull()).toBe(false);
        });

        it("should return true if size is greater than maxSize and ends with '.'", () => {
            chunk.append("This data is longer than the max size and ends with a period.");
            expect(chunk.size).toBeGreaterThan(maxSize);
            expect(chunk.isChunkFull()).toBe(true);
        });

        it("should return true if size is greater than maxSize and ends with '!'", () => {
            chunk.append("This data is longer than the max size and ends with an exclamation!");
            expect(chunk.size).toBeGreaterThan(maxSize);
            expect(chunk.isChunkFull()).toBe(true);
        });

        it("should return true if size is greater than maxSize and ends with ')'", () => {
            chunk.append("This data is longer than the max size and ends with a parenthesis)");
            expect(chunk.size).toBeGreaterThan(maxSize);
            expect(chunk.isChunkFull()).toBe(true);
        });

         it("should return true if size is greater than maxSize and ends with punctuation after trimming", () => {
            chunk.append("This data is longer than the max size and ends with a period.   ");
            expect(chunk.size).toBeGreaterThan(maxSize);
            expect(chunk.isChunkFull()).toBe(true);
        });
    });
});

describe("createChunks Function", () => {
    const sub1 = createMockSubtitle(1, ["This is the first subtitle."]); // Ends dialogue
    const sub2 = createMockSubtitle(2, ["This is the second subtitle, continuing"]); // Doesn't end
    const sub3 = createMockSubtitle(3, ["and finishing here!"]); // Ends dialogue
    const sub4 = createMockSubtitle(4, ["A short one."]); // Ends dialogue
    const sub5 = createMockSubtitle(5, ["Another short one."]); // Ends dialogue

    const sub1String = sub1.toString() + LINE_DELIMITER;
    const sub2String = sub2.toString() + LINE_DELIMITER;
    const sub3String = sub3.toString() + LINE_DELIMITER;
    const sub4String = sub4.toString() + LINE_DELIMITER;
    const sub5String = sub5.toString() + LINE_DELIMITER;

    it("should return an empty array if input data is empty", () => {
        const chunks = createChunks([]);
        expect(chunks).toEqual([]);
    });

    it("should create a single chunk if total size is within default limit", () => {
        const subtitles = [sub1, sub2];
        const chunks = createChunks(subtitles);
        expect(chunks.length).toBe(1);
        expect(chunks[0].id).toBe(0);
        expect(chunks[0].data).toBe(sub1String + sub2String);
        expect(chunks[0].size).toBeLessThan(DEFAULT_MAX_CHUNK_SIZE);
    });

    it("should create multiple chunks based on default max size and dialogue end", () => {
        // Make subs large enough to force chunking
        const largeText = ".".repeat(DEFAULT_MAX_CHUNK_SIZE / 2);
        const subLarge1 = createMockSubtitle(1, [largeText + "."]); // Ends
        const subLarge2 = createMockSubtitle(2, [largeText + "!"]); // Ends
        const subLarge3 = createMockSubtitle(3, ["Small end."]); // Ends

        const subLarge1String = subLarge1.toString() + LINE_DELIMITER;
        const subLarge2String = subLarge2.toString() + LINE_DELIMITER;
        const subLarge3String = subLarge3.toString() + LINE_DELIMITER;

        const subtitles = [subLarge1, subLarge2, subLarge3];
        const chunks = createChunks(subtitles);

        expect(chunks.length).toBe(2);
        // Chunk 0 contains subLarge1 + subLarge2 because chunk isn't "full" until after subLarge2 is added
        expect(chunks[0].id).toBe(0);
        expect(chunks[0].data).toBe(subLarge1String + subLarge2String);
        expect(chunks[0].size).toBeGreaterThan(DEFAULT_MAX_CHUNK_SIZE); // It exceeds the limit after adding subLarge2
        // Chunk 1 contains subLarge3 because chunk 0 was full before processing subLarge3
        expect(chunks[1].id).toBe(1);
        expect(chunks[1].data).toBe(subLarge3String);
        // --- End Adjusted Expectations ---
    });

     it("should create multiple chunks based on custom max size", () => {
        const maxSize = 150;
        const subtitles = [sub1, sub2, sub3, sub4]; // sub1 + sub2 + sub3 > 150, sub4 < 150
        const chunks = createChunks(subtitles, { maxSize });

        // --- Adjusted Expectations ---
        expect(chunks.length).toBe(2);
        // Chunk 0: sub1 + sub2 + sub3. Chunk isn't full before sub2 or sub3 are added.
        // It becomes full *after* sub3 is added (size > 150 and ends with !)
        expect(chunks[0].id).toBe(0);
        expect(chunks[0].data).toBe(sub1String + sub2String + sub3String);
        expect(chunks[0].size).toBeGreaterThan(maxSize);

        // Chunk 1: sub4 (starts new chunk because chunk 0 was full)
        expect(chunks[1].id).toBe(1);
        expect(chunks[1].data).toBe(sub4String);
        expect(chunks[1].size).toBeLessThan(maxSize);
    });
});