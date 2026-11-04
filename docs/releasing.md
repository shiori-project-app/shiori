# Releasing and updates

Installed copies of Shiori update themselves from this repo's GitHub Releases, using `electron-updater`. The repo must be public, because the app has no token to read a private one.

## How updates work

- `electron/ipc/updates.js` checks 5 s after every launch, whatever the settings, so the updater doesn't slow startup. While `autoUpdate` is on, it also checks every 6 hours. Settings → Updates has a manual check and the switch.
- `autoUpdate` is off by default, so a toast and Settings → Updates announce a new version and the download waits for a click. If the user turns it on, new versions download in the background.
- A finished update installs on Restart to update, or the next time the user quits. Any other restart from Settings, such as the graphics one, installs it too, because a normal restart would clash with the install on quit.
- Toasts wait until the window is visible, so a copy started in the tray announces the update when it's opened.
- A background check that fails stays quiet and is only logged, because being offline is normal. A failed manual check, download or install shows Try again. A failed background check doesn't forget an update it already found.
- Downloads are checked against the SHA-512 hash in `latest.yml`. Builds aren't code-signed, so that hash comes from the same place as the file, and whoever can publish a release can ship code to every user. Protect the publishing accounts with two-factor authentication.

## Publishing a release

1. Update `version` in `package.json`, using a higher version number than the last release. The app only updates to a higher version.
2. Close any running copy of Shiori, then run `npm run dist`.
3. On GitHub, go to Releases and draft a new release with the tag `v<version>`, such as `v1.1.0`.
4. Upload these three files from `release/`: `Shiori-Setup-<version>.exe`, `Shiori-Setup-<version>.exe.blockmap` and `latest.yml`.
5. Publish it. Drafts and pre-releases aren't offered to users.

For Linux, run `npm run dist:linux` on Linux and also upload the packages, `latest-linux.yml` and `latest-linux-arm64.yml` to the same release.

## Rules to keep

- Upload `latest.yml` every time. Without it, the app can't see the new version.
- Keep the installer's file name free of spaces (`build.nsis.artifactName`). GitHub renames uploaded files with spaces, which would stop the name matching `latest.yml`.
- The `dist` scripts pass `--publish never`, so a build never uploads anything by itself.

## What each package does

- The Windows installer replaces the app silently and reopens it.
- The AppImage replaces its own file.
- deb, rpm and pacman ask for the user's password through the system prompt.
- The Linux tar.gz and unpackaged runs can't update, so Settings → Updates says so and locks the switch.

The downloaded update waits in `%LOCALAPPDATA%\shiori-updater` on Windows and `~/.cache/shiori-updater` on Linux.
