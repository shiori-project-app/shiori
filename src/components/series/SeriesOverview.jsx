import { useNavigate } from 'react-router';
import { AlternativeTitles } from '@/components/anime/AlternativeTitles';
import { Artwork } from '@/components/common/Artwork';
import { Tags } from '@/components/common/Tags';
import { SeriesActions } from '@/components/series/SeriesActions';
import { SeriesFacts } from '@/components/series/SeriesFacts';
import { browsePath } from '@/constants/routes';
import { useDisplayTitle } from '@/hooks/usePreferences';
import { formatLabel } from '@/utils/series';

export const SeriesOverview = ({ series, resumeEpisode, hasStarted, isResumeEpisodeDownloaded }) => {
  const navigate = useNavigate();
  const displayTitle = useDisplayTitle();

  const browseGenre = (genre) => navigate(browsePath({ genre, sort: 'POPULARITY_DESC' }));

  return (
    <div className="series__info">
      <div className="thumb thumb--poster">
        <Artwork src={series.coverLarge || series.cover} />
      </div>

      <div>
        <span className="kicker">
          {series.status}
          {series.format && ` · ${formatLabel(series.format)}`}
        </span>

        <h1 className="series__title">{displayTitle(series)}</h1>
        <AlternativeTitles series={series} />
        <Tags className="series__tags" items={series.genres} onSelect={browseGenre} />
        <p className="series__synopsis">{series.synopsis || 'No synopsis available.'}</p>

        <SeriesActions
          series={series}
          resumeEpisode={resumeEpisode}
          hasStarted={hasStarted}
          isResumeEpisodeDownloaded={isResumeEpisodeDownloaded}
        />

        <SeriesFacts series={series} />
      </div>
    </div>
  );
};
