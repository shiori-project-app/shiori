export const chunk = (items, chunkSize) =>
  Array.from({ length: Math.ceil(items.length / chunkSize) }, (_, chunkIndex) =>
    items.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize),
  );

export const uniqueBy = (items, keyOf) => {
  const seenKeys = new Set();

  return items.filter((item) => {
    const key = keyOf(item);

    if (seenKeys.has(key)) return false;

    seenKeys.add(key);

    return true;
  });
};

export const sum = (numbers) => numbers.reduce((total, number) => total + number, 0);

export const takeWhile = (items, predicate) => {
  const firstFailingIndex = items.findIndex((item) => !predicate(item));

  return firstFailingIndex === -1 ? items : items.slice(0, firstFailingIndex);
};

export const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
