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

`.github/workflows/release.yml` does the building, so no Linux machine is needed.

1. Add a `## <version>` section at the top of `CHANGELOG.md` and commit it. It becomes the release notes. `npm version` refuses to run with uncommitted changes to tracked files, so this comes first.
2. Update the version and push it with its tag. Use `patch`, `minor` or `major`:

   ```bash
   npm version minor
   git push --follow-tags
   ```

   `npm version` updates `package.json` and `package-lock.json`, commits them and creates the `v<version>` tag. The app only updates to a higher version.

3. The workflow checks that the tag matches `package.json` and that the changelog has the version, then runs the checks and tests. It builds on Windows and Linux, writes `SHA256SUMS.txt`, adds a build attestation and creates a draft release.
4. Open the draft under Releases, read the notes and try the installer.
5. Click Publish. Drafts and pre-releases aren't offered to users, and a published release reaches them the next time they open Shiori.

If a build fails, fix it and move the tag: `git tag -f v1.1.0`, then `git push -f origin v1.1.0`. Running the workflow again updates the same draft. It refuses to touch a release that's already published.

The workflow builds x64 only. `npm run dist` and `npm run dist:linux` still build locally for testing, and `dist:linux` includes arm64, which hasn't been tested.

If you protect `v*` tags with a ruleset, whoever pushes the tag must be on its bypass list.

The notes around the changelog text come from `.github/release-notes-template.md`, filled in by `.github/scripts/releaseNotes.js`.

## Rules to keep

- Every release needs `latest.yml` and `latest-linux.yml`, or the app can't see the new version. The workflow fails if either is missing.
- Keep the installer's file name free of spaces (`build.nsis.artifactName`). GitHub renames uploaded files with spaces, which would stop the name matching `latest.yml`.
- The `dist` scripts pass `--publish never`, so a build never uploads anything by itself.

## What each package does

- The Windows installer replaces the app silently and reopens it.
- The AppImage replaces its own file.
- deb, rpm and pacman ask for the user's password through the system prompt.
- The Linux tar.gz and unpackaged runs can't update, so Settings → Updates says so and locks the switch.

The downloaded update waits in `%LOCALAPPDATA%\shiori-updater` on Windows and `~/.cache/shiori-updater` on Linux.
