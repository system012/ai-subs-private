import { getConfig, type Provider } from "../config/get-config";
import type { LLMProvider } from "./types";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";
import { ClaudeCodeProvider } from "./claude-code";
import { GeminiCliProvider } from "./gemini-cli";
import { OpencodeProvider } from "./opencode";
import { CodexProvider } from "./codex";

type ProviderFactory = { label: string; create: () => LLMProvider };

// One entry per provider: a new provider is one new line here.
const providerFactories: Record<Provider, ProviderFactory> = {
  openai: { label: "OpenAI", create: () => new OpenAIProvider() },
  ollama: { label: "Ollama", create: () => new OllamaProvider() },
  "claude-code": {
    label: "Claude Code",
    create: () => new ClaudeCodeProvider(),
  },
  gemini: { label: "Gemini CLI", create: () => new GeminiCliProvider() },
  opencode: { label: "opencode", create: () => new OpencodeProvider() },
  codex: {
    label: "Codex",
    create: () => new CodexProvider(getConfig().reasoningEffort),
  },
};

export function createLLMProvider(): LLMProvider {
  const config = getConfig();
  const factory = providerFactories[config.provider];
  console.log(`Using ${factory.label} provider.`);
  return factory.create();
}
