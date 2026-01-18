import type { LLMProvider, GenerateParams, GenerateResult } from "./types";
import { systemPrompt } from "../prompts";
import { runCliCommand } from "../utils/cli";

export class ClaudeCodeProvider implements LLMProvider {
  async generate({
    content,
    logger,
    promptAddendum = "",
    temperature = 0.7,
    model,
    signal,
  }: GenerateParams): Promise<GenerateResult> {
    try {
      const mappedModel = this.mapModelName(model);

      logger.debug("Sending request to Claude Code", {
        model: mappedModel,
        temperature,
        contentLength: content.length,
        promptAddendum: promptAddendum || "none",
      });

      const fullSystemPrompt = `${systemPrompt}\n${promptAddendum}`;
      const fullPrompt = `User content:\n${content}`;

      const jsonSchema = JSON.stringify({
        type: "object",
        properties: {
          translation: {
            type: "string",
            description: "The translated subtitle text",
          },
        },
        required: ["translation"],
      });

      const args = [
        "-p",
        fullPrompt,
        "--output-format",
        "json",
        "--json-schema",
        jsonSchema,
        "--no-session-persistence",
        "--system-prompt",
        fullSystemPrompt,
        "--model",
        mappedModel,
      ];

      const result = await runCliCommand({
        command: "claude",
        args,
        signal,
        name: "claude",
      });

      if (result.error) {
        return result;
      }

      try {
        const response = JSON.parse(result.stdout);
        const parsedResult = response.structured_output;

        if (!parsedResult.translation) {
          logger.error("No translation field in structured output");
          return {
            error: true,
            message: "No translation field in structured output",
            status: 0,
          };
        }

        logger.debug("Received response from Claude Code", {
          responseLength: parsedResult.translation.length,
        });

        return { value: parsedResult.translation, error: false };
      } catch (parseError: any) {
        logger.error(
          "Failed to parse Claude Code JSON response:",
          parseError.message,
        );
        return {
          error: true,
          message: `JSON parse error: ${parseError.message}`,
          status: 0,
        };
      }
    } catch (error: any) {
      logger.error(
        "Error generating response from Claude Code:",
        error.message,
      );
      return {
        error: true,
        message: error.message || "Unknown Claude Code error",
        status: error.code || 0,
      };
    }
  }

  private mapModelName(model: string): string {
    const modelMap: Record<string, string> = {
      sonnet: "sonnet",
      opus: "opus",
      haiku: "haiku",
    };

    return modelMap[model.toLowerCase()] || model;
  }
}
