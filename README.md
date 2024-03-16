# `@reverecre/promise`

## Installation

```
npm i @reverecre/promise
```

<!-- TSDOC_START -->

## :toolbox: Functions

- [chunkArray](#gear-chunkarray)
- [workerPool](#gear-workerpool)
- [chunkedWorkerPool](#gear-chunkedworkerpool)
- [sleep](#gear-sleep)
- [retry](#gear-retry)
- [retryWithDefault](#gear-retrywithdefault)

### :gear: chunkArray

Splits an array into subarray chunks.

| Function | Type |
| ---------- | ---------- |
| `chunkArray` | `<T>(arr: readonly T[], chunkSize: number) => T[][]` |

Parameters:

* `arr`: The array to be chunked.
* `chunkSize`: Size of the sub-arrays.


### :gear: workerPool

Processes an array of items using a given callback and concurrency. Best used as
an alternative to Promise.all(items.map(...)) as it limits concurrency.

| Function | Type |
| ---------- | ---------- |
| `workerPool` | `<In, Out>(tasks: readonly In[], fn: (task: In) => MaybePromise<Out>, workers?: number) => Promise<readonly Out[]>` |

Parameters:

* `tasks`: Items to be processed.
* `fn`: Callback to map each item.
* `workers`: Maximum number of promises to execute at once.


### :gear: chunkedWorkerPool

`workerPool` implementation that batches `tasks` into chunks before calling
`fn` to allow for processing in small batches.

| Function | Type |
| ---------- | ---------- |
| `chunkedWorkerPool` | `<In, Out>(tasks: readonly In[], fn: (task: In[]) => MaybePromise<Out[]>, { chunkSize, workers }?: { workers?: number; chunkSize?: number; }) => Promise<readonly Out[]>` |

Parameters:

* `tasks`: Items to be processed.
* `fn`: Callback to map each item.
* `options`: Concurrency controls.


### :gear: sleep

Waits a given number of milliseconds.

| Function | Type |
| ---------- | ---------- |
| `sleep` | `(ms: number) => Promise<unknown>` |

### :gear: retry

Wraps a function that returns a promise adding retry logic, before throwing
the last seen error.

| Function | Type |
| ---------- | ---------- |
| `retry` | `<In extends unknown[], Out>(fn: (...args: In) => Promise<Out>, { attempts, backoffDuration, backoffJitter, onError, }?: RetryOptions) => (...args: In) => Promise<Out>` |

### :gear: retryWithDefault

Wraps a function that returns a promise adding retry logic, before throwing
returning a default.

| Function | Type |
| ---------- | ---------- |
| `retryWithDefault` | `<In extends unknown[], Out>(fn: (...args: In) => Promise<Out>, defaultTo: Out, opts?: RetryOptions) => (...args: In) => Promise<Out>` |



<!-- TSDOC_END -->
