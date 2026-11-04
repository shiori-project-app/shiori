# The `series` object

`mapMedia` in `src/api/mappers/mediaMapper.js` builds this object from an AniList `Media`, and `seriesRegistry.js` caches it for the session.

- `id` is the AniList id, and `malId` is the MyAnimeList id or null.
- `title` is the English title, falling back to romaji. `romajiTitle`, `englishTitle`, `nativeTitle` and `synonyms` hold the rest.
- `genres` (trimmed), `isEcchi`, `format` (`TV`, `MOVIE`, `ONA` and so on), `studio` and `synopsis` describe the show.
- `year`, the `season` label, `startedAt` and `endedAt` (in milliseconds) and `releaseKey` describe when it aired.
- `status` is a value such as `Airing`, `Upcoming` or finished. `totalEpisodes` may be null, and `released` is the number of episodes out so far.
- `nextEpisode` and `nextAiringAt` (in seconds) describe the next airing.
- `rating` (0–10) and `popularity` come from AniList.
- `cover`, `coverLarge` and `banner` are image URLs, and `duration` is seconds per episode.
- `hasPrequel` and `hasSequel` are season relations used by episode numbering. `hasWatchOrder` is true for any anime franchise relation (`isFranchiseEdge` in `utils/watchOrder.js`), and is missing on older saved copies.
- `streamingEpisodes` holds the titles and thumbnails AniList knows about.
- `isOfflineCopy` exists only on saved copies served offline. On those copies, `cover` and `coverLarge` point at `shiori-media://cover/<id>` and `banner` is null.

Episodes are identified as `"<seriesId>-<episodeNumber>"`. See `episodeId` and `parseEpisodeId` in `utils/episodes.js`.
