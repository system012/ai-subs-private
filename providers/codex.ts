import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { LLMProvider, GenerateParams, GenerateResult } from "./types";
import { systemPrompt } from "../prompts";
import { runCliCommand } from "../utils/cli";

export const REASONING_EFFORTS = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

// Runs `codex exec` in an empty temp dir, read-only sandbox, no session files, no user config (MCP servers):
// the agent only answers. The final message is read from `--output-last-message`, not from stdout (progress noise).
export class CodexProvider implements LLMProvider {
  private readonly reasoningEffort: ReasoningEffort;

  constructor(reasoningEffort: ReasoningEffort) {
    this.reasoningEffort = reasoningEffort;
  }

  async generate({
    content,
    logger,
    promptAddendum = "",
    model,
    signal,
  }: GenerateParams): Promise<GenerateResult> {
    const workDir = await mkdtemp(join(tmpdir(), "ai-subs-codex-"));
    const lastMessagePath = join(workDir, "last-message.txt");
    try {
      const fullPrompt = `System: ${systemPrompt}\n${promptAddendum}\n\nUser content:\n${content}`;

      logger.debug("Sending request to codex", {
        model,
        reasoningEffort: this.reasoningEffort,
        contentLength: content.length,
      });

      const result = await runCliCommand({
        command: "codex",
        args: [
          "exec",
          "--model",
          model,
          "-c",
          `model_reasoning_effort="${this.reasoningEffort}"`,
          "--sandbox",
          "read-only",
          "--skip-git-repo-check",
          "--ephemeral",
          "--ignore-user-config",
          "--color",
          "never",
          "--cd",
          workDir,
          "--output-last-message",
          lastMessagePath,
          fullPrompt,
        ],
        signal,
        name: "codex",
      });

      if (result.error) {
        return result;
      }

      const responseText = (await readFile(lastMessagePath, "utf8")).trim();
      if (!responseText) {
        logger.error("Empty response from codex");
        return { error: true, message: "Empty response from codex", status: 0 };
      }

      logger.debug("Received response from codex", {
        responseLength: responseText.length,
      });
      return { value: responseText, error: false };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown codex error";
      logger.error("Error generating response from codex:", message);
      return { error: true, message, status: 0 };
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
}
