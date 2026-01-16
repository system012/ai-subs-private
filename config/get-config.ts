import { program } from "commander";
import { DEFAULT_MAX_PROJECT_FOLDERS } from "../utils/constants";

type Config = {
  input: string;
  output: string;
  debug: boolean;
  model: string;
  fallbackModels: string[];
  provider: "openai" | "ollama";
  maxProjectFolders: number;
};

let config: Config;

export const getConfig = () => {
  if (config) return config;

  config = program
    .requiredOption("-i, --input <path>", "Input file path")
    .requiredOption("-o, --output <path>", "Output file path")
    .option("-d, --debug", "Enable debugging", false)
    .option("-m, --model <model>", "Model to use", "gemini-2.5-flash")
    // .option(
    //   "-m, --model <model>",
    //   "Model to use",
    //   "gemini-3-flash-preview:cloud",
    // )
    .option(
      "--fallback-models <models>",
      "Comma-separated list of fallback models",
      (value) => value.split(","),
      ["gemma-3-27b", "gemini-2.5-flash"],
    )
    .option(
      "-p, --provider <provider>",
      "LLM provider to use (openai or ollama)",
      (value) => value.toLowerCase(),
      // "ollama",
      "openai",
    )
    .option(
      "--max-project-folders <number>",
      "Maximum number of project state folders to keep",
      (value) => parseInt(value, 10),
      DEFAULT_MAX_PROJECT_FOLDERS,
    )
    .parse(process.argv)
    .opts();

  if (!["openai", "ollama"].includes(config.provider)) {
    console.error("Invalid provider specified. Use 'openai' or 'ollama'.");
    process.exit(1);
  }

  return config;
};
