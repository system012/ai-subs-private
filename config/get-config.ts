import { program } from "commander";
import { DEFAULT_MAX_PROJECT_FOLDERS } from "../utils/constants";

type Config = {
  input: string;
  output: string;
  debug: boolean;
  model: string;
  fallbackModels: string[];
  provider: "openai" | "ollama" | "claude-code" | "gemini";
  maxProjectFolders: number;
};

let config: Config;

export const getConfig = () => {
  if (config) return config;

  config = program
    .requiredOption("-i, --input <path>", "Input file path")
    .requiredOption("-o, --output <path>", "Output file path")
    .option("-d, --debug", "Enable debugging", false)
    .option("-m, --model <model>", "Model to use", "gemini-3-flash-preview")
    // .option("-m, --model <model>", "Model to use", "gemini-2.5-flash")
    // .option("-m, --model <model>", "Model to use", "haiku")
    // .option(
    //   "-m, --model <model>",
    //   "Model to use",
    //   "gemini-3-flash-preview:cloud",
    // )
    .option(
      "--fallback-models <models>",
      "Comma-separated list of fallback models",
      (value) => value.split(","),
      ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    )
    .option(
      "-p, --provider <provider>",
      "LLM provider to use (openai, ollama, claude-code, or gemini)",
      (value) => value.toLowerCase(),
      "gemini",
      // "ollama",
      // "claude-code",
      // "openai",
    )
    .option(
      "--max-project-folders <number>",
      "Maximum number of project state folders to keep",
      (value) => parseInt(value, 10),
      DEFAULT_MAX_PROJECT_FOLDERS,
    )
    .parse(process.argv)
    .opts();

  if (
    !["openai", "ollama", "claude-code", "gemini"].includes(config.provider)
  ) {
    console.error(
      "Invalid provider specified. Use 'openai', 'ollama', 'claude-code', or 'gemini'.",
    );
    process.exit(1);
  }

  return config;
};
