import { Link } from 'react-router';
import { MyListButton } from '@/components/anime/MyListButton';
import { Icon } from '@/components/common/Icon';
import { DownloadButton } from '@/components/downloads/DownloadButton';
import { LinkFilesButton } from '@/components/downloads/LinkFilesButton';
import { TrackButton } from '@/components/downloads/TrackButton';
import { NextEpisodeNote } from '@/components/series/NextEpisodeNote';
import { watchPath } from '@/constants/routes';
import { hasAired } from '@/utils/series';

const ResumeButton = ({ series, resumeEpisode, hasStarted, isResumeEpisodeDownloaded }) => {
  if (!isResumeEpisodeDownloaded) {
    return (
      <DownloadButton
        series={series}
        episode={resumeEpisode}
        className="btn btn--primary"
        label={`Download EP ${resumeEpisode}`}
      />
    );
  }

  return (
    <Link className="btn btn--primary" to={watchPath(series.id, resumeEpisode)}>
      <Icon name="play" />
      {hasStarted ? `Continue EP ${resumeEpisode}` : 'Start watching'}
    </Link>
  );
};

export const SeriesActions = ({ series, resumeEpisode, hasStarted, isResumeEpisodeDownloaded }) => {
  const aired = hasAired(series);
  const canDownloadSeason = aired && (isResumeEpisodeDownloaded || series.released > 1);

  return (
    <div className="cta">
      {aired && (
        <ResumeButton
          series={series}
          resumeEpisode={resumeEpisode}
          hasStarted={hasStarted}
          isResumeEpisodeDownloaded={isResumeEpisodeDownloaded}
        />
      )}

      <MyListButton series={series} />

      {canDownloadSeason && (
        <DownloadButton
          series={series}
          className="btn btn--ghost"
          label={series.released === 1 ? 'Download' : 'Download season'}
        />
      )}

      {aired && <LinkFilesButton series={series} />}
      <TrackButton series={series} />
      <NextEpisodeNote series={series} />
    </div>
  );
};
