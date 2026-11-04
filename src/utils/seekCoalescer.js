const NO_TARGET = null;

export const createSeekCoalescer = (getVideo) => {
  let waitingTarget = NO_TARGET;

  return {
    seekTo: (seconds) => {
      const video = getVideo();

      if (video.seeking) waitingTarget = seconds;
      else video.currentTime = seconds;
    },

    applyWaitingSeek: () => {
      if (waitingTarget === NO_TARGET) return;

      const target = waitingTarget;

      waitingTarget = NO_TARGET;
      getVideo().currentTime = target;
    },

    hasWaitingSeek: () => waitingTarget !== NO_TARGET,

    forgetWaitingSeek: () => {
      waitingTarget = NO_TARGET;
    },
  };
};
