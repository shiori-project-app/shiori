import { memo } from 'react';
import { Icon } from '@/components/common/Icon';

const TorrentListItem = ({ title, children, onCopy, onOpen }) => (
  <li className="torrent">
    <div className="torrent__info">
      <p className="torrent__title">{title}</p>
      <p className="torrent__meta">{children}</p>
    </div>

    <button
      type="button"
      className="torrent__icon"
      aria-label="Copy magnet link"
      title="Copy magnet link"
      onClick={onCopy}
    >
      <Icon name="copy" />
    </button>

    <button type="button" className="btn btn--sm btn--primary" onClick={onOpen}>
      Open
    </button>
  </li>
);

export const TorrentRow = memo(TorrentListItem);
