import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimitedQueue } from '@/utils/rateLimitedQueue';

const deferredTask = () => {
  let finishTask;
  const task = vi.fn(() => new Promise((resolve) => (finishTask = resolve)));

  return { task, finish: (value) => finishTask(value) };
};

describe('createRateLimitedQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs a burst straight away, then waits for tokens to refill', async () => {
    const queue = createRateLimitedQueue({ burstSize: 2, refillPerSecond: 1, maxConcurrent: 10, now: Date.now });
    const results = [1, 2, 3].map((number) => queue.schedule(() => number));

    await vi.advanceTimersByTimeAsync(0);
    await expect(Promise.race([results[2], 'still waiting'])).resolves.toBe('still waiting');
    await vi.advanceTimersByTimeAsync(1000);
    await expect(Promise.all(results)).resolves.toEqual([1, 2, 3]);
  });

  it('never runs more tasks at once than allowed', async () => {
    const queue = createRateLimitedQueue({ burstSize: 10, refillPerSecond: 10, maxConcurrent: 1, now: Date.now });
    const first = deferredTask();

    const second = deferredTask();

    queue.schedule(first.task);
    queue.schedule(second.task);
    await vi.advanceTimersByTimeAsync(0);
    expect(first.task).toHaveBeenCalled();
    expect(second.task).not.toHaveBeenCalled();
    first.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(second.task).toHaveBeenCalled();
  });

  it('holds every task while paused after a rate-limit answer', async () => {
    const queue = createRateLimitedQueue({ burstSize: 10, refillPerSecond: 10, maxConcurrent: 10, now: Date.now });

    queue.pauseFor(5000);

    const task = vi.fn(() => 'done');
    const result = queue.schedule(task);

    await vi.advanceTimersByTimeAsync(4000);
    expect(task).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toBe('done');
  });

  it('slows down to the rate the server advertises', async () => {
    const queue = createRateLimitedQueue({ burstSize: 1, refillPerSecond: 10, maxConcurrent: 10, now: Date.now });

    queue.matchServerAllowance({ refillPerSecond: 0.5, remaining: 0 });

    const task = vi.fn(() => 'done');
    const result = queue.schedule(task);

    await vi.advanceTimersByTimeAsync(1900);
    expect(task).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe('done');
  });

  it('never gains tokens just because the server has more left', async () => {
    const queue = createRateLimitedQueue({ burstSize: 1, refillPerSecond: 1, maxConcurrent: 10, now: Date.now });

    queue.matchServerAllowance({ refillPerSecond: 1, remaining: 50 });

    const tasks = [vi.fn(), vi.fn()];

    tasks.forEach((task) => queue.schedule(task));
    await vi.advanceTimersByTimeAsync(0);
    expect(tasks[0]).toHaveBeenCalled();
    expect(tasks[1]).not.toHaveBeenCalled();
  });

  it('runs tasks someone is waiting on before queued background tasks', async () => {
    const queue = createRateLimitedQueue({ burstSize: 10, refillPerSecond: 1, maxConcurrent: 1, now: Date.now });
    const runningTask = deferredTask();

    const startOrder = [];

    queue.schedule(runningTask.task);
    queue.schedule(() => startOrder.push('background'), { background: true });
    queue.schedule(() => startOrder.push('waited on'));
    await vi.advanceTimersByTimeAsync(0);
    runningTask.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(startOrder).toEqual(['waited on', 'background']);
  });

  it('keeps the reserve away from background tasks but not from tasks someone is waiting on', async () => {
    const queue = createRateLimitedQueue({
      burstSize: 3,
      refillPerSecond: 1,
      maxConcurrent: 10,
      backgroundReserve: 2,
      now: Date.now,
    });

    const backgroundTasks = [vi.fn(), vi.fn()];

    backgroundTasks.forEach((task) => queue.schedule(task, { background: true }));
    await vi.advanceTimersByTimeAsync(0);
    expect(backgroundTasks[0]).toHaveBeenCalled();
    expect(backgroundTasks[1]).not.toHaveBeenCalled();

    const waitedOnTasks = [vi.fn(), vi.fn()];

    waitedOnTasks.forEach((task) => queue.schedule(task));
    await vi.advanceTimersByTimeAsync(0);
    expect(waitedOnTasks[0]).toHaveBeenCalled();
    expect(waitedOnTasks[1]).toHaveBeenCalled();
    expect(backgroundTasks[1]).not.toHaveBeenCalled();
  });

  it('starts a background task once tokens have refilled above the reserve', async () => {
    const queue = createRateLimitedQueue({
      burstSize: 2,
      refillPerSecond: 1,
      maxConcurrent: 10,
      backgroundReserve: 1,
      now: Date.now,
    });

    queue.matchServerAllowance({ refillPerSecond: 1, remaining: 0 });

    const task = vi.fn();

    queue.schedule(task, { background: true });
    await vi.advanceTimersByTimeAsync(1900);
    expect(task).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(task).toHaveBeenCalled();
  });

  it('wakes early for a waited-on task instead of waiting out a long background delay', async () => {
    const queue = createRateLimitedQueue({
      burstSize: 20,
      refillPerSecond: 1,
      maxConcurrent: 10,
      backgroundReserve: 19,
      now: Date.now,
    });

    queue.matchServerAllowance({ refillPerSecond: 1, remaining: 0 });

    const backgroundTask = vi.fn();

    queue.schedule(backgroundTask, { background: true });

    const waitedOnTask = vi.fn();

    queue.schedule(waitedOnTask);
    await vi.advanceTimersByTimeAsync(1000);
    expect(waitedOnTask).toHaveBeenCalled();
    expect(backgroundTask).not.toHaveBeenCalled();
  });

  it('passes failures on to the caller', async () => {
    const queue = createRateLimitedQueue({ burstSize: 1, refillPerSecond: 1, maxConcurrent: 1, now: Date.now });
    const result = queue.schedule(() => Promise.reject(new Error('offline')));

    await expect(result).rejects.toThrow('offline');
  });
});
