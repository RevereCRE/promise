/**
 * @fileoverview `promise` exports a collection of helper functions for working with
 * promises and controlling concurrency.
 */

/**
 * Splits an array into subarray chunks.
 *
 * @param arr The array to be chunked.
 * @param chunkSize Size of the sub-arrays.
 * @returns An array of chunks, e.g. chunkArray([1, 2, 3, 4], 2) ➡️ [[1, 2], [3, 4]].
 */
export function chunkArray<T>(arr: ReadonlyArray<T>, chunkSize: number) {
  return Array.from(
    (function* chunk() {
      for (let i = 0; i < arr.length; i += chunkSize) {
        yield arr.slice(i, i + chunkSize);
      }
    })()
  );
}

type MaybePromise<T> = T | Promise<T>;

const Pending = Symbol('Pending');
function isQueueCompleted<T>(q: (T | typeof Pending)[]): q is T[] {
  return q.every((item) => item !== Pending);
}

/**
 * Processes an array of items using a given callback and concurrency. Best used as
 * an alternative to Promise.all(items.map(...)) as it limits concurrency.
 *
 * @param tasks Items to be processed.
 * @param fn Callback to map each item.
 * @param workers Maximum number of promises to execute at once.
 * @returns An array of `tasks` mapped using `fn`.
 */
export async function workerPool<In, Out>(
  tasks: readonly In[],
  fn: (task: In) => MaybePromise<Out>,
  workers = 10
): Promise<readonly Out[]> {
  if (tasks.length === 0) {
    return [];
  }

  return new Promise((resolve) => {
    const queue = [...tasks];
    const results: (Out | typeof Pending)[] = tasks.map(() => Pending);

    function scheduleNext() {
      if (queue.length > 0) void performTask(queue.shift()!);
    }

    function findTaskPosition(task: In) {
      let searchStart = 0;
      while (searchStart < tasks.length) {
        const pos = tasks.indexOf(task, searchStart);

        // The following check handles the task object not being found in the
        // task list. This would theoretically cause indexOf to return -1, and
        // the searchStart index would then reset to 0. This would then loop
        // infinitely through the task list. However, its not clear how the
        // task could ever fail to be found, since the list is not mutated and
        // is created with the original task objects.
        if (pos === -1) {
          // eslint-disable-next-line no-console
          console.error(
            `Unable to find the task position for task: ${JSON.stringify(
              task
            )}.`
          );
        }

        if (results[pos] === Pending) return pos;
        searchStart = pos + 1;
      }

      return null;
    }

    async function performTask(task: In) {
      return Promise.resolve(fn(task)).then((result) => {
        const resultPosition = findTaskPosition(task);
        if (resultPosition != null) {
          results[resultPosition] = result;
        }

        if (isQueueCompleted(results)) {
          resolve(results);
        } else {
          scheduleNext();
        }
      });
    }

    for (let i = 0; i < workers; ++i) {
      scheduleNext();
    }
  });
}

/**
 * `workerPool` implementation that batches `tasks` into chunks before calling
 * `fn` to allow for processing in small batches.
 *
 * @param tasks Items to be processed.
 * @param fn Callback to map each item.
 * @param options Concurrency controls.
 * @returns An array of `tasks` mapped using `fn`.
 */
export async function chunkedWorkerPool<In, Out>(
  tasks: readonly In[],
  fn: (task: In[]) => MaybePromise<Out[]>,
  { chunkSize = 10, workers }: { workers?: number; chunkSize?: number } = {}
): Promise<readonly Out[]> {
  const chunks = chunkArray(tasks, chunkSize);
  const results = await workerPool(chunks, fn, workers);
  return results.flat();
}

/** Waits a given number of milliseconds. */
export async function sleep(ms: number) {
  return new Promise((r) => {
    setTimeout(r, ms);
  });
}

interface RetryOptions {
  attempts?: number;
  backoffDuration?: number;
  backoffJitter?: number;
  onError?: (error: Error) => void;
}

/**
 * Wraps a function that returns a promise adding retry logic, before throwing
 * the last seen error.
 */
export function retry<In extends unknown[], Out>(
  fn: (...args: In) => Promise<Out>,
  {
    attempts = 3,
    backoffDuration = 500,
    backoffJitter = 25,
    onError,
  }: RetryOptions = {}
) {
  return async function retry(...args: In): Promise<Out> {
    let latestError: Error | null = null;

    for (let attemptCount = 1; attemptCount <= attempts; attemptCount++) {
      try {
        return await fn(...args);
      } catch (e: unknown) {
        latestError = e as Error;
        onError?.(latestError);

        // Exponential backoff if not last attempt.
        if (attemptCount < attempts) {
          const baseBackoffDuration = backoffDuration * 2 ** attemptCount;
          const jitterDuration = Math.random() * backoffJitter;
          await sleep(baseBackoffDuration + jitterDuration);
        }
      }
    }

    throw latestError;
  };
}

/**
 * Wraps a function that returns a promise adding retry logic, before throwing
 * returning a default.
 */
export function retryWithDefault<In extends unknown[], Out>(
  fn: (...args: In) => Promise<Out>,
  defaultTo: Out,
  opts?: RetryOptions
) {
  const withRetry = retry(fn, opts);
  return async function retryWithDefault(...args: In) {
    try {
      return await withRetry(...args);
    } catch (_e: unknown) {
      return defaultTo;
    }
  };
}
