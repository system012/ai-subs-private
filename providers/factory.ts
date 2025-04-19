import { getConfig } from "../config/get-config";
import type { LLMProvider } from "./types";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";

export function createLLMProvider(): LLMProvider {
  const config = getConfig();

  switch (config.provider) {
    case "openai":
      console.log("Using OpenAI provider.");
      return new OpenAIProvider();
    case "ollama":
      console.log("Using Ollama provider.");
      return new OllamaProvider();
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}