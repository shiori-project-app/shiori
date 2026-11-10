const BITS_PER_BYTE = 8;
const BYTE_VALUES = 256;

export const MATROSKA_IDS = {
  segment: 0x18538067,
  tracks: 0x1654ae6b,
  cluster: 0x1f43b675,
  trackEntry: 0xae,
  trackType: 0x83,
};

export const MAX_ELEMENT_HEADER_BYTES = 12;
export const MAX_TRACKS_BYTES = 64 * 1024 * 1024;

const variableLengthOf = (firstByte) => (firstByte === 0 ? 0 : Math.clz32(firstByte) - 23);

const readElementId = (bytes, offset) => {
  const length = variableLengthOf(bytes[offset]);

  if (length === 0 || length > 4 || offset + length > bytes.length) return null;

  return { value: bytes.readUIntBE(offset, length), length };
};

export const readElementSize = (bytes, offset) => {
  const length = variableLengthOf(bytes[offset]);

  if (length === 0 || offset + length > bytes.length) return null;

  const valueBitsInFirstByte = BITS_PER_BYTE - length;
  const firstValueBits = bytes[offset] & ((1 << valueBitsInFirstByte) - 1);
  let value = firstValueBits;

  let hasOnlySetBits = firstValueBits === (1 << valueBitsInFirstByte) - 1;

  for (let index = 1; index < length; index += 1) {
    value = value * BYTE_VALUES + bytes[offset + index];
    hasOnlySetBits &&= bytes[offset + index] === BYTE_VALUES - 1;
  }

  return { value: hasOnlySetBits ? null : value, length };
};

export const readElementHeader = (bytes, offset) => {
  const id = readElementId(bytes, offset);

  if (!id) return null;

  const size = readElementSize(bytes, offset + id.length);

  if (!size) return null;

  return { id: id.value, size: size.value, headerLength: id.length + size.length };
};

export const readUnsigned = (bytes) => bytes.reduce((total, byte) => total * BYTE_VALUES + byte, 0);

export const childElements = (bytes) => {
  const children = [];
  let offset = 0;

  while (offset < bytes.length) {
    const header = readElementHeader(bytes, offset);

    if (!header || header.size === null) break;

    const start = offset + header.headerLength;

    children.push({ id: header.id, data: bytes.subarray(start, start + header.size) });
    offset = start + header.size;
  }

  return children;
};

export const findChild = (children, id) => children.find((child) => child.id === id)?.data;
