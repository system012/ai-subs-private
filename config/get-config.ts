import { program } from "commander";

type Config = {
  input: string;
  output: string;
  debug: boolean;
};

let config: Config;

export const getConfig = () => {
  if (config) return config;

  config = program
    .requiredOption("-i, --input <path>", "Input file path")
    .requiredOption("-o, --output <path>", "Output file path")
    .option("-d, --debug", "Enable debugging", false)
    .parse(process.argv)
    .opts();

  return config;
};
