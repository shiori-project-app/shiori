const INLINE_EVENT_HANDLER = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi;
const EPISODE_KEY_PATTERN = /^[a-f0-9]{32}$/;

const parseHtmlWithoutInlineHandlers = (html) =>
  new DOMParser().parseFromString(html.replace(INLINE_EVENT_HANDLER, ''), 'text/html');

export const parseSearchResults = (html) =>
  [...parseHtmlWithoutInlineHandlers(html).querySelectorAll('.similarname a[href*="anime.php?"]')].map((link) => ({
    code: link.getAttribute('href').split('?')[1],
    title: link.textContent.trim(),
  }));

export const parseEpisodes = (html) =>
  [...parseHtmlWithoutInlineHandlers(html).querySelectorAll('a[href="gate.php"][id]')]
    .map((link) => ({ episodeNumber: Number(link.querySelector('.watch2')?.textContent.trim()), key: link.id }))
    .filter((episode) => Number.isFinite(episode.episodeNumber) && EPISODE_KEY_PATTERN.test(episode.key))
    .sort((first, second) => first.episodeNumber - second.episodeNumber);

export const parseDownloadUrl = (html) =>
  [...parseHtmlWithoutInlineHandlers(html).querySelectorAll('a[href*="video.mp4?"]')]
    .find((link) => /download/i.test(link.textContent))
    ?.getAttribute('href') ?? null;
