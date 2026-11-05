<p align="center">
  <img src="build/icon.png" alt="Shiori icon" width="112" />
</p>

<h1 align="center">Shiori</h1>

<p align="center">
  <b>Track what you watch, find new episodes, and play them from your own download folder.</b>
</p>

<p align="center">
  <a href="https://github.com/shiori-project-app/shiori/releases/latest"><img src="https://img.shields.io/github/v/release/shiori-project-app/shiori?style=for-the-badge&label=latest%20version&color=2ea44f" alt="Latest version" /></a>
  <img src="https://img.shields.io/badge/Windows%20%7C%20Linux-555?style=for-the-badge" alt="Windows and Linux" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-555?style=for-the-badge" alt="MIT license" /></a>
</p>

<h2 align="center">
  ⬇️ <a href="https://github.com/shiori-project-app/shiori/releases/latest">DOWNLOAD HERE</a> ⬇️
</h2>

<p align="center">Free · No ads · No account · Your list stays on your computer</p>

---

## Install

Open the [latest release](https://github.com/shiori-project-app/shiori/releases/latest) and pick the file for your system:

| System                     | File                  |
| -------------------------- | --------------------- |
| Windows 10/11 (64-bit)     | `Shiori-Setup-*.exe`  |
| Linux, any distro (64-bit) | `Shiori-*.AppImage`   |
| Debian, Ubuntu, Mint       | `shiori_*_amd64.deb`  |
| Fedora, openSUSE           | `shiori-*.x86_64.rpm` |
| Arch, Manjaro              | `shiori-*.pacman`     |
| Other Linux (64-bit)       | `shiori-*.tar.gz`     |

The release page shows the command to start each one.

**Windows** may say "Windows protected your PC" because the app isn't code-signed yet: click **More info**, then **Run anyway**.

**Linux** support is new and has had less testing than Windows. If something won't start or a feature is missing, the [Linux notes](docs/linux.md) list what to install.

## Features

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
- **Fullscreen, theater mode and picture-in-picture,** plus [keyboard shortcuts](#keyboard-shortcuts).
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

## Good to know

- **Torrents download in your torrent app, not in Shiori.** Shiori finds the release and hands it over, and your torrent app does the downloading and uploading, under its own settings. With [qBittorrent](https://www.qbittorrent.org/), Shiori sets the save folder for you so the episode appears in the app. With another torrent app, save it to Shiori's download folder yourself. Direct downloads and playback don't need a torrent app.
- **You may need to search for a torrent yourself.** Uploaders often name shows differently from AniList, so Shiori's automatic search can miss a release or find the wrong one. If that happens, edit the search on Nyaa or search for the show on SubsPlease. If a downloaded file doesn't get matched to its episode, you can link it by hand.
- **HEVC (x265) videos** need hardware support to play in the app. If a file can't play, Shiori offers to open it in your default player.
- **Episodes play from your download folder.** An episode needs to be downloaded before you can watch it.

## Keyboard shortcuts

| Key            | Action                          |
| -------------- | ------------------------------- |
| `Space` or `K` | Play or pause                   |
| `J` / `L`      | Back or forward 10 seconds      |
| `←` / `→`      | Back or forward 5 seconds       |
| `↑` / `↓`      | Volume                          |
| `M`            | Mute                            |
| `C`            | Subtitles on or off             |
| `S`            | Skip the intro or ending        |
| `F`            | Fullscreen                      |
| `T`            | Theater mode                    |
| `P`            | Picture-in-picture              |
| `Home` / `End` | Jump to the start or end        |
| `0`–`9`        | Jump to that tenth of the video |

## Privacy

There's no account, and your list, history and settings stay on your computer. Shiori connects to the internet to read show data from AniList, Jikan and AniSkip, to reach the download sources above, and to check GitHub for updates.

## Credits

- **Show data and cover art:** [AniList](https://anilist.co).
- **Extra episode names:** [Jikan](https://jikan.moe), an unofficial MyAnimeList API.
- **Intro and ending times:** AniSkip.

Show information, artwork and titles belong to their owners. Shiori isn't affiliated with any of these services, or with the download sources.

## Disclaimer

Shiori isn't a streaming service. It has no servers and hosts no videos. It shows information about anime, finds episodes on existing third-party sites, and plays files from your own download folder.

- **Direct downloads** come straight from the source site to your computer.
- **Torrents** are handled by your own torrent app, which also uploads to other people while it downloads.

Shiori doesn't control those sites or what they offer. You're responsible for checking that what you download is allowed where you live.

If you're a rights holder, please contact the site that hosts the content, because Shiori can't remove anything from it.

## License

Shiori is free to use and change under the [MIT license](LICENSE).

## For developers

Setup, commands and code notes are in the [developer docs](docs/README.md).
