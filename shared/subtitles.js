const CENTISECONDS_PER_HOUR = 360000;
const CENTISECONDS_PER_MINUTE = 6000;
const CENTISECONDS_PER_SECOND = 100;
const MILLISECONDS_PER_CENTISECOND = 10;
const MILLISECONDS_PER_SECOND = 1000;
const EVENTS_FORMAT = 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text';
const MARKUP_TAGS = /<[^>]+>|\{[^}]*\}/g;

const twoDigits = (number) => String(number).padStart(2, '0');

export const formatAssTime = (milliseconds) => {
  const centiseconds = Math.max(0, Math.round(milliseconds / MILLISECONDS_PER_CENTISECOND));
  const hours = Math.floor(centiseconds / CENTISECONDS_PER_HOUR);
  const minutes = Math.floor((centiseconds % CENTISECONDS_PER_HOUR) / CENTISECONDS_PER_MINUTE);

  const seconds = Math.floor((centiseconds % CENTISECONDS_PER_MINUTE) / CENTISECONDS_PER_SECOND);

  return `${hours}:${twoDigits(minutes)}:${twoDigits(seconds)}.${twoDigits(centiseconds % CENTISECONDS_PER_SECOND)}`;
};

const inPlaybackOrder = (first, second) => first.time - second.time || (first.readOrder ?? 0) - (second.readOrder ?? 0);

const dialogueLine = (event) =>
  `Dialogue: ${event.layer ?? 0},${formatAssTime(event.time)},${formatAssTime(event.time + event.duration)},${event.style ?? 'Default'},` +
  `${event.name ?? ''},${event.marginL ?? 0},${event.marginR ?? 0},${event.marginV ?? 0},${event.effect ?? ''},${event.text ?? ''}`;

const scriptWithEventsSection = (header) => {
  const script = header.replace(/\r\n/g, '\n').trimEnd();

  return /^\[Events\]/im.test(script) ? script : `${script}\n\n[Events]\n${EVENTS_FORMAT}`;
};

export const buildAss = (header, events) =>
  `${scriptWithEventsSection(header)}\n${[...events].sort(inPlaybackOrder).map(dialogueLine).join('\n')}\n`;

export const buildCues = (events) =>
  [...events]
    .sort((first, second) => first.time - second.time)
    .map((event) => ({
      start: event.time / MILLISECONDS_PER_SECOND,
      end: (event.time + event.duration) / MILLISECONDS_PER_SECOND,
      text: (event.text ?? '').replace(MARKUP_TAGS, '').trim(),
    }))
    .filter((cue) => cue.text);
