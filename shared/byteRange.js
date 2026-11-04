const RANGE_HEADER = /^bytes=(\d*)-(\d*)/;
export const UNSATISFIABLE_RANGE = 'invalid';

const rangeBounds = (startText, endText, fileSize) => {
  const lastByte = fileSize - 1;

  if (startText === '') return { start: Math.max(0, fileSize - Number(endText)), end: lastByte };

  return { start: Number(startText), end: endText === '' ? lastByte : Math.min(Number(endText), lastByte) };
};

export const parseByteRange = (header, fileSize) => {
  const match = RANGE_HEADER.exec(header ?? '');

  if (!match) return null;

  const [, startText, endText] = match;

  if (startText === '' && endText === '') return null;

  const { start, end } = rangeBounds(startText, endText, fileSize);

  return start >= fileSize || start > end ? UNSATISFIABLE_RANGE : { start, end };
};
