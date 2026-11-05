# Linux

Shiori has run on one real Linux desktop so far, in a Wayland session. There the AppImage, the tar.gz and the pacman package's files passed playback, subtitles, library scan, trash and restart. The AppImage also passed tray, autostart and Wayland checks. The x64 deb, rpm and pacman packages have also installed and started on clean Arch, Debian 13, Ubuntu 24.04, Fedora 44 and openSUSE Tumbleweed systems. Those runs used a virtual display with the sandbox off, so they only show that the app installs, starts and draws its page. See [Not tested yet](#not-tested-yet).

## What users need to install

### To run Shiori

- **deb, rpm, pacman:** the package manager installs what's required. The dependencies are listed in `build.deb`, `build.rpm` and `build.pacman` in `package.json`, because electron-builder's defaults ask for `http-parser`, which Arch doesn't have, and leave out libraries the binary links to.
- **Fonts:** a system with no fonts at all crashes at start with `Could not find any font`. Desktop installs always have some.
- **AppImage:** needs `fusermount`, from `fuse3` on Debian, Ubuntu, Fedora and Arch. Without it, run `./Shiori.AppImage --appimage-extract-and-run`, which copies the app to `/tmp` on every start.
- **AppImage and tar.gz:** these don't bundle GTK and the other desktop libraries, and desktop installs usually have them already. If Shiori stops with `error while loading shared libraries`, install what's missing:

  - **Debian, Ubuntu, Mint, Pop:** `sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0 libgbm1 libcups2 libasound2` (`libasound2t64` on Ubuntu 24.04 and later).
  - **Fedora:** `sudo dnf install gtk3 libnotify nss libXScrnSaver libXtst xdg-utils at-spi2-core libuuid mesa-libgbm cups-libs alsa-lib`.
  - **Arch, Manjaro:** `sudo pacman -S gtk3 libnotify nss libxss libxtst xdg-utils at-spi2-core util-linux-libs mesa libcups alsa-lib`.

### Optional, for specific features

- **Torrents (SubsPlease, Nyaa):** install `qbittorrent`. Without it, the magnet link goes to the system's default handler, if there is one.
- **Japanese text:** install Noto Sans CJK, which is `fonts-noto-cjk` on Debian and Ubuntu and `noto-fonts-cjk` on Arch. Without it, Japanese titles may show as empty boxes.
- **HEVC video:** install a VA-API driver for your GPU. Without it, those files show the unsupported message with its open in default player button.
- **Cleanup to Trash:** install `gio`, from `libglib2.0-bin` on Debian and Ubuntu and `glib2` on Arch. Without it, the file stays where it is and the error says so.
- **Opening folders, files and links:** install `xdg-utils`. Without it, those buttons fail.
- **Tray on GNOME:** install the AppIndicator extension, `gnome-shell-extension-appindicator`. Without it, the tray setting is locked and closing the window quits.
- **Tray detection:** needs `dbus-send` or `gdbus`. Without them, only X11 desktops other than GNOME count as having a tray.
- **In-app restart:** needs `bash`. Without it, Shiori stays open and asks you to reopen it yourself.

## Building

- Releases are built by `.github/workflows/release.yml`; see [releasing.md](releasing.md). To build locally, `npm run dist:linux` builds AppImage, deb, rpm, pacman and tar.gz packages for x64 and arm64 into `release/`.
- To build one package type, use `npm run dist:appimage`, `dist:debian` (deb), `dist:fedora` (rpm), `dist:arch` (pacman, x64 only because the Arch repos are x64) or `dist:portable` (tar.gz). `npm run dist:win` builds the Windows installer, which is safest to build on Windows.
- Run the build on Linux: a machine, WSL, Docker or CI. It can't run on Windows because `mksquashfs` and `fpm` have no Windows version, and a tar.gz made there loses its executable bits, so `shiori` won't start without `chmod +x`.
- The rpm needs `rpmbuild`, from `rpm` on Debian and Ubuntu or `rpm-tools` on Arch. Without it `dist:linux` fails and later targets such as pacman aren't built, so use the single-type scripts or remove the target from `build.linux.target`.
- The pacman package needs bsdtar, from `libarchive-tools` on Debian and Ubuntu.
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
- **Launcher and bar icon:** Wayland bars and launchers ignore the window's icon and find one through the `.desktop` entry matching the app's id, `shiori`. The AppImage and tar.gz don't install one, so `linuxLauncherEntry.js` writes `~/.local/share/applications/shiori.desktop` and the icon in `~/.local/share/icons` at launch. It rewrites them if the AppImage has moved, and removes them if a package's entry exists. An entry without its `X-Shiori-Managed` line is the user's own and is left alone. The files stay behind if the AppImage is deleted. `TryExec` hides that entry, and it hides a package's entry too until Shiori runs from a terminal or the file is deleted.
- **Restart:** `startAgainAfterExit` starts a small bash script that closes the file descriptors it inherited, waits for Shiori to exit, then runs the AppImage file or the installed program. `app.relaunch` isn't used on Linux: what it starts has `no_new_privs` set, so `fusermount` can't mount the AppImage and the SUID sandbox can't start. If bash can't start or the program is gone, Shiori stays open and shows an error.
- **Cleanup:** the UI says Trash, and paths compare with exact capitals. `shell.trashItem` needs the desktop's trash tool, usually `gio`. If it's missing, the file stays where it is and the error says so.
- **Show folders:** folders ending in a dot or space stay as they are, because the rename at startup only runs on Windows.
- **Updates:** the AppImage replaces its own file, deb, rpm and pacman ask for a password, and the tar.gz can't update. See [releasing.md](releasing.md).
- **Backups from Windows:** saved file links are full paths, so after a restore they show as not found until they're linked again.

## Known limits

- HEVC needs working hardware decoding, which is fragile in Chromium on Linux. It played on the desktop above, but elsewhere those files often show the unsupported message with its open in default player button. No GPU flags are forced, because a bad one can stop the app starting.
- Japanese text needs a system font such as Noto Sans CJK. The deb recommends `fonts-noto-cjk`, and other packages rely on the distro having one.
- Flatpak and Snap packages aren't built.

## Known problems

Confirmed:

- **A leftover AppImage entry can hide a package's entry.** After deleting the AppImage and installing a package, Shiori can disappear from the launcher. To fix it, run `shiori` once from a terminal, or delete `~/.local/share/applications/shiori.desktop`.
- **The launcher entry and icon stay behind after deleting the AppImage.** To remove them, delete that entry and `~/.local/share/icons/hicolor/512x512/apps/shiori.png`.
- **Shiori can't start from a shell that has `ELECTRON_RUN_AS_NODE` set,** such as VS Code's extension host. It stops with `bad option`. Use `env -u ELECTRON_RUN_AS_NODE`.

Possible, not confirmed:

- **qBittorrent may keep the AppImage's mount alive.** `launchDetached` in `torrents.js` doesn't close inherited file descriptors, so a qBittorrent started from the AppImage may hold `/tmp/.mount_Shiori*` open after Shiori quits.
- **The tar.gz may not start where unprivileged user namespaces are off.** It can't ship the SUID helper set up. Run `sudo chown root:root chrome-sandbox && sudo chmod 4755 chrome-sandbox` in its folder.
- **The AppImage file itself may show a generic icon in file managers.** That depends on the file manager's thumbnailer.

## Not tested yet

- Other real desktops, including GNOME, KDE and X11 sessions.
- Manjaro, Mint, Pop and RHEL.
- Playback, restart and the sandbox on any other system.
- Any arm64 build.
- Real downloads, qBittorrent, the full player screen and the tray menu.
- HEVC on other GPUs.
