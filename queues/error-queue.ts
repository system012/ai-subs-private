// unused
import type { QueueItemT } from "./queue-item";
import { writeFile } from "../utils/io";
import { createLogger } from "../utils/logger";

export type QueueActionOptions = {
  persist: boolean;
};

export class Queue<T> {
  private data: Array<QueueItemT<T>> = [];
  private path = ".";
  private queueFileName: string = "error-queue.json";
  private logger: ReturnType<typeof createLogger> = createLogger(false);

  constructor() {}

  enqueue(
    item: QueueItemT<T>,
    { persist }: QueueActionOptions = { persist: true },
  ) {
    this.data.push(item);
    persist && this.persist();
  }

  dequeue({ persist }: QueueActionOptions = { persist: true }) {
    const item = this.data.shift();
    persist && this.persist();
    return item;
  }

  isEmpty() {
    return this.data.length === 0;
  }

  persist() {
    if (!this.path) {
      this.logger.warn("[Queue] Path not set");
    }
    const path = `${this.path || "."}/${this.queueFileName}`;
    writeFile(path, JSON.stringify(this.data));
  }

  setPath(path: string) {
    this.path = path;
    return this;
  }
}
