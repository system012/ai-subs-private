import ollama from "ollama";
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

export async function translate({
  chunk,
  promptAddendum,
  logger,
}: {
  chunk: Chunk;
  promptAddendum?: string;
  logger: ReturnType<typeof createLogger>;
}): Promise<{
  translated: SubtitleT[];
  type: "error" | "success" | "error-queue";
  prompt: string;
}> {
  const translated = await generate(chunk.data, { logger, promptAddendum });
  const translatedSubsResult = createSubtitles(translated);
  const originalSubResult = createSubtitles(chunk.data);
  const { type, value: prompt } = validate(
    translatedSubsResult,
    originalSubResult,
  );

  if (type === "error") {
    return {
      translated: [],
      type: "error-queue",
      prompt,
    };
  }

  const processed = processResponse(translatedSubsResult, originalSubResult);
  if (processed.type === "error") {
    return { translated: [], type: "error", prompt: "" };
  }

  return { translated: processed.value, type: "success", prompt: "" };
}

export async function generate(
  content: string,
  {
    logger,
    promptAddendum = "",
    temperature = 0.7,
  }: {
    logger: ReturnType<typeof createLogger>;
    promptAddendum?: string;
    temperature?: number;
  },
) {
  try {
    const system = `You are a professional translator from english to Italian.
            You're going to receive english subtitles in SRT format.
            Read the text carefully.
            Your job is to ONLY translate the text from english to italian.
            Translate it as accurately as possible, like a native speaker.
            The translated text should sound natural and fluent in Italian.
            Leave everything else as is.
            DO NOT change the timecode.
            DO NOT change the line number.
            DO NOT change the structure of the text.
            DO NOT say anything else.
            ${promptAddendum}`;

    logger.debug("Input sent", {
      length: content.length,
      ...(promptAddendum !== ""
        ? {
            promptAddendum,
          }
        : {}),
    });
    const response = await ollama.generate({
      model: "mixtral:8x7b-instruct-v0.1-q3_K_M",
      // model: 'llava-llama3:latest',
      system,
      prompt: content,
      options: {
        temperature,
      },
    });
    return response.response;
  } catch (error) {
    console.error("Error generating response:", error);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return generate(content, { logger, promptAddendum, temperature });
  }
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
      type: "error",
      value: [],
    };
  }
  if (originalChunk.type === "error") {
    console.error(
      "Error processing original sub. Sub is invalid:\n",
      originalChunk.message,
    );
    return {
      type: "error",
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
      type: "error",
    };
  }

  return {
    value: result.value,
    type: "success",
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
