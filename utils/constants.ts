export const SUBTITLE_DELIMITER = "\n\n";
export const LINE_DELIMITER = "\n";
export const LINE_REGEX =
  /(\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n[\s\S]*?)(?=(\n\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n|$))/g;
export const DEFAULT_MAX_CHUNK_SIZE = 6000;
export const DEFAULT_MAX_PROJECT_FOLDERS = 5;
export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
