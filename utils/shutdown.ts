import { createLogger } from "./logger";

export class GracefulShutdownManager {
  private controller: AbortController;
  private logger: ReturnType<typeof createLogger>;

  constructor(logger: ReturnType<typeof createLogger>) {
    this.controller = new AbortController();
    this.logger = logger;
    this.setupSignalHandlers();
  }

  private setupSignalHandlers() {
    process.on("SIGINT", () => {
      if (this.controller.signal.aborted) {
        this.logger.log("Forced exit.");
        process.exit(1);
      }
      this.logger.log(
        "\nReceived SIGINT. Finishing current task and shutting down...",
      );
      this.controller.abort();
    });
  }

  get signal() {
    return this.controller.signal;
  }

  get isShutdownRequested() {
    return this.controller.signal.aborted;
  }
}