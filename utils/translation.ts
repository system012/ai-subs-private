import ollama from "ollama";
import {
  createSubtitles,
  iterateSubtitles,
  type SubtitleCallbackArguments,
  type SubtitleResult,
} from "./subtitles";
import { validate } from "./validation";
import { Subtitle } from "../entities/subtitle";
import { Chunk } from "../entities/chunk";

export async function translate({
  chunk,
  promptAddendum = "",
  temperature = 0.7,
  attempts = 0,
  maxAttempts = 100,
}: {
  chunk: Chunk;
  promptAddendum?: string;
  temperature?: number;
  attempts?: number;
  maxAttempts?: number;
}): Promise<{
  translated: string;
  type: "error" | "success";
}> {
  const translated = await generate(chunk.data, promptAddendum, temperature);
  const translatedSubsResult = createSubtitles(translated);
  const originalSubResult = createSubtitles(chunk.data);
  const { type, value: prompt } = validate(
    translatedSubsResult,
    originalSubResult,
  );

  // recursively translate the subtitles if content is not valid
  if (type === "error") {
    const temperature = adjustTemperature(attempts);
    const promptAddendum = prompt ? prompt + "\n" : "";

    if (attempts >= maxAttempts) {
      console.error("Max attempts reached");
      return { translated, type: "error" };
    }

    console.error(
      "Response is not valid. Retrying...",
      attempts + 1,
      " out of ",
      maxAttempts,
    );
    console.log("Response:", translated);
    return translate({
      chunk,
      promptAddendum,
      temperature,
      attempts: attempts + 1,
      maxAttempts,
    });
  }

  const processed = processResponse(translatedSubsResult, originalSubResult);
  if (processed.type === "error") {
    return { translated, type: "error" };
  }

  return { translated: processed.value, type: "success" };
}

export async function generate(
  content: string,
  promptAddendum = "",
  temperature = 0.7,
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

    console.log("Input sent", {
      length: content.length,
      content,
      prompt: promptAddendum !== "" ? system : "",
    });
    const response = await ollama.generate({
      model: "mixtral:8x7b-instruct-v0.1-q3_K_M",
      // model: 'aya:8b-23-q8_0',
      // model: 'dolphin-llama3:8b-v2.9-q8_0',
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
    return generate(content, promptAddendum);
  }
}

function adjustTemperature(attempts: number) {
  // adjust temperature based on the number of attempts, using the modulo operator
  // temperatures is a range of values between 0.1 and 1.0
  const temperatures = [0.1, 0.3, 0.5, 0.7, 0.9];
  const index = attempts % temperatures.length;

  return temperatures[index];
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
      value: "",
    };
  }
  if (originalChunk.type === "error") {
    console.error(
      "Error processing original sub. Sub is invalid:\n",
      originalChunk.message,
    );
    return {
      type: "error",
      value: "",
    };
  }
  const { value: subtitles } = currentSub;
  const { value: originalSubs } = originalChunk;

  const processSubtitle = ({
    subtitle,
    originalSub,
    result,
  }: SubtitleCallbackArguments<string>) => {
    try {
      const { text } = subtitle;
      const normalizedLastLine = (text.at(-1)?.trim() ?? "") + "\n\n";
      const sub = new Subtitle(subtitle.lineNumber, originalSub.timecode, [
        ...text.slice(0, -1),
        normalizedLastLine,
      ]);

      if (!result) result = { type: "success", value: "" };
      result.value += sub.toString();

      return result;
    } catch (error) {
      return {
        type: "error" as const,
        value: "",
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
      value: "",
      type: "error",
    };
  }

  return {
    value: result.value,
    type: "success",
  };
}

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
