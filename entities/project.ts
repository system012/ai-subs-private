import {
  fileExists,
  writeFile,
  readFile,
  getDirectories,
  deleteDir,
} from "../utils/io";
import { createSubtitles } from "../utils/subtitles";
import { createChunks } from "../utils/chunks";
import { DEFAULT_MAX_CHUNK_SIZE } from "../utils/constants";
import { Chunk } from "./chunk";
import { State } from "./state";
import { StateItem } from "./state-item";
import type { errorProcessor } from "../utils/error-processor";
import { createLogger } from "../utils/logger";
import type { LLMProvider } from "../providers/types";
import type { SubtitleT } from "./subtitle";
import path from "path";

export type StringPreprocessor = (subs: string) => string;
export type SubtitlePreprocessor<T extends SubtitleT> = (params: {
  subtitles: T[];
  logger: ReturnType<typeof createLogger>;
}) => T[];

export class Project {
  private inputFile: string;
  private state: State<Chunk> = new State([]);
  private outputFile: string;
  private stateFile: string;
  private stringPreprocessors: StringPreprocessor[] = [];
  private subtitlePreprocessors: SubtitlePreprocessor<SubtitleT>[] = [];
  // private queueClient: Queue<T> | undefined = undefined;
  private logger: ReturnType<typeof createLogger> | undefined = undefined;
  public projectDir: string;
  public chunks: Chunk[] = [];
  private maxProjectFolders: number;
  private baseProjectsDir: string;

  constructor(
    inputFile: string,
    outputFile: string,
    maxProjectFolders: number,
  ) {
    this.inputFile = inputFile;
    this.outputFile = outputFile;
    this.maxProjectFolders = maxProjectFolders;
    this.baseProjectsDir = path.join(process.cwd(), ".projects");
    this.projectDir = path.join(
      this.baseProjectsDir,
      `project_${path.basename(outputFile).replace(/[^a-z0-9]/gi, "_")}`,
    );
    this.stateFile = path.join(this.projectDir, ".state.json");
    this.logger = createLogger(true);
  }

  get isDone() {
    return this.state.value.every((item) => item.status === "done");
  }

