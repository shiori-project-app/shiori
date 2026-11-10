# Changelog

Every version of Shiori and what changed in it. The newest is first. The release notes on GitHub come from this file.

## Unreleased

### Added

- **Real resolution:** finished downloads and downloaded episodes show the resolution read from the file, such as 1080p. It works for MP4, MKV and WebM files from any source.

### Fixed

- The AnimeHeaven picker and tracking list no longer claim 1080p, because AnimeHeaven doesn't say what it serves.
- Rating stars now line up with the text beside them on the home slideshow, poster cards, compact rows and season cards.

## 1.0.0

The first release.

### Discover

- **Home:** a slideshow of trending shows, Continue Watching, Latest Episodes, and lists for Newest, Popular, Top rated, Top Airing, Upcoming, Top Movies and Just Finished.
- **Top Trending:** ranked for today, this week or this month.
- **Airing schedule:** what's airing each day of the week, in your time zone.
- **Browse:** filter by genre, format, status, season and year, and sort by trending, popularity, rating, date or title.
- **Search** with title suggestions as you type.
- **Seasonal chart:** any season's shows, split into TV, ONA, Shorts, Movies, OVA and continuing shows, with sorting by popularity, rating, airing time, start date or title.
- **Surprise me:** jump to a random show.
- **Show pages:** synopsis, score, studio, airing status, the next episode's time and "You May Also Like" recommendations. Share a show by copying its AniList link.
- **Watch order:** see a franchise's seasons, films and OVAs in order, with your progress.
- **Title language:** show titles in English, romaji or Japanese.
- **Content filter:** hide ecchi titles if you prefer.

### Your library

- **My List:** organize shows as Watching, Planning, Completed, Paused or Dropped.
- **Stats:** hours, episodes and shows watched, your top genres and episodes per month.
- **Watched episodes:** marked automatically at 90%, or by hand.
- **History:** pick up where you left off.
- **Notes:** keep your own notes on any episode.
- **Import:** bring in a public AniList or MyAnimeList list using just the username. You never sign in.
- **Export:** save your list as a MyAnimeList XML file, which both AniList and MyAnimeList can import.
- **Backups:** save your list, history, notes, tracked shows and settings to a file and restore them later. Shiori backs up your current data first.

### Watching

- **Your own files:** Shiori matches the episodes in your download folder to the right show and season, even when a release numbers across seasons. You can link any file or folder it doesn't recognise by hand.
- **Subtitles:** embedded subtitles with their original styling, and your preferred choice is remembered.
- **Audio tracks:** switch between them, and your preferred language is remembered.
- **Skip intros and endings** with one click or automatically, with marks on the seek bar.
- **Resume** from where you stopped, and **autoplay** the next episode after a short countdown.
- **Playback speed** from 0.5× to 2×, and your volume is remembered.
- **Fullscreen, theater mode and picture-in-picture,** plus keyboard shortcuts.
- **Hide spoilers:** blur the thumbnails and names of episodes you haven't watched until you hover over them.
- **Episodes open paused,** so nothing starts until you press play.
- **Your default player:** open a file there if the app can't play it, or show it in its folder.

### Downloads

Shiori finds episodes from three sources, and you choose which to use:

- **AnimeHeaven:** direct downloads. Pick a range of episodes and add them to the queue.
- **SubsPlease:** torrent releases by episode or whole season, in 1080p, 720p or 480p.
- **Nyaa:** torrent search with automatic queries you can edit, filters for resolution, English dub and trusted uploaders, and sizes and seeders for each result.

Torrents go to [qBittorrent](https://www.qbittorrent.org/) or your system's magnet handler, or you can copy the magnet link. Shiori never downloads torrents itself.

- **Download queue:** pause, resume, cancel, retry and reorder, or pause and resume everything at once. Unfinished downloads continue after a restart.
- **Your limits:** 1 to 5 downloads at once, an optional speed limit, and your choice of download folder.
- **Tracking:** new episodes of the shows you follow can download by themselves, from the source and quality you choose. Pick only new episodes, or any you're missing too. Shiori sends a system notification when something happens.
- **Clean up watched episodes:** after 7 to 90 days, send them to the Recycle Bin or Trash, or move them to another folder. You review the exact files first, with a disk usage readout.

### The app

- **Offline mode:** your shows, covers, episode names and skip times stay available without a connection.
- **20 themes** across Shiori, Catppuccin, Tokyo Night, Kanagawa, Rosé Pine, Dracula and Nord, each with its own accent colours.
- **Reduce motion:** turn off animations, or follow your system's setting.
- **Smoother scrolling and faster seeking:** an optional graphics mode for PCs where the app feels choppy.
- **System tray and start at login,** so tracking keeps running in the background.
- **Storage:** see how much space the subtitle cache and saved AniList data use, and clear them.
- **Updates:** Shiori checks for a new version each time it opens and asks before downloading. You can turn on automatic downloads in Settings → Updates. The Linux tar.gz doesn't update itself.
