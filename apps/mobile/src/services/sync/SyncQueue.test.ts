import type Database from '@nozbe/watermelondb/Database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDeterministicClock,
  createTestDatabase,
  resetDatabase,
} from '../../database/repositories/__tests__/test-helpers';
import { SyncQueue, type SyncQueueChange } from './SyncQueue';

describe('SyncQueue', () => {
  let database: Database;
  let queue: SyncQueue;

  beforeEach(async () => {
    database = createTestDatabase();
    await resetDatabase(database);
    const clock = createDeterministicClock();
    queue = new SyncQueue(database, { now: clock.next });
  });

  it('persists enqueued operations and reports counts', async () => {
    await queue.enqueue({
      table: 'clients',
      recordId: 'client-1',
      operation: 'create',
      payload: { firstName: 'A' },
    });

    await queue.enqueue({
      table: 'visits',
      recordId: 'visit-1',
      operation: 'update',
      payload: { status: 'completed' },
    });

    const pending = await queue.list();
    expect(pending).toHaveLength(2);
    expect(pending[0]).toMatchObject({
      table: 'clients',
      recordId: 'client-1',
      operation: 'create',
      payload: { firstName: 'A' },
      priority: 'normal',
    });
    expect(pending[1]).toMatchObject({
      table: 'visits',
      recordId: 'visit-1',
      operation: 'update',
      payload: { status: 'completed' },
      priority: 'normal',
    });
    expect(await queue.count()).toBe(2);
  });

  it('supports bounded list queries via limit parameter', async () => {
    for (let i = 0; i < 5; i += 1) {
      await queue.enqueue({
        table: 'clients',
        recordId: `client-${i}`,
        operation: 'create',
        payload: { index: i },
      });
    }

    expect(await queue.list(0)).toEqual([]);

    const firstTwo = await queue.list(2);
    expect(firstTwo).toHaveLength(2);
    expect(firstTwo.map((item) => item.recordId)).toEqual(['client-0', 'client-1']);

    const all = await queue.list();
    expect(all).toHaveLength(5);
  });

  it('dequeues critical operations before normal ones', async () => {
    await queue.enqueue({
      table: 'clients',
      recordId: 'client-1',
      operation: 'delete',
      priority: 'critical',
    });

    await queue.enqueue({
      table: 'visits',
      recordId: 'visit-1',
      operation: 'update',
      payload: { status: 'in_progress' },
    });

    await queue.enqueue({
      table: 'medications',
      recordId: 'med-1',
      operation: 'create',
    });

    const first = await queue.dequeue();
    const second = await queue.dequeue();
    const third = await queue.dequeue();

    expect(first?.recordId).toBe('client-1');
    expect(second?.recordId).toBe('visit-1');
    expect(third?.recordId).toBe('med-1');
    expect(await queue.dequeue()).toBeNull();
  });

  it('peeks without removal and clears entries', async () => {
    await queue.enqueue({
      table: 'visits',
      recordId: 'visit-42',
      operation: 'update',
    });

    const peeked = await queue.peek();
    expect(peeked?.recordId).toBe('visit-42');
    expect(await queue.count()).toBe(1);

    await queue.clear();
    expect(await queue.count()).toBe(0);
    expect(await queue.peek()).toBeNull();
  });

  it('handles concurrent enqueue and dequeue operations without losing data', async () => {
    const totalEnqueues = 20;
    const totalDequeues = 12;
    const tasks: Array<Promise<void | SyncQueueChange | null>> = [];

    for (let i = 0; i < totalEnqueues; i += 1) {
      tasks.push(
        queue.enqueue({
          table: i % 2 === 0 ? 'clients' : 'visits',
          recordId: `concurrent-${i}`,
          operation: i % 2 === 0 ? 'create' : 'update',
          payload: { index: i },
          priority: i % 5 === 0 ? 'critical' : 'normal',
        }),
      );
    }

    for (let i = 0; i < totalDequeues; i += 1) {
      tasks.push(queue.dequeue());
    }

    const results = await Promise.all(tasks);
    const dequeueResults = results.slice(totalEnqueues);
    const successfulDequeues = dequeueResults.filter(
      (change): change is SyncQueueChange => change !== null,
    );

    const remaining = await queue.list();
    const observedIds = new Set([
      ...successfulDequeues.map((change) => change.recordId),
      ...remaining.map((change) => change.recordId),
    ]);

    expect(observedIds.size).toBe(totalEnqueues);
    expect(await queue.count()).toBe(totalEnqueues - successfulDequeues.length);
  });

  it('preserves duplicate record order when multiple operations share the same record', async () => {
    await queue.enqueue({
      table: 'visits',
      recordId: 'visit-123',
      operation: 'update',
      payload: { status: 'in_progress' },
    });

    await queue.enqueue({
      table: 'visits',
      recordId: 'visit-123',
      operation: 'delete',
      payload: { reason: 'cancelled' },
    });

    const pending = await queue.list();
    expect(pending).toHaveLength(2);
    expect(pending[0].operation).toBe('update');
    expect(pending[1].operation).toBe('delete');

    const first = await queue.dequeue();
    const second = await queue.dequeue();
    expect(first?.operation).toBe('update');
    expect(second?.operation).toBe('delete');
    expect(await queue.count()).toBe(0);
  });

  it('propagates database errors encountered during enqueue and dequeue', async () => {
    const writeSpy = vi.spyOn(database, 'write');

    writeSpy.mockImplementationOnce(() => Promise.reject(new Error('enqueue failure')));
    await expect(
      queue.enqueue({
        table: 'clients',
        recordId: 'client-error',
        operation: 'create',
      }),
    ).rejects.toThrow('enqueue failure');

    writeSpy.mockRestore();
    await queue.enqueue({
      table: 'clients',
      recordId: 'client-ok',
      operation: 'create',
    });

    const dequeueSpy = vi.spyOn(database, 'write').mockImplementationOnce(() =>
      Promise.reject(new Error('dequeue failure')),
    );

    await expect(queue.dequeue()).rejects.toThrow('dequeue failure');
    dequeueSpy.mockRestore();

    const internalQueue = queue as unknown as {
      collection: { query: () => unknown };
    };
    const querySpy = vi.spyOn(internalQueue.collection, 'query').mockImplementation(() => {
      throw new Error('list failure');
    });
    await expect(queue.list()).rejects.toThrow('list failure');
    querySpy.mockRestore();
  });

  it('handles large queues and maintains accurate counts and ordering', async () => {
    const totalEntries = 120;
    for (let i = 0; i < totalEntries; i += 1) {
      await queue.enqueue({
        table: i % 2 === 0 ? 'clients' : 'visits',
        recordId: `bulk-${i}`,
        operation: 'create',
        priority: i % 7 === 0 ? 'critical' : 'normal',
        payload: { index: i },
      });
    }

    const pending = await queue.list();
    expect(pending).toHaveLength(totalEntries);
    expect(new Set(pending.map((entry) => entry.recordId)).size).toBe(totalEntries);
    expect(await queue.count()).toBe(totalEntries);

    const priorities = pending.map((entry) => entry.priority);
    const firstNormalIndex = priorities.findIndex((priority) => priority === 'normal');
    if (firstNormalIndex > -1) {
      expect(priorities.slice(0, firstNormalIndex).every((priority) => priority === 'critical')).toBe(
        true,
      );
    }
  });
});
