import { program } from "commander";

type Config = {
  input: string;
  output: string;
  debug: boolean;
  model: string;
  provider: "openai" | "ollama";
};

let config: Config;

export const getConfig = () => {
  if (config) return config;

  config = program
    .requiredOption("-i, --input <path>", "Input file path")
    .requiredOption("-o, --output <path>", "Output file path")
    .option("-d, --debug", "Enable debugging", false)
    .option("-m, --model <model>", "Model to use", "gemini-2.0-flash")
    .option(
      "-p, --provider <provider>",
      "LLM provider to use (openai or ollama)",
      "openai",
    )
    .parse(process.argv)
    .opts();

  if (!["openai", "ollama"].includes(config.provider)) {
    console.error("Invalid provider specified. Use 'openai' or 'ollama'.");
    process.exit(1);
  }

  return config;
};
