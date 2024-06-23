import { appendFile } from "node:fs/promises";

export function readFile(path: string) {
  // eslint-disable-next-line
  return Bun.file(path).text();
}

export function fileExists(path: string): Promise<boolean> {
  // eslint-disable-next-line
  return Bun.file(path).exists();
}

export function writeFile(path: string, content: string): void {
  try {
    // eslint-disable-next-line
    Bun.write(path, content, {});
  } catch (error) {
    console.error(`Error writing file: ${error}`);
  }
}

export async function appendToFile(path: string, content: string) {
  try {
    await appendFile(path, content, { flag: "a", encoding: "utf-8" });
  } catch (error) {
    console.error(`Error appending to file: ${error}`);
  }
}
