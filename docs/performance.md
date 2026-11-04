# Performance

This page covers known performance issues and why the code is the way it is. Figures come from measurements on one development PC, so treat them as rough. "Low-end" means the page CPU slowed 4x, 2 cores, software video decoding, and a 10 Mbit connection with 40 ms latency.

## Known issue: graphics path

- On the PC tested, any drawing in Electron 45 is capped at 31 fps with the default D3D11 path, even on a trivial page, and seeks take about 1.1 s. Chrome with the same engine version runs at the monitor's full refresh rate there. The root cause is unknown, and it isn't known whether other PCs are affected.
- `disable-gpu-compositing` lifts this to 118–130 fps and 55 ms seeks. Other flags are worse: `disable-accelerated-video-decode` breaks HEVC because Chromium can't decode it in software, `disable-frame-rate-limit` burns CPU, `in-process-gpu` averages only 66 fps, and `use-angle=vulkan` leaves seeks at about 1 s.
- Low-end PCs scroll worse with the flag: My List has 21 long tasks against 3. It's therefore a setting that is off by default: Settings → Display → Smoother scrolling and faster seeking.
- Removing the fixed background or the header blur, or adding `content-visibility`, doesn't change the cap.
- `app.getGPUFeatureStatus()` reports `disabled_software` until the GPU process has started, so read it after a few seconds.

## Subtitle reader

`electron/mkvSubtitleReader.js` replaced `matroska-subtitles` (last published in 2021) because it's faster and its output matched on 5 test files. First extraction from a 1.3 GB file went from 1,270 ms to about 230 ms.

- The read window is 4 MB. Small windows lose on a file that isn't cached, because many small jumps defeat the disk's read-ahead: 64 KB took 1,945 ms against 725 ms for 4 MB. Don't lower it without measuring again.
- To test an uncached read on Windows, open a scratch copy with `FILE_FLAG_NO_BUFFERING` and write access before each run, then confirm the first read is much slower than the second. `robocopy /J` alone doesn't leave the copy uncached.
- Three differences from the old package are intentional: header-stripping compression works, a missing duration is 0 instead of `NaN`, and a damaged line is skipped instead of failing the whole file.
- `SimpleBlock` subtitles and image formats such as PGS aren't read. Performance hasn't been measured on a hard drive.

## AniList rate limit

- `X-RateLimit-Limit` was 30, in a fixed 60-second window. `remaining` counts down to 0, then a request gets a 429 with `Retry-After`, then the window resets.
- CORS hides `Retry-After` from the page, but `X-RateLimit-Limit`, `Remaining` and `Reset` are exposed.
- Offline sync and tracking once used 23 requests in the first 7.5 s, so page requests then waited out the window. They now run in a background lane that leaves 12 tokens free.

## Design decisions

- Dela Gothic's Japanese subsets are kept, because Japanese titles in headings use them.
- Code splitting covers Watch, Settings, Downloads and Seasonal. Making every page except Home lazy saved only 28 kB more and produced about 30 small chunks.
- Grids and rows use `cover`. `coverLarge` is used only in the hero, the series page and the unavailable-episode screen.
- Page code isn't prefetched, because page opens already take 5–29 ms, or 16–69 ms on low-end.
- Page data isn't prefetched, because each prefetch would spend the 30-a-minute AniList budget on pages that may never open.
- Modals aren't lazy-loaded. `RestoreBackupDialog` is already in the lazy Settings chunk, `TrackDialog` is about 4 kB, and `trackingService` keeps the download services in the startup code anyway.
- The only runtime dependency is `electron-updater`, which loads 5 s after startup. Offline sync and tracking also start after a delay, to keep startup fast.
- `Menu.setApplicationMenu(null)` isn't used. It made no measurable difference to startup and would remove the zoom and reload shortcuts.
- These weren't needed at the time of measuring: list virtualization, splitting `LibraryContext`, moving the library scan to a worker (6,000 files scan in 30 ms), and limits on the in-memory caches.
