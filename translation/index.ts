import {
  createSubtitles,
  iterateSubtitles,
  type SubtitleCallbackArguments,
  type SubtitleResult,
} from "../utils/subtitles";
import { validate } from "../validation/validation";
import { Subtitle, type SubtitleT } from "../entities/subtitle";
import { Chunk } from "../entities/chunk";
import { createLogger } from "../utils/logger";
import { SUBTITLE_DELIMITER } from "../utils/constants";
import { getConfig } from "../config/get-config";
import { type LLMProvider } from "../providers/types";
import { retry } from "../utils/retry";

export async function translate({
  chunk,
  promptAddendum,
  logger,
  provider,
  signal,
}: {
  chunk: Chunk;
  promptAddendum?: string;
  logger: ReturnType<typeof createLogger>;
  provider: LLMProvider;
  signal?: AbortSignal;
}): Promise<{
  translated: SubtitleT[];
  type: "error" | "success" | "error-queue";
  prompt: string;
}> {
  const config = getConfig();
  let generateResult;
  for (const model of [config.model, ...config.fallbackModels]) {
    if (signal?.aborted) break;

    generateResult = await retry(
      () =>
        provider.generate({
          content: chunk.data,
          logger,
          promptAddendum,
          model: model,
          signal,
        }),
      {
        maxAttempts: 10,
        initialDelay: 3000,
        signal,
      },
    );

    if (!generateResult.error) break;

    if (signal?.aborted) break;

    logger.warn(
      `error persisting after retrying, switching to next model: ${model}`,
    );
  }

  if (!generateResult || generateResult?.error) {
    if (signal?.aborted) {
      logger.log("Translation aborted by signal.");
      return {
        translated: [],
        type: "error",
        prompt: "",
      };
    }

    logger.error(
      "LLM provider failed to generate translation:",
      generateResult?.message || "No value returned",
    );

    return {
      translated: [],
      type: "error",
      prompt: "",
    };
  }

  const translatedSubsResult = createSubtitles(generateResult.value);
  const originalSubResult = createSubtitles(chunk.data);

  const { type: validationType, value: validationPrompt } = validate(
    translatedSubsResult,
    originalSubResult,
  );

  if (validationType === "error") {
    return {
      translated: [],
      type: "error-queue",
      prompt: validationPrompt,
    };
  }

  const processed = processResponse(translatedSubsResult, originalSubResult);
  if (processed.type === "error") {
    return { translated: [], type: "error", prompt: "" };
  }

  return { translated: processed.value, type: "success", prompt: "" };
}

function processResponse(
  currentSub: SubtitleResult,
  originalChunk: SubtitleResult,
) {
  if (currentSub.type === "error") {
    console.error(
      "Error processing new sub. Sub is invalid:\n",
      currentSub.message,
    );
    return {
      type: "error" as const,
      value: [],
    };
  }
  if (originalChunk.type === "error") {
    console.error(
      "Error processing original sub. Sub is invalid:\n",
      originalChunk.message,
    );
    return {
      type: "error" as const,
      value: [],
    };
  }
  const { value: subtitles } = currentSub;
  const { value: originalSubs } = originalChunk;

  const processSubtitle = ({
    subtitle,
    originalSub,
    result,
  }: SubtitleCallbackArguments<SubtitleT[]>) => {
    try {
      const { text } = subtitle;
      const normalizedLastLine =
        (text.at(-1)?.trim() ?? "") + SUBTITLE_DELIMITER;
      const sub = new Subtitle(subtitle.lineNumber, originalSub.timecode, [
        ...text.slice(0, -1),
        normalizedLastLine,
      ]);

      if (!result) result = { type: "success", value: [] };
      result.value.push(sub);

      return result;
    } catch (error) {
      return {
        type: "error" as const,
        value: [],
        message: error as Error,
      };
    }
  };

  const result = iterateSubtitles(subtitles, originalSubs, [processSubtitle]);
  if (result.type === "error") {
    console.error(
      "Error processing subtitles. Couldn't process it: \n",
      result.message,
    );
    return {
      value: [],
      type: "error" as const,
    };
  }

  return {
    value: result.value,
    type: "success" as const,
  };
}

// function adjustTemperature(attempts: number) {
//   // adjust temperature based on the number of attempts, using the modulo operator
//   // temperatures is a range of values between 0.1 and 1.0
//   const temperatures = [0.1, 0.3, 0.5, 0.7, 0.9];
//   const index = attempts % temperatures.length;
//
//   return temperatures[index];
// }

// function createRandomPromptAddendum(attempts: number) {
//     const prompts = [
//         "Respect the pacing of the original subtitle and DO NOT merge multiple dialogues into one.",
//         "EXTREMELY IMPORTANT: do NOT miss any dialogue.",
//         "Make sure to include ALL the lines, otherwise someone might get hurt.",
//         "DOUBLE CHECK if all lines are accounted for but DO NOT say anything about it",
//     ]
//     // rotate the prompts based on the number of attempts
//     const index = attempts % prompts.length
//     return '\n' + prompts[index]
// }
