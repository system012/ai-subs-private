import { getConfig } from "../config/get-config";
import type { LLMProvider } from "./types";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";
import { ClaudeCodeProvider } from "./claude-code";
import { GeminiCliProvider } from "./gemini-cli";
import { OpencodeProvider } from "./opencode";

export function createLLMProvider(): LLMProvider {
  const config = getConfig();

  switch (config.provider) {
    case "openai":
      console.log("Using OpenAI provider.");
      return new OpenAIProvider();
    case "ollama":
      console.log(`Using Ollama provider.`);
      return new OllamaProvider();
    case "claude-code":
      console.log("Using Claude Code provider.");
      return new ClaudeCodeProvider();
    case "gemini":
      console.log("Using Gemini CLI provider.");
      return new GeminiCliProvider();
    case "opencode":
      console.log("Using opencode provider.");
      return new OpencodeProvider();
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

