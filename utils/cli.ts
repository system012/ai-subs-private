import { spawn } from "child_process";

export type CliResult =
  | { stdout: string; error: false }
  | { error: true; message: string; status: number };

export interface RunCliCommandOptions {
  command: string;
  args: string[];
  signal?: AbortSignal;
  name?: string;
}

export function runCliCommand({
  command,
  args,
  signal,
  name,
}: RunCliCommandOptions): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return resolve({
        error: true,
        message: "Operation aborted",
        status: 0,
      });
    }

    const displayName = name ?? command;
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finalize = (result: CliResult) => {
      if (settled) {
        return;
      }
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      resolve(result);
    };

    const onAbort = () => {
      child.kill();
      finalize({
        error: true,
        message: "Operation aborted",
        status: 0,
      });
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout!.setEncoding("utf8");
    child.stderr!.setEncoding("utf8");

    child.stdout!.on("data", (c) => {
      stdout += c;
    });
    child.stderr!.on("data", (d) => {
      stderr += d;
    });

    child.on("error", (error: any) => {
      if (settled) {
        return;
      }
      signal?.removeEventListener("abort", onAbort);
      reject({
        error: true,
        message: `failed to spawn ${displayName}: ${error.message}`,
        status: error.code || 127,
      });
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      if (code === 0) {
        return finalize({ stdout, error: false });
      }

      const errorMsg = stderr || stdout || "Unknown error";
      finalize({
        error: true,
        message: `${displayName} CLI exited with code ${code}: ${errorMsg}`,
        status: code || 1,
      });
    });
  });
}