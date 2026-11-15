import { program } from "commander";
import { DEFAULT_MAX_PROJECT_FOLDERS } from "../utils/constants";
import { REASONING_EFFORTS, type ReasoningEffort } from "../providers/codex";

export const PROVIDERS = [
  "openai",
  "ollama",
  "claude-code",
  "gemini",
  "opencode",
  "codex",
] as const;
export type Provider = (typeof PROVIDERS)[number];

type Config = {
  input: string;
  output: string;
  debug: boolean;
  model: string;
  fallbackModels: string[];
  provider: Provider;
  reasoningEffort: ReasoningEffort;
  maxProjectFolders: number;
};

let config: Config;

export const getConfig = () => {
  if (config) return config;
  // gemini-2.5-pro
  config = program
    .requiredOption("-i, --input <path>", "Input file path")
    .requiredOption("-o, --output <path>", "Output file path")
    .option("-d, --debug", "Enable debugging", false)
    // .option("-m, --model <model>", "Model to use", "gemini-3-flash-preview")
    // .option("-m, --model <model>", "Model to use", "gemini-2.5-pro")
    // .option("-m, --model <model>", "Model to use", "gemini-2.5-flash")
    // .option("-m, --model <model>", "Model to use", "haiku")
    // .option(
    //   "-m, --model <model>",
    //   "Model to use",
    //   "gemini-3-flash-preview:cloud",
    // )
    .option("-m, --model <model>", "Model to use", "gpt-6-luna")
    .option(
      "--fallback-models <models>",
      "Comma-separated list of fallback models",
      (value) => value.split(","),
      ["gpt-5.6-luna"],
    )
    .option(
      "-p, --provider <provider>",
      `LLM provider to use (${PROVIDERS.join(", ")})`,
      (value) => value.toLowerCase(),
      "codex",
      // "gemini",
      // "ollama",
      // "claude-code",
      // "openai",
    )
    .option(
      "--reasoning-effort <level>",
      `Reasoning effort, codex provider only (${REASONING_EFFORTS.join(", ")})`,
      (value) => value.toLowerCase(),
      "low",
    )
    .option(
      "--max-project-folders <number>",
      "Maximum number of project state folders to keep",
      (value) => parseInt(value, 10),
      DEFAULT_MAX_PROJECT_FOLDERS,
    )
    .parse(process.argv)
    .opts();

  if (!(PROVIDERS as readonly string[]).includes(config.provider)) {
    console.error(
      `Invalid provider specified. Use one of: ${PROVIDERS.join(", ")}.`,
    );
    process.exit(1);
  }
  if (
    !(REASONING_EFFORTS as readonly string[]).includes(config.reasoningEffort)
  ) {
    console.error(
      `Invalid reasoning effort. Use one of: ${REASONING_EFFORTS.join(", ")}.`,
    );
    process.exit(1);
  }

  return config;
};
