import type { LLMProvider, GenerateParams, GenerateResult } from "./types";
import { systemPrompt } from "../prompts";
import { runCliCommand } from "../utils/cli";

export class GeminiCliProvider implements LLMProvider {
  async generate({
    content,
    logger,
    promptAddendum = "",
    model,
    signal,
  }: GenerateParams): Promise<GenerateResult> {
    try {
      const fullSystemPrompt = `${systemPrompt}\n${promptAddendum}`;
      const fullPrompt = `System: ${fullSystemPrompt}\n\nUser content:\n${content}`;

      logger.debug("Sending request to Gemini CLI", {
        model,
        contentLength: content.length,
      });

      const args = ["-p", fullPrompt, "--output-format", "json", "--model", model];

      const result = await runCliCommand({
        command: "gemini",
        args,
        signal,
        name: "gemini",
      });

      if (result.error) {
        return result;
      }

      try {
        const response = JSON.parse(result.stdout);
        let responseText = response.response;

        if (!responseText) {
          logger.error("No response field in Gemini CLI output");
          return {
            error: true,
            message: "No response field in Gemini CLI output",
            status: 0,
          };
        }

        // Clean up Markdown code blocks if present (e.g. ```srt ... ``` or just ``` ... ```)
        // Even without asking for JSON, models often wrap structured text like SRT in code blocks.
        responseText = responseText
          .replace(/^```[a-zA-Z]*\s*/, "")
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");

        logger.debug("Received response from Gemini CLI", {
          responseLength: responseText.length,
        });

        return { value: responseText, error: false };
      } catch (parseError: any) {
        logger.error(
          "Failed to parse Gemini CLI JSON response:",
          parseError.message,
          "Raw output:",
          result.stdout,
        );
        return {
          error: true,
          message: `JSON parse error: ${parseError.message}`,
          status: 0,
        };
      }
    } catch (error: any) {
      logger.error("Error generating response from Gemini CLI:", error.message);
      return {
        error: true,
        message: error.message || "Unknown Gemini CLI error",
        status: error.code || 0,
      };
    }
  }
}
