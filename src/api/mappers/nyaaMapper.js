import { NYAA_TRACKERS } from '@/config/api.config';

const NYAA_NAMESPACE = 'https://nyaa.si/xmlns/nyaa';
const RESOLUTION_PATTERN = /\b(2160|1080|720|480)p\b/i;

const buildMagnet = (infoHash, name) =>
  `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}` +
  NYAA_TRACKERS.map((tracker) => `&tr=${encodeURIComponent(tracker)}`).join('');

const toTorrent = (item) => {
  const nyaaField = (name) =>
    [...item.children].find((child) => child.namespaceURI === NYAA_NAMESPACE && child.localName === name)
      ?.textContent ?? '';

  const title = item.querySelector('title')?.textContent ?? '';
  const infoHash = nyaaField('infoHash');

  return {
    id: infoHash,
    title,
    size: nyaaField('size'),
    seeders: Number(nyaaField('seeders')) || 0,
    leechers: Number(nyaaField('leechers')) || 0,
    trusted: nyaaField('trusted') === 'Yes',
    publishedAt: Date.parse(item.querySelector('pubDate')?.textContent ?? '') || null,
    pageUrl: item.querySelector('guid')?.textContent ?? '',
    resolution: RESOLUTION_PATTERN.exec(title)?.[1] ?? null,
    magnet: infoHash ? buildMagnet(infoHash, title) : '',
  };
};

export const parseNyaaRss = (xml) =>
  [...new DOMParser().parseFromString(xml, 'application/xml').querySelectorAll('item')]
    .map(toTorrent)
    .filter((torrent) => torrent.id);
