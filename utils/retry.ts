import { createLogger } from "./logger";

const logger = createLogger(false);

/**
 * Delays execution for a specified number of milliseconds.
 * @param ms - The number of milliseconds to wait.
 * @returns A promise that resolves after the delay.
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

type RetryableResult = { error: true; message: string } | { error: false; };
type RetryOptions = {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
};

/**
 * Retries an asynchronous function with exponential backoff.
 * The function `fn` must return a Promise resolving to an object `T` where `T` extends `{ error: boolean }`.
 * This function will not throw but will return an object with `error: true` if all attempts fail.
 * @param fn - The asynchronous function to retry. Must return a Promise<T>.
 * @param options - The retry options.
 * @returns A promise that resolves with the result `T` of the function.
 */
export async function retry<T extends RetryableResult>(
  fn: () => Promise<T>,
  {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
  }: RetryOptions = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
    },
): Promise<T> {
  let attempts = 0;
  let currentDelay = initialDelay;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      logger.debug(`Attempt ${attempts} of ${maxAttempts}...`);
      const result = await fn();

      if (result.error) {
        const errorMessage = result.message || `Operation failed on attempt ${attempts}`;
        throw new Error(errorMessage);
      }

      return result;
    } catch (error: any) {
      logger.warn(`Attempt ${attempts} failed: ${error.message}`);

      if (attempts >= maxAttempts) {
        logger.error(`All ${maxAttempts} attempts failed. Returning last result.`);
        return {
          error: true,
          message: error.message || "Max attempts reached without success",
        } as T;
      }

      const backoffDelay = Math.min(currentDelay, maxDelay);
      logger.debug(`Retrying in ${backoffDelay}ms...`);
      await delay(backoffDelay);
      currentDelay *= 2;
    }
  }

  throw new Error("Retry logic reached an unexpected state.");
}
