import type { Chunk } from "./chunk";

export class StateItem<T extends Chunk> {
  constructor(
    public value: T,
    public status: "pending" | "done" | "error" = "pending",
    public prompt: string = "",
  ) {
    this.value = value;
    this.status = status;
    this.prompt = prompt;
  }

  failed(prompt: string) {
    this.status = "error";
    this.prompt = prompt;
  }

  done() {
    this.status = "done";
  }
}
