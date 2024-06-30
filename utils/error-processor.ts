import { translate } from "../translation/translation";
import { Chunk } from "../entities/chunk";
import { StateItem } from "../entities/state-item";
import type { SubtitleT } from "../entities/subtitle";
import { createLogger } from "./logger";

type ErrorProcessorOptionsT = {
  attempts?: number;
  maxAttempts?: number;
  logger: ReturnType<typeof createLogger>;
};

export const errorProcessor = async (
  item: StateItem<Chunk>,
  {
    attempts = 1,
    maxAttempts = 50,
    logger = createLogger(true),
  }: ErrorProcessorOptionsT = {
    attempts: 1,
    maxAttempts: 50,
    logger: createLogger(true),
  },
): Promise<{
  value: SubtitleT[];
  type: "error" | "success" | "error-queue";
}> => {
  const {
    translated: value,
    type,
    prompt,
  } = await translate({
    chunk: item.value,
    promptAddendum: item.prompt,
    logger,
  });

  if (type === "success") return { value, type };

  logger.debug("[ErrorProcessor] Error processing item", {
    chunkId: item.value.id,
    attempts,
    maxAttempts,
  });

  return attempts < maxAttempts
    ? errorProcessor(new StateItem(item.value, "error", prompt), {
        attempts: attempts + 1,
        logger,
      })
    : { value: [], type: "error" };
};
