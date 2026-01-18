import { translate } from "./translation";
import { Chunk } from "./entities/chunk";
import { createLogger } from "./utils/logger";
import { Project } from "./entities/project";
import { normalizeSubs } from "./utils/normalize";
import { removeDuplicateLineNumbers } from "./utils/preprocessors";
import { StateItem } from "./entities/state-item";
import { errorProcessor } from "./utils/error-processor";
import { getConfig } from "./config/get-config";
import * as dotenv from "dotenv";
import { createLLMProvider } from "./providers/factory";
import { GracefulShutdownManager } from "./utils/shutdown";

dotenv.config();

async function main() {
  const config = getConfig();
  const logger = createLogger(config.debug);
  const shutdownManager = new GracefulShutdownManager(logger);

  const project = new Project(
    config.input,
    config.output,
    config.maxProjectFolders,
  );
  const provider = createLLMProvider();

  project
    .addStringPreprocessors([normalizeSubs])
    .addSubtitlePreprocessors([removeDuplicateLineNumbers]);
  await project.init();
  console.time("translation");

  for (const [index, chunk] of project.chunks.entries()) {
    if (shutdownManager.isShutdownRequested) break;

    logger.log(
      `Translating chunk ${index + 1} out of ${project.chunks.length}. Chunk ID: ${chunk.id}`,
    );
    console.time(`chunk ${index + 1} translation`);
    const { translated, type, prompt } = await translate({
      chunk,
      logger,
      provider,
    });
    console.timeEnd(`chunk ${index + 1} translation`);

    if (type === "error-queue") {
      project.save(new StateItem(chunk, "error", prompt));
      continue;
    }
    if (type === "error") {
      logger.error("Error generating translations");
      console.timeEnd("translation");
      return;
    }

    project.save(
      new StateItem(Chunk.fromSubtitles(chunk.id, translated), "done"),
    );
  }

  await project.processErrors(errorProcessor, provider, shutdownManager.signal);

  if (shutdownManager.isShutdownRequested) {
    if (!project.isDone) {
      logger.log("Graceful shutdown complete (project incomplete).");
      process.exit(130);
    }
    project.complete();
    logger.log("Graceful shutdown complete.");
    return;
  }

  project.complete();

  logger.debug(`Translation generated successfully for file: ${config.input}`);
  console.timeEnd("translation");
}

main();
