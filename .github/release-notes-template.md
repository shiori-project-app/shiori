Track what you watch, find new episodes, and play them from your own download folder.

Free · No ads · No account · Your list stays on your computer

## Download

| System                     | File                                                                                                                                         | Start it                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Windows 10/11 (64-bit)     | [`Shiori-Setup-{{version}}.exe`](https://github.com/shiori-project-app/shiori/releases/download/v{{version}}/Shiori-Setup-{{version}}.exe)   | Run the installer                                                                    |
| Linux, any distro (64-bit) | [`Shiori-{{version}}.AppImage`](https://github.com/shiori-project-app/shiori/releases/download/v{{version}}/Shiori-{{version}}.AppImage)     | `chmod +x Shiori-{{version}}.AppImage && ./Shiori-{{version}}.AppImage`              |
| Debian, Ubuntu, Mint       | [`shiori_{{version}}_amd64.deb`](https://github.com/shiori-project-app/shiori/releases/download/v{{version}}/shiori_{{version}}_amd64.deb)   | `sudo apt install ./shiori_{{version}}_amd64.deb`                                    |
| Fedora, openSUSE           | [`shiori-{{version}}.x86_64.rpm`](https://github.com/shiori-project-app/shiori/releases/download/v{{version}}/shiori-{{version}}.x86_64.rpm) | `sudo dnf install ./shiori-{{version}}.x86_64.rpm` (openSUSE: `sudo zypper install`) |
| Arch, Manjaro              | [`shiori-{{version}}.pacman`](https://github.com/shiori-project-app/shiori/releases/download/v{{version}}/shiori-{{version}}.pacman)         | `sudo pacman -U shiori-{{version}}.pacman`                                           |
| Other Linux (64-bit)       | [`shiori-{{version}}.tar.gz`](https://github.com/shiori-project-app/shiori/releases/download/v{{version}}/shiori-{{version}}.tar.gz)         | `tar xzf shiori-{{version}}.tar.gz && ./shiori-{{version}}/shiori`                   |

Windows may say "Windows protected your PC" because the app isn't code-signed yet: click **More info**, then **Run anyway**.

Linux support is new and has had less testing than Windows. If the AppImage won't start, install `fuse3`, or run it with `--appimage-extract-and-run`.

Episodes come from AnimeHeaven (direct downloads) and from SubsPlease and Nyaa (torrents). For torrents, install [qBittorrent](https://www.qbittorrent.org/): Shiori hands them over and never downloads them itself. Uploaders often name shows differently from AniList, so you may sometimes need to edit the search yourself.

HEVC (x265) videos need hardware support to play in the app; if a file can't play, Shiori offers to open it in your default player.

`SHA256SUMS.txt` lists the checksums of the files. Every version is in the [changelog](https://github.com/shiori-project-app/shiori/blob/master/CHANGELOG.md).

## What's new

<details>
<summary>All changes in {{version}}</summary>

{{changes}}

</details>