  save(content: StateItem<Chunk>) {
    this.state.value.splice(content.value.id, 1, content);
    writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  complete() {
    const subtitles = this.state.value.reduce((acc, stateItem) => {
      acc += stateItem.value.data;
      return acc;
    }, "");

    writeFile(this.outputFile, subtitles);
  }

  /**
   * Add string-based preprocessors that work on raw subtitle text
   */
  addStringPreprocessors(preprocessors: StringPreprocessor[]) {
    this.stringPreprocessors.push(...preprocessors);
    return this;
  }

  /**
   * Add subtitle-based preprocessors that work on parsed subtitle objects
   */
  addSubtitlePreprocessors(preprocessors: SubtitlePreprocessor<SubtitleT>[]) {
    this.subtitlePreprocessors.push(...preprocessors);
    return this;
  }

  async processErrors(
    processor: typeof errorProcessor,
    provider: LLMProvider,
    signal?: AbortSignal,
  ) {
    this.logger?.log("Processing errors...");

    const errorItems = this.state.errors;
    this.logger?.log(`Errors found: ${errorItems.length}`);
    for (const [index, item] of errorItems.entries()) {
      if (signal?.aborted) {
        this.logger?.log("Stopping error processing due to shutdown signal.");
        break;
      }
      this.logger?.log(
        `Processing error ${index + 1} out of ${errorItems.length}`,
      );
      const { value, type } = await processor(item, provider);
      if (type !== "success") {
        throw new Error(
          "[Project] [processErrors()] Error processing error chunk.",
        );
      }

      this.save(
        new StateItem(Chunk.fromSubtitles(item.value.id, value), "done"),
      );
    }
  }

  async init() {
    const projectExists = await fileExists(this.stateFile);

    if (!projectExists) {
      await this.create();
      await this.cleanup();
      this.logger?.log("Project created.");
      return;
    }

    await this.resume();
    this.logger?.log("Project resumed.");
  }

  private async cleanup() {
    this.logger?.log("Checking project folder limits...");
    try {
      const dirs = await getDirectories(this.baseProjectsDir);
      if (dirs.length <= this.maxProjectFolders) return;

      this.logger?.log(
        `Found ${dirs.length} project folders (limit: ${this.maxProjectFolders}). Cleaning up...`,
      );
      // Sort by modification time (oldest first)
      const projectDirs = dirs
        .toSorted((a, b) => a.mtimeMs - b.mtimeMs)
        .filter(
          // Exclude the current project directory
          (dir) => dir.path !== this.projectDir,
        );

      const foldersToDelete = dirs.length - this.maxProjectFolders;
      this.logger?.log(`Need to delete ${foldersToDelete} oldest folder(s).`);

      for (let i = 0; i < foldersToDelete; i++) {
        const dirToDelete = projectDirs[i].path;
        this.logger?.log(`Deleting old project folder: ${dirToDelete}`);
        await deleteDir(dirToDelete);
      }
    } catch (error) {
      this.logger?.error("Error during project folder cleanup:", error);
    }

    this.logger?.log("Projects folder cleanup complete.");
  }

  private async create() {
    try {
      const rawSubtitleText = await readFile(this.inputFile);
      const preprocessedText = this.applyStringPreprocessors(rawSubtitleText);
      const parseResult = createSubtitles(preprocessedText);

      if (parseResult.type === "error") {
        throw new Error(
          `Failed to parse subtitles: ${parseResult.message.message}`,
        );
      }

      const processedSubtitles = this.applySubtitlePreprocessors(
        parseResult.value,
      );

      const chunks = createChunks(processedSubtitles, {
        maxSize: DEFAULT_MAX_CHUNK_SIZE,
      });

      this.state.value = chunks.map((chunk) => new StateItem(chunk));
      this.chunks = chunks;

      await writeFile(this.stateFile, JSON.stringify(this.state, null, 2));

      this.logger?.log(`Project created with ${chunks.length} chunks`);
    } catch (error) {
      this.logger?.error("Failed to create project:", error);
      throw error;
    }
  }

  /**
   * Apply all registered string preprocessors to the raw subtitle text
   */
  private applyStringPreprocessors(text: string): string {
    return this.stringPreprocessors.reduce(
      (processedText, preprocessor) => preprocessor(processedText),
      text,
    );
  }

  /**
   * Apply all registered subtitle preprocessors
   */
  private applySubtitlePreprocessors(subtitles: SubtitleT[]): SubtitleT[] {
    let processedSubtitles = subtitles;

    for (const preprocessor of this.subtitlePreprocessors) {
      processedSubtitles = preprocessor({
        subtitles: processedSubtitles,
        logger: this.logger!,
      });
    }

    return processedSubtitles;
  }

  private async resume() {
    const state = await readFile(this.stateFile);
    if (!state) {
      throw new Error(
        "[Project] [Resume()] Project files are corrupted. Please delete the project and start again.",
      );
    }

    this.state = State.fromString(state);
    this.chunks = this.state.pending.map((item) =>
      Chunk.fromString(item.value.id, item.value.data),
    );
  }

  // addQueue(queue: Queue<T>) {
  //   this.queueClient = queue;
  //   return this;
  // }
  //
  // enqueueError(item: QueueItemT<T>) {
  //   this.queueClient?.enqueue(item);
  // }
  // async processErrorQueue(process: typeof queueProcessor) {
  //   // const errorChunks = this.state.filter((sub) => sub.status === "error"))
  //   while (!this.queueClient?.isEmpty()) {
  //     const item = this.queueClient?.dequeue({ persist: false });
  //     if (!item) {
  //       throw new Error(
  //         "[Project] [processErrorQueue()] Queue item is unexpectedly empty.",
  //       );
  //     }
  //
  //     const { value, type } = await process(item);
  //     if (type !== "success") {
  //       throw new Error(
  //         "[Project] [processErrorQueue()] Error processing queue item.",
  //       );
  //     }
  //
  //     this.save(value);
  //     this.queueClient?.persist();
  //   }
  // }
}
