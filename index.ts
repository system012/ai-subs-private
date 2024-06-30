import { translate } from "./translation/translation";
import { Chunk } from "./entities/chunk";
import { createLogger } from "./utils/logger";
import { Project } from "./entities/project";
import { normalizeSubs } from "./utils/normalize";
import { StateItem } from "./entities/state-item";
import { errorProcessor } from "./utils/error-processor";
import { getConfig } from "./config/get-config";

async function main() {
  // get argument from command line
  const config = getConfig();
  const logger = createLogger(config.debug);
  const project = new Project(config.input, config.output);

  project.addPreprocessors([normalizeSubs]);
  await project.init();
  console.time("translation");

  for (const [index, chunk] of project.chunks.entries()) {
    logger.log(
      `Translating chunk ${index + 1} out of ${project.chunks.length}. Chunk ID: ${chunk.id}`,
    );
    const { translated, type, prompt } = await translate({ chunk, logger });
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

  await project.processErrors(errorProcessor);
  project.complete();

  logger.debug("Translations generated successfully");
  console.timeEnd("translation");
}

main();
