import { describe, expect, it } from 'vitest';
import { LayerHistory } from '~/history';
import type { HistoryBackend, HistoryPackedSnapshot, HistoryTarget } from '~/history';

/**
 * packing a stack runs several snapshots at once, and one of them failing does not stop the rest: they are
 * already reading. these cover that the export stays open until those reads are done, so the caller's
 * cleanup - and the disposals LayerHistory holds back for it - cannot land on a snapshot still in use.
 */

type Snapshot = { id: number };

const bounds = { x: 0, y: 0, width: 1, height: 1 };
const size = { width: 1, height: 1 };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** @description a backend whose packing this test drives by hand, one snapshot at a time. */
function makeControlledBackend() {
  const started: number[] = [];
  const disposed: number[] = [];
  const gates = new Map<number, ReturnType<typeof deferred<HistoryPackedSnapshot>>>();

  const backend: HistoryBackend<Snapshot> = {
    capture: () => ({ id: -1 }),
    apply: () => {},
    exportRaw: () => ({ bounds, size, buffer: new Uint8Array(4) }),
    importRaw: () => ({ id: -1 }),
    importPacked: () => ({ id: -1 }),
    exportPacked: (_target, snapshot) => {
      started.push(snapshot.id);
      const gate = deferred<HistoryPackedSnapshot>();
      gates.set(snapshot.id, gate);
      return gate.promise;
    },
    disposeSnapshot: (_target, snapshot) => {
      disposed.push(snapshot.id);
    },
  };

  return {
    backend,
    started,
    disposed,
    finish: (id: number) => gates.get(id)!.resolve({ bounds, size, deflated: new Uint8Array(4) }),
    fail: (id: number, error: unknown) => gates.get(id)!.reject(error),
  };
}

/** @description whether a promise has settled, without settling the test on it. */
function settledState(promise: Promise<unknown>) {
  const state = { done: false };
  promise.then(
    () => (state.done = true),
    () => (state.done = true)
  );
  return state;
}

/** @description let every already-resolved continuation run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const target = {} as HistoryTarget;

describe('History (packing failures)', () => {
  it('waits for the snapshots still packing before it reports the failure', async () => {
    const controlled = makeControlledBackend();
    const history = new LayerHistory<Snapshot>(target, controlled.backend, 16);
    for (let id = 0; id < 6; id++) history.push({ id });

    const exporting = history.exportPacked();
    const state = settledState(exporting);
    await flush();

    // four run at once, so the two that have not been claimed yet are still waiting on those.
    expect(controlled.started).toEqual([0, 1, 2, 3]);

    const failure = new Error('readback lost');
    controlled.fail(1, failure);
    controlled.finish(0);
    controlled.finish(3);
    await flush();

    // one snapshot is still reading. reporting the failure now would hand the caller back its layers.
    expect(state.done).toBe(false);
    // and nothing new is claimed once the result is going to be thrown away.
    expect(controlled.started).toEqual([0, 1, 2, 3]);

    controlled.finish(2);
    await expect(exporting).rejects.toBe(failure);
  });

  it('holds disposal of snapshots dropped mid-pack until the failed export is done', async () => {
    const controlled = makeControlledBackend();
    const history = new LayerHistory<Snapshot>(target, controlled.backend, 16);
    for (let id = 0; id < 6; id++) history.push({ id });

    const exporting = history.exportPacked();
    await flush();

    // this is what opening another project does to a layer whose snapshots are still being read.
    history.clear();
    expect(controlled.disposed).toEqual([]);

    controlled.fail(1, new Error('readback lost'));
    controlled.finish(0);
    controlled.finish(3);
    await flush();
    expect(controlled.disposed).toEqual([]);

    controlled.finish(2);
    await expect(exporting).rejects.toThrow('readback lost');
    expect(controlled.disposed).toHaveLength(6);
  });
});
