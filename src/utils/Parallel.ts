/**
 * @description map over `items` with at most `concurrency` tasks in flight, keeping the input order.
 *
 *   the point of this over `Promise.all` of a pool of workers is what happens on a failure. `Promise.all`
 *   settles the moment one worker rejects, while the others are still running - a caller that releases a
 *   resource in its `finally` would release it out from under the tasks still reading from it. here the
 *   first failure stops any further item from being claimed, every task already started is awaited, and
 *   only then is that first failure rethrown.
 */
export async function mapWithConcurrency<T, R>(items: readonly T[], concurrency: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let failure: { error: unknown } | undefined;

  const worker = async () => {
    for (;;) {
      // once something has failed the rest of the work is thrown away anyway, so stop claiming items.
      if (failure) return;
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = await task(items[index], index);
      } catch (error) {
        // keep the first failure: the ones after it are usually fallout from the same cause.
        failure ??= { error };
        return;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));

  if (failure) throw failure.error;
  return results;
}
