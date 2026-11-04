import { ipcMain, net } from 'electron';

const READABLE_HOSTS = new Set(['nyaa.si', 'animeheaven.me', 'myanimelist.net', 'subsplease.org']);
const PAGE_READ_TIMEOUT_MS = 20000;

const assertReadableUrl = (target) => {
  if (target.protocol !== 'https:' || !READABLE_HOSTS.has(target.hostname)) {
    throw new Error(`Shiori can't read ${target.hostname}`);
  }
};

const fetchPageText = async (_event, { url, cookie }) => {
  const target = new URL(url);

  assertReadableUrl(target);

  const response = await net
    .fetch(target.toString(), {
      headers: cookie ? { Cookie: cookie } : {},
      signal: AbortSignal.timeout(PAGE_READ_TIMEOUT_MS),
    })
    .catch((error) => {
      throw error.name === 'TimeoutError' ? new Error(`${target.hostname} didn't respond in time`) : error;
    });

  if (!response.ok) throw new Error(`${target.hostname} responded with ${response.status}`);

  return response.text();
};

export const registerNetworkHandlers = () => {
  ipcMain.handle('net:fetch-text', fetchPageText);
};
