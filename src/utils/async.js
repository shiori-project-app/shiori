export const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const rememberRequest = (requests, key, startRequest) => {
  if (!requests.has(key)) {
    const request = startRequest();

    requests.set(key, request);
    request.catch(() => requests.delete(key));
  }

  return requests.get(key);
};

export const mapSequentially = (items, mapItem) =>
  items.reduce(
    async (previousResults, item, index) => [...(await previousResults), await mapItem(item, index)],
    Promise.resolve([]),
  );

export const findSequentially = (items, findResult) =>
  items.reduce(
    async (previousResult, item) => (await previousResult) ?? (await findResult(item)),
    Promise.resolve(null),
  );
