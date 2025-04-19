import ollama from "ollama";
import type { LLMProvider, GenerateParams, GenerateResult } from "./types";
import { systemPrompt } from "../prompts";

export class OllamaProvider implements LLMProvider {
  async generate({
    content,
    logger,
    promptAddendum = "",
    temperature = 0.7,
    model,
  }: GenerateParams): Promise<GenerateResult> {
    try {
      logger.debug("Sending request to Ollama", {
        model,
        temperature,
        contentLength: content.length,
        promptAddendum: promptAddendum || "none",
      });

      const response = await ollama.generate({
        model,
        system: `${systemPrompt}\n${promptAddendum}`,
        prompt: content,
        options: {
          temperature,
        },
      });

      logger.debug("Received response from Ollama", {
        responseLength: response.response.length,
      });
      return { value: response.response, error: false };
    } catch (error: any) {
      logger.error("Error generating response from Ollama:", error);
      return {
        error: true,
        message: error.message || "Unknown Ollama error",
      };
    }
  }
}