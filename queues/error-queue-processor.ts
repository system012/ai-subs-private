// unused
import { translate } from "../translation";
import { Chunk } from "../entities/chunk";
import { type QueueItemT, QueueItem } from "./queue-item";
import type { SubtitleT } from "../entities/subtitle";

type QueueProcessorOptionsT = {
  attempts?: number;
  maxAttempts?: number;
};

export const queueProcessor = async (
  item: QueueItemT<string>,
  { attempts = 0, maxAttempts = 3 }: QueueProcessorOptionsT = {
    attempts: 0,
    maxAttempts: 3,
  },
): Promise<{
  value: SubtitleT[];
  type: "error" | "success" | "error-queue";
}> => {
  const chunk = Chunk.fromString(0, item.value);
  const {
    translated: value,
    type,
    prompt,
  } = await translate({ chunk, promptAddendum: item.prompt });

  if (type !== "success") {
    return attempts < maxAttempts
      ? queueProcessor(new QueueItem(item.value, prompt))
      : { value: [], type: "error" };
  }

  return { value, type };
};
