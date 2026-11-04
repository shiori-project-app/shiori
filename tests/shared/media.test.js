import { describe, expect, it } from 'vitest';
import { parseByteRange } from '@shared/byteRange';
import { buildAss, buildCues, formatAssTime } from '@shared/subtitles';

describe('parseByteRange', () => {
  const size = 1000;

  it('reads open, closed and suffix ranges', () => {
    expect(parseByteRange('bytes=0-', size)).toEqual({ start: 0, end: 999 });
    expect(parseByteRange('bytes=100-199', size)).toEqual({ start: 100, end: 199 });
    expect(parseByteRange('bytes=-300', size)).toEqual({ start: 700, end: 999 });
  });

  it('clamps the end to the file and uses the first of several ranges', () => {
    expect(parseByteRange('bytes=900-5000', size)).toEqual({ start: 900, end: 999 });
    expect(parseByteRange('bytes=0-9, 20-29', size)).toEqual({ start: 0, end: 9 });
  });

  it('sends the whole file without a usable header, and rejects ranges past the end', () => {
    expect(parseByteRange(null, size)).toBeNull();
    expect(parseByteRange('items=0-1', size)).toBeNull();
    expect(parseByteRange('bytes=1000-', size)).toBe('invalid');
    expect(parseByteRange('bytes=500-100', size)).toBe('invalid');
  });
});

describe('subtitles', () => {
  it('formats ASS times', () => {
    expect(formatAssTime(0)).toBe('0:00:00.00');
    expect(formatAssTime(3_723_450)).toBe('1:02:03.45');
  });

  it('builds a full ASS script in time order, adding [Events] when the header lacks it', () => {
    const header = '[Script Info]\r\nPlayResX: 1920\r\n\r\n[V4+ Styles]\r\nStyle: Default,Arial,60';

    const ass = buildAss(header, [
      {
        time: 5000,
        duration: 1500,
        layer: 0,
        style: 'Default',
        name: '',
        marginL: 0,
        marginR: 0,
        marginV: 0,
        effect: '',
        text: 'Second',
      },

      {
        time: 1000,
        duration: 2000,
        layer: 1,
        style: 'Sign',
        name: 'Rudy',
        marginL: 10,
        marginR: 10,
        marginV: 20,
        effect: '',
        text: '{\\an8}First, with, commas',
      },
    ]);

    expect(ass).toContain('[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');

    const dialogue = ass.split('\n').filter((l) => l.startsWith('Dialogue:'));

    expect(dialogue).toEqual([
      'Dialogue: 1,0:00:01.00,0:00:03.00,Sign,Rudy,10,10,20,,{\\an8}First, with, commas',
      'Dialogue: 0,0:00:05.00,0:00:06.50,Default,,0,0,0,,Second',
    ]);

    expect(ass).not.toContain('\r');
  });

  it('keeps an existing [Events] section', () => {
    const ass = buildAss(
      '[Script Info]\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
      [],
    );

    expect(ass.match(/\[Events\]/g)).toHaveLength(1);
  });

  it('turns text tracks into plain cues', () => {
    expect(
      buildCues([
        { time: 2500, duration: 1000, text: '<i>Later</i>' },
        { time: 500, duration: 1000, text: 'First' },
        { time: 9000, duration: 500, text: '<b></b>' },
      ]),
    ).toEqual([
      { start: 0.5, end: 1.5, text: 'First' },
      { start: 2.5, end: 3.5, text: 'Later' },
    ]);
  });
});
