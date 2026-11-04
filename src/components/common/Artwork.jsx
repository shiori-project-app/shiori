import { memo, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { cx } from '@/utils/classNames';

const ArtworkImage = ({ src, hidePlaceholderLabel = false }) => {
  const [loadedSource, setLoadedSource] = useState(null);
  const [failedSource, setFailedSource] = useState(null);

  const isMissing = !src || failedSource === src;

  return (
    <div className="artwork">
      <div className={cx('artwork__placeholder', hidePlaceholderLabel && 'is-plain', isMissing && 'is-missing')}>
        <Icon name="image" />
        <span>No image</span>
      </div>

      {!isMissing && (
        <img
          className={cx('artwork__img', loadedSource === src && 'is-loaded')}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedSource(src)}
          onError={() => setFailedSource(src)}
        />
      )}
    </div>
  );
};

export const Artwork = memo(ArtworkImage);
