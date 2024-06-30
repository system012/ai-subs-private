import type { Chunk } from "./chunk";
import { StateItem } from "./state-item";

export class State<T extends Chunk> {
  constructor(public value: StateItem<T>[]) {
    this.value = value;
  }

  static fromString(state: string) {
    return new State(JSON.parse(state).value);
  }

  toString() {}

  get pending() {
    return this.value?.filter((item) => item.status === "pending");
  }

  get done() {
    return this.value?.filter((item) => item.status === "done");
  }

  get errors() {
    return this.value?.filter((item) => item.status === "error");
  }
}
