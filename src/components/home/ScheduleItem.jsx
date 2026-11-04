import { memo } from 'react';
import { Link } from 'react-router';
import { Artwork } from '@/components/common/Artwork';
import { seriesPath } from '@/constants/routes';
import { useDisplayTitle } from '@/hooks/usePreferences';
import { cx } from '@/utils/classNames';
import { airingIsoTime, formatAiringTime } from '@/utils/schedule';
import { formatLabel } from '@/utils/series';

const scheduleMeta = (series) => [formatLabel(series.format), series.genres[0]].filter(Boolean).join(' · ');

const ScheduledEpisode = ({ episode, airingAt, series, hasAired }) => {
  const displayTitle = useDisplayTitle();

  return (
    <li className={cx('schedule__item', hasAired && 'is-aired')}>
      <time className="schedule__time" dateTime={airingIsoTime(airingAt)}>
        {formatAiringTime(airingAt)}
      </time>

      <Link className="thumb thumb--poster schedule__thumb" to={seriesPath(series.id)} tabIndex={-1}>
        <Artwork src={series.cover} />
      </Link>

      <div className="schedule__info">
        <Link className="schedule__title" to={seriesPath(series.id)}>
          {displayTitle(series)}
        </Link>

        <p className="schedule__meta">{scheduleMeta(series)}</p>
      </div>

      <span className="schedule__ep">
        EP {episode}
        {series.totalEpisodes ? ` / ${series.totalEpisodes}` : ''}
      </span>
    </li>
  );
};

export const ScheduleItem = memo(ScheduledEpisode);
