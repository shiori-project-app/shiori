import { memo } from 'react';
import { Link } from 'react-router';
import { MyListButton } from '@/components/anime/MyListButton';
import { SeriesTags } from '@/components/anime/SeriesTags';
import { Artwork } from '@/components/common/Artwork';
import { Icon } from '@/components/common/Icon';
import { Tags } from '@/components/common/Tags';
import { seriesPath } from '@/constants/routes';
import { useDisplayTitle } from '@/hooks/usePreferences';
import { formatCountdown, formatRating } from '@/utils/format';
import { episodeCountText, isUpcoming, premiereText } from '@/utils/series';

const SEASON_CARD_GENRE_LIMIT = 3;

const airingCountdownText = (series) => {
  if (series.nextAiringAt) return `EP ${series.nextEpisode} in ${formatCountdown(series.nextAiringAt)}`;
  if (isUpcoming(series)) return premiereText(series);
  if (series.status === 'Finished') return `Finished · ${episodeCountText(series)}`;

  return series.status;
};

const SeasonChartCard = ({ series }) => {
  const seriesLink = seriesPath(series.id);

  const displayTitle = useDisplayTitle();

  return (
    <article className="season-card">
      <Link className="thumb thumb--poster season-card__thumb" to={seriesLink} tabIndex={-1}>
        <Artwork src={series.cover} />
      </Link>

      <div className="season-card__body">
        <h3 className="season-card__title">
          <Link to={seriesLink}>{displayTitle(series)}</Link>
        </h3>

        <p className="season-card__meta">
          <SeriesTags series={series} />
          {series.studio && <span className="season-card__studio">{series.studio}</span>}
        </p>

        <Tags items={series.genres.slice(0, SEASON_CARD_GENRE_LIMIT)} className="season-card__genres" />
        <p className="season-card__synopsis">{series.synopsis || 'No synopsis yet.'}</p>

        <div className="season-card__foot">
          <span className="season-card__airing">
            <Icon name="bell" />
            {airingCountdownText(series)}
          </span>

          {series.rating && (
            <span className="season-card__rating">
              <Icon name="star" />
              {formatRating(series.rating)}
            </span>
          )}

          <MyListButton series={series} className="btn btn--ghost btn--sm" />
        </div>
      </div>
    </article>
  );
};

export const SeasonCard = memo(SeasonChartCard);
