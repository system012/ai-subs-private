import { appendFile, readdir, stat, rm } from "node:fs/promises";
import path from "path";

export function readFile(path: string) {
  // eslint-disable-next-line
  return Bun.file(path).text();
}

export function fileExists(path: string): Promise<boolean> {
  // eslint-disable-next-line
  return Bun.file(path).exists();
}

export function folderExists(path: string): Promise<boolean> {
  return stat(path)
    .then((stats) => stats.isDirectory())
    .catch(() => false);
}

export function writeFile(path: string, content: string): Promise<number> {
  // eslint-disable-next-line
  return Bun.write(path, content, { createPath: true });
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

/**
 * Represents information about a directory.
 */
export interface DirectoryInfo {
  path: string;
  mtimeMs: number; // Modification time in milliseconds since epoch
}

/**
 * Lists directories within a given base path.
 * @param basePath The path to the directory to scan.
 * @returns A promise that resolves to an array of DirectoryInfo objects.
 */
export async function getDirectories(basePath: string): Promise<DirectoryInfo[]> {
  const directories: DirectoryInfo[] = [];
  try {
    const entries = await readdir(basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(basePath, entry.name);
        try {
          const stats = await stat(fullPath);
          directories.push({ path: fullPath, mtimeMs: stats.mtimeMs });
        } catch (statError) {
          console.error(`Error getting stats for ${fullPath}:`, statError);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${basePath}:`, error);
  }
  return directories;
}

/**
 * Recursively deletes a directory.
 * @param dirPath The path to the directory to delete.
 * @returns A promise that resolves when deletion is complete.
 */
export async function deleteDir(dirPath: string): Promise<void> {
  try {
    await rm(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error deleting directory ${dirPath}:`, error);
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("Directory doesn't exist");
      return;
    }
    throw error;
  }
}
