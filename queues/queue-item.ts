// unused
export type QueueItemT<T> = {
  value: T;
  prompt: string;
};

export class QueueItem<T> implements QueueItemT<T> {
  public value: T;
  public prompt: string;

  constructor(value: T, prompt: string = "") {
    this.value = value;
    this.prompt = prompt;
  }
}
