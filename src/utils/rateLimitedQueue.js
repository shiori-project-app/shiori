const MILLISECONDS_PER_SECOND = 1000;

export const createRateLimitedQueue = ({
  burstSize,
  refillPerSecond: initialRefillPerSecond,
  maxConcurrent,
  backgroundReserve = 0,
  now = Date.now,
}) => {
  const waitingTasks = [];
  const waitingBackgroundTasks = [];

  let refillPerSecond = initialRefillPerSecond;
  let availableTokens = burstSize;

  let lastRefillAt = now();
  let runningCount = 0;

  let pausedUntil = 0;
  let wakeTimer = null;

  const refillTokens = () => {
    const currentTime = now();
    const elapsedSeconds = (currentTime - lastRefillAt) / MILLISECONDS_PER_SECOND;

    availableTokens = Math.min(burstSize, availableTokens + elapsedSeconds * refillPerSecond);
    lastRefillAt = currentTime;
  };

  const nextTaskLane = () =>
    waitingTasks.length
      ? { tasks: waitingTasks, tokensNeeded: 1 }
      : { tasks: waitingBackgroundTasks, tokensNeeded: backgroundReserve + 1 };

  const millisecondsUntilStart = (tokensNeeded) => {
    const pauseRemaining = pausedUntil - now();

    if (pauseRemaining > 0) return pauseRemaining;

    return availableTokens >= tokensNeeded
      ? 0
      : ((tokensNeeded - availableTokens) / refillPerSecond) * MILLISECONDS_PER_SECOND;
  };

  const scheduleWake = (delay) => {
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(startWaitingTasks, delay);
  };

  const startTask = ({ task, resolve, reject }) => {
    availableTokens -= 1;
    runningCount += 1;

    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        runningCount -= 1;
        startWaitingTasks();
      });
  };

  const startWaitingTasks = () => {
    refillTokens();

    const { tasks, tokensNeeded } = nextTaskLane();

    if (!tasks.length || runningCount >= maxConcurrent) return;

    const delay = millisecondsUntilStart(tokensNeeded);

    if (delay > 0) {
      scheduleWake(delay);

      return;
    }

    startTask(tasks.shift());
    startWaitingTasks();
  };

  const schedule = (task, { background = false } = {}) =>
    new Promise((resolve, reject) => {
      (background ? waitingBackgroundTasks : waitingTasks).push({ task, resolve, reject });
      startWaitingTasks();
    });

  const pauseFor = (milliseconds) => {
    pausedUntil = Math.max(pausedUntil, now() + milliseconds);
  };

  const matchServerAllowance = ({ refillPerSecond: serverRefillPerSecond, remaining }) => {
    refillTokens();
    refillPerSecond = serverRefillPerSecond;
    availableTokens = Math.min(availableTokens, remaining);
  };

  return { schedule, pauseFor, matchServerAllowance };
};
