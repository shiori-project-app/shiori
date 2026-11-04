import { openExternally, showLibraryFile } from '@/api/clients/desktopClient';
import { Icon } from '@/components/common/Icon';

export const PlaybackError = ({ file }) => (
  <div className="player__error" role="alert">
    <h4 className="player__error-title">Shiori can’t play this file</h4>

    <p>
      Its video format isn’t supported here (this is usually HEVC / x265 on PCs without hardware support). Your video
      player can open it.
    </p>

    <div className="player__endcard-actions">
      <button type="button" className="btn btn--primary" onClick={() => openExternally(file.path)}>
        <Icon name="play" />
        Open in video player
      </button>

      <button type="button" className="btn" onClick={() => showLibraryFile(file.path)}>
        <Icon name="folder" />
        Show in folder
      </button>
    </div>
  </div>
);
