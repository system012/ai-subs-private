import OpenAI from "openai";
import * as dotenv from "dotenv";
import type { LLMProvider, GenerateParams, GenerateResult } from "./types";
import { systemPrompt } from "../prompts";

dotenv.config();

export class OpenAIProvider implements LLMProvider {
  private llm: OpenAI;

  constructor() {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      throw new Error(
        "LLM_API_KEY environment variable is not set for OpenAI provider.",
      );
    }
    this.llm = new OpenAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: apiKey,
    });
  }

  async generate({
    content,
    logger,
    promptAddendum = "",
    temperature = 0.7,
    model,
  }: GenerateParams): Promise<GenerateResult> {
    try {
      logger.debug("Sending request to OpenAI", {
        model,
        temperature,
        contentLength: content.length,
        promptAddendum: promptAddendum || "none",
      });

      const response = await this.llm.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: `${systemPrompt}\n${promptAddendum}` },
          { role: "user", content: content },
        ],
        temperature,
      });

      const messageContent = response.choices[0]?.message?.content;

      if (!messageContent) {
        logger.error("No content received from OpenAI API.");
        return {
          error: true,
          message: "No content received from OpenAI API.",
        };
      }

      logger.debug("Received response from OpenAI", {
        response: messageContent,
      });
      return { value: messageContent, error: false };
    } catch (error: any) {
      logger.error("Error generating response from OpenAI:", error);
      return {
        error: true,
        message: error.message || "Unknown OpenAI API error",
      };
    }
  }
}
