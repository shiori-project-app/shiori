import { memo } from 'react';
import { Link } from 'react-router';
import { SeriesTags } from '@/components/anime/SeriesTags';
import { Artwork } from '@/components/common/Artwork';
import { Icon } from '@/components/common/Icon';
import { seriesPath } from '@/constants/routes';
import { useDisplayTitle } from '@/hooks/usePreferences';
import { formatRating } from '@/utils/format';
import { hasAired, seriesDetail, statusBadge } from '@/utils/series';

const PosterCardContent = ({ series, line, rank }) => {
  const seriesLink = seriesPath(series.id);
  const title = useDisplayTitle()(series);

  const status = statusBadge(series);

  return (
    <article className="card card--poster">
      <Link className="thumb thumb--poster" to={seriesLink} aria-label={title}>
        <Artwork src={series.cover} />

        {hasAired(series) && (
          <span className="thumb__badges">
            <b className="badge">EP {series.released}</b>
          </span>
        )}

        <span className="thumb__rating">
          <Icon name="star" />
          {formatRating(series.rating)}
        </span>

        {rank && (
          <span className={`thumb__rank thumb__rank--${rank}`} aria-label={`Rank ${rank}`}>
            {rank}
          </span>
        )}

        <span className={`thumb__status is-${status.key}`}>{status.label}</span>

        <span className="thumb__play">
          <Icon name="play" />
        </span>
      </Link>

      <h3 className="card__title">
        <Link to={seriesLink}>{title}</Link>
      </h3>

      <p className="card__meta">
        <SeriesTags series={series} />
        <span className="card__detail">{line || seriesDetail(series)}</span>
      </p>
    </article>
  );
};

export const PosterCard = memo(PosterCardContent);
