# Linux

Linux support hasn't been run on a real Linux system yet, only checked by unit tests that simulate the platform. Expect to find problems the first time it runs.

## Building

- `npm run dist:linux` builds AppImage, deb, rpm, pacman and tar.gz packages for x64 and arm64 into `release/`.
- Run the build on Linux: a machine, WSL, Docker or CI. It can't run on Windows because `mksquashfs` and `fpm` have no Windows version, and a tar.gz made there loses its executable bits, so `shiori` won't start without `chmod +x`.
- The rpm needs `rpm` installed and the pacman package needs `libarchive-tools` (bsdtar). Remove a target from `build.linux.target` if you don't need it.
- deb, rpm and pacman require `homepage` and `maintainer` in `package.json`. Both end up in the package details.

## Which package runs where

- AppImage runs on most glibc distros with no install. It uses the static runtime (`toolsets.appimage`), so FUSE 2 isn't needed. With no FUSE at all, run `./Shiori.AppImage --appimage-extract-and-run`.
- deb covers Debian, Ubuntu, Mint and Pop. rpm covers Fedora, openSUSE and RHEL. pacman covers Arch and Manjaro. tar.gz covers any other glibc distro.
- Musl distros such as Alpine can't run Shiori, because Electron is built for glibc.

## Sandbox

- Shiori keeps Chromium's sandbox on. The installers set up what the distro needs, either the SUID helper or an AppArmor profile. The AppImage can't carry either, so it adds `--no-sandbox` only when `unshare -Ur true` fails.
- `npm run dev` and `npm start` use `node_modules/electron`, which has neither. If Electron refuses to start on Ubuntu 24 or similar, run with `ELECTRON_DISABLE_SANDBOX=1`.

## Behaviour that differs from Windows

- **Download folder:** the default is `~/Videos/Shiori`, because the app's own folder is hidden in `~/.config/Shiori`.
- **Start at login:** `loginItem.js` writes `~/.config/autostart/shiori.desktop`, because Electron's login item does nothing on Linux. The file is rewritten at launch if the AppImage has moved.
- **Tray:** `desktopHasTray` in `linuxDesktop.js` decides whether a tray exists. It counts one if a StatusNotifier watcher is running, or on an X11 desktop other than GNOME. Otherwise the setting is locked and closing the window quits, because an invisible icon would leave no way to quit. Clicking the icon may do nothing under AppIndicator, so its menu includes Open Shiori.
- **Torrents:** Shiori looks for `qbittorrent` on `PATH` and for the Flatpak, then falls back to the system magnet handler. Programs it starts have the AppImage's folders removed from their environment (`environmentOutsideApp`).
- **Restart:** `relaunchOptions` restarts the AppImage file, because its mounted copy goes away on quit.
- **Cleanup:** the UI says Trash, and paths compare with exact capitals. `shell.trashItem` needs the desktop's trash tool, usually `gio`. If it's missing, the file stays where it is and the error says so.
- **Show folders:** folders ending in a dot or space stay as they are, because the rename at startup only runs on Windows.
- **Updates:** the AppImage replaces its own file, deb, rpm and pacman ask for a password, and the tar.gz can't update. See [releasing.md](releasing.md).
- **Backups from Windows:** saved file links are full paths, so after a restore they show as not found until they're linked again.

## Known limits

- HEVC needs working hardware decoding, which is fragile in Chromium on Linux. Those files often show the unsupported message with its open in default player button. No GPU flags are forced, because a bad one can stop the app starting.
- Japanese text needs a system font such as Noto Sans CJK. The deb recommends `fonts-noto-cjk`, and other packages rely on the distro having one.
- Flatpak and Snap packages aren't built.
