import { memo } from 'react';
import { Link } from 'react-router';
import { SeriesTags } from '@/components/anime/SeriesTags';
import { Artwork } from '@/components/common/Artwork';
import { Icon } from '@/components/common/Icon';
import { seriesPath } from '@/constants/routes';
import { useDisplayTitle } from '@/hooks/usePreferences';
import { cx } from '@/utils/classNames';
import { formatRating, twoDigits } from '@/utils/format';
import { seriesDetail } from '@/utils/series';

const CompactSeriesRow = ({ series, rank, note, className }) => {
  const displayTitle = useDisplayTitle();

  return (
    <li className={cx('compact-row', className)}>
      {rank && <span className={`compact-row__rank compact-row__rank--${rank}`}>{twoDigits(rank)}</span>}

      <Link className="thumb thumb--poster compact-row__thumb" to={seriesPath(series.id)} tabIndex={-1}>
        <Artwork src={series.cover} />
      </Link>

      <div className="compact-row__info">
        <Link className="compact-row__title" to={seriesPath(series.id)}>
          {displayTitle(series)}
        </Link>

        <p className="compact-row__meta">
          {series.rating && (
            <span className="compact-row__rating">
              <Icon name="star" />
              {formatRating(series.rating)}
            </span>
          )}

          <SeriesTags series={series} />
          <span className="compact-row__detail">{seriesDetail(series)}</span>
        </p>

        {note && <div className="compact-row__note">{note}</div>}
      </div>
    </li>
  );
};

export const CompactRow = memo(CompactSeriesRow);
