import { createLogger } from "../utils/logger";

export type GenerateResult =
  | {
      value: string;
      error: false;
    }
  | {
      error: true;
      message: string;
      status: number;
    };

export type GenerateParams = {
  content: string;
  logger: ReturnType<typeof createLogger>;
  promptAddendum?: string;
  temperature?: number;
  model: string;
};

export interface LLMProvider {
  generate(params: GenerateParams): Promise<GenerateResult>;
}

