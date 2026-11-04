const MAL_STATUS_NAMES = {
  watching: 'Watching',
  planning: 'Plan to Watch',
  completed: 'Completed',
  paused: 'On-Hold',
  dropped: 'Dropped',
};

const XML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

const escapeXml = (text) => String(text).replace(/[&<>"']/g, (character) => XML_ENTITIES[character]);

const watchedEpisodeCount = ({ series, status, watched = [] }) => {
  const furthestWatched = Math.max(0, ...watched);

  return status === 'completed' ? (series.totalEpisodes ?? furthestWatched) : furthestWatched;
};

const animeEntryXml = (entry) =>
  [
    '  <anime>',
    `    <series_animedb_id>${entry.series.malId}</series_animedb_id>`,
    `    <series_title>${escapeXml(entry.series.romajiTitle || entry.series.title)}</series_title>`,
    `    <my_watched_episodes>${watchedEpisodeCount(entry)}</my_watched_episodes>`,
    `    <my_status>${MAL_STATUS_NAMES[entry.status] ?? MAL_STATUS_NAMES.planning}</my_status>`,
    '    <my_score>0</my_score>',
    '    <update_on_import>1</update_on_import>',
    '  </anime>',
  ].join('\n');

export const toMalXml = (entries) => {
  const exportable = entries.filter((entry) => entry.series.malId);
  const skipped = entries.filter((entry) => !entry.series.malId).map((entry) => entry.series.title);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8" ?>',
    '<myanimelist>',
    '  <myinfo>',
    '    <user_export_type>1</user_export_type>',
    `    <user_total_anime>${exportable.length}</user_total_anime>`,
    '  </myinfo>',
    ...exportable.map(animeEntryXml),
    '</myanimelist>',
    '',
  ].join('\n');

  return { xml, count: exportable.length, skipped };
};
