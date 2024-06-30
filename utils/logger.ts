export function createLogger(debug: boolean) {
  return {
    log: (...msg: unknown[]) => console.log(`[Logger] [Log]`, ...msg),
    warn: (...msg: unknown[]) => console.warn(`[Logger] [Warn]`, ...msg),
    debug: (...msg: unknown[]) =>
      debug && console.log(`[Logger] [Debug]`, ...msg),
    error: (...msg: unknown[]) => console.error(`[Logger] [Error]`, ...msg),
  };
}
