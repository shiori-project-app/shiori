import { describe, expect, it } from 'vitest';
import { createSeekCoalescer } from '@/utils/seekCoalescer';

const createFakeVideo = () => {
  const seekTargets = [];

  const video = {
    seeking: false,
    seekTargets,

    set currentTime(seconds) {
      seekTargets.push(seconds);
      video.seeking = true;
    },

    finishSeek: () => {
      video.seeking = false;
    },
  };

  return video;
};

const coalescerFor = (video) => createSeekCoalescer(() => video);

describe('createSeekCoalescer', () => {
  it('seeks straight away when nothing is in progress', () => {
    const video = createFakeVideo();

    coalescerFor(video).seekTo(10);
    expect(video.seekTargets).toEqual([10]);
  });

  it('keeps only the latest target while a seek is running', () => {
    const video = createFakeVideo();
    const coalescer = coalescerFor(video);

    [10, 20, 30, 40].forEach(coalescer.seekTo);
    expect(video.seekTargets).toEqual([10]);
    expect(coalescer.hasWaitingSeek()).toBe(true);
  });

  it('jumps to the latest target when the running seek finishes, then stops', () => {
    const video = createFakeVideo();
    const coalescer = coalescerFor(video);

    [10, 20, 30].forEach(coalescer.seekTo);
    video.finishSeek();
    coalescer.applyWaitingSeek();
    expect(video.seekTargets).toEqual([10, 30]);
    expect(coalescer.hasWaitingSeek()).toBe(false);
    video.finishSeek();
    coalescer.applyWaitingSeek();
    expect(video.seekTargets).toEqual([10, 30]);
  });

  it('drops the waiting target when the video is replaced', () => {
    const video = createFakeVideo();
    const coalescer = coalescerFor(video);

    [10, 20].forEach(coalescer.seekTo);
    coalescer.forgetWaitingSeek();
    video.finishSeek();
    coalescer.applyWaitingSeek();
    expect(video.seekTargets).toEqual([10]);
  });
});
