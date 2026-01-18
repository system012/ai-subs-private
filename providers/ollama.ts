import { Ollama } from "ollama";
import type { LLMProvider, GenerateParams, GenerateResult } from "./types";
import { systemPrompt } from "../prompts";

export class OllamaProvider implements LLMProvider {
  private client: Ollama;

  constructor() {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error("Api key is required!");

    const baseURL = process.env.LLM_API_URL;
    if (!baseURL) throw new Error("LLM_API_URL is required");

    this.client = new Ollama({
      host: baseURL,
      ...(apiKey && { headers: { Authorization: `Bearer ${apiKey}` } }),
    });
  }

  async generate({
    content,
    logger,
    promptAddendum = "",
    temperature = 0.7,
    model,
    signal,
  }: GenerateParams): Promise<GenerateResult> {
    try {
      if (signal?.aborted) {
        return { error: true, message: "Operation aborted", status: 0 };
      }

      logger.debug("Sending request to Ollama", {
        model,
        temperature,
        contentLength: content.length,
        promptAddendum: promptAddendum || "none",
      });

      const response = await this.client.generate({
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
      if (signal?.aborted && error.message === "Operation aborted") {
        return { error: true, message: "Operation aborted", status: 0 };
      }
      logger.error("Error generating response from Ollama:", error);
      return {
        error: true,
        message: error.message || "Unknown Ollama error",
        status: error.status || 0,
      };
    }
  }
}
