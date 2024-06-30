import { appendFile } from "node:fs/promises";

export function readFile(path: string) {
  // eslint-disable-next-line
  return Bun.file(path).text();
}

export function fileExists(path: string): Promise<boolean> {
  // eslint-disable-next-line
  return Bun.file(path).exists();
}

export function folderExists(path: string) {
  // check if folder fofolder folderExists
}

export function writeFile(path: string, content: string): boolean {
  // eslint-disable-next-line
  Bun.write(path, content, {});
}

export async function appendToFile(path: string, content: string) {
  try {
    await appendFile(path, content, { flag: "a", encoding: "utf-8" });
    return true;
  } catch (error) {
    console.error(`Error appending to file: ${error}`);
    return false;
  }
}
