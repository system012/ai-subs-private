import type { LLMProvider, GenerateParams, GenerateResult } from "./types";
import { systemPrompt } from "../prompts";
import { runCliCommand } from "../utils/cli";

const MIGRATION_MARKER = "Database migration complete.\n";

export class OpencodeProvider implements LLMProvider {
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

      logger.debug("Sending request to opencode", {
        model,
        contentLength: content.length,
      });

      const result = await runCliCommand({
        command: "opencode",
        args: ["run", fullPrompt, "--model", model],
        signal,
        name: "opencode",
      });

      if (result.error) {
        return result;
      }

      const responseText = stripMigrationOutput(result.stdout).trim();

      if (!responseText) {
        logger.error("Empty response from opencode");
        return {
          error: true,
          message: "Empty response from opencode",
          status: 0,
        };
      }

      logger.debug("Received response from opencode", {
        responseLength: responseText.length,
      });

      return { value: responseText, error: false };
    } catch (error: any) {
      logger.error("Error generating response from opencode:", error.message);
      return {
        error: true,
        message: error.message || "Unknown opencode error",
        status: error.code || 0,
      };
    }
  }
}

function stripMigrationOutput(stdout: string): string {
  const idx = stdout.indexOf(MIGRATION_MARKER);
  return idx >= 0 ? stdout.slice(idx + MIGRATION_MARKER.length) : stdout;
}
