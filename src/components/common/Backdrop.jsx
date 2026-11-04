import { Artwork } from '@/components/common/Artwork';
import { cx } from '@/utils/classNames';

export const Backdrop = ({ series }) => {
  const hasBanner = Boolean(series.banner);

  return (
    <div className={cx('backdrop', !hasBanner && 'backdrop--from-cover')} aria-hidden="true">
      <Artwork src={series.banner || series.coverLarge || series.cover} hidePlaceholderLabel />
    </div>
  );
};
