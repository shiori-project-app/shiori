import { Link } from 'react-router';
import { AlternativeTitles } from '@/components/anime/AlternativeTitles';
import { MyListButton } from '@/components/anime/MyListButton';
import { Artwork } from '@/components/common/Artwork';
import { Backdrop } from '@/components/common/Backdrop';
import { Icon } from '@/components/common/Icon';
import { Tags } from '@/components/common/Tags';
import { DownloadButton } from '@/components/downloads/DownloadButton';
import { HERO_INTERVAL_MS } from '@/config/app.config';
import { seriesPath, watchPath } from '@/constants/routes';
import { useCarousel } from '@/hooks/useCarousel';
import { useEpisodeAvailability } from '@/hooks/useEpisodeAvailability';
import { useDisplayTitle } from '@/hooks/usePreferences';
import { formatRating } from '@/utils/format';
import { episodeCountText } from '@/utils/series';

const FIRST_EPISODE = 1;

const HeroMeta = ({ series }) => (
  <div className="hero__meta">
    <span className="hero__rating">
      <Icon name="star" />
      {formatRating(series.rating)}
    </span>

    <span>{series.year}</span>
    <span>{episodeCountText(series)}</span>
    <span>{series.status}</span>
    {series.studio && <span>{series.studio}</span>}
  </div>
);

const WatchOrDownloadButton = ({ series }) => {
  const isFirstEpisodeDownloaded = useEpisodeAvailability(series)(FIRST_EPISODE).state === 'ready';

  if (!isFirstEpisodeDownloaded) {
    return <DownloadButton series={series} className="btn btn--primary" label="Download" />;
  }

  return (
    <Link className="btn btn--primary" to={watchPath(series.id, FIRST_EPISODE)}>
      <Icon name="play" />
      Watch now
    </Link>
  );
};

const HeroSlide = ({ series, rank }) => {
  const displayTitle = useDisplayTitle();

  return (
    <div className="hero__content">
      <Link className="thumb thumb--poster hero__poster" to={seriesPath(series.id)} tabIndex={-1} aria-hidden="true">
        <Artwork src={series.coverLarge || series.cover} />
      </Link>

      <div className="hero__text">
        <span className="kicker">
          <Icon name="star" /> #{rank} Trending now
        </span>

        <h1 className="hero__title">{displayTitle(series)}</h1>
        <AlternativeTitles series={series} limit={1} />
        <HeroMeta series={series} />
        <Tags items={series.genres} />
        <p className="hero__synopsis">{series.synopsis}</p>

        <div className="cta">
          <WatchOrDownloadButton series={series} />

          <Link className="btn btn--ghost" to={seriesPath(series.id)}>
            Details
          </Link>

          <MyListButton series={series} />
        </div>
      </div>
    </div>
  );
};

export const HeroCarousel = ({ items }) => {
  const { activeIndex, showSlide, pauseHandlers } = useCarousel(items.length, HERO_INTERVAL_MS);

  const activeSeries = items[activeIndex];

  return (
    <section className="hero" aria-roledescription="carousel" aria-label="Trending anime" {...pauseHandlers}>
      <Backdrop key={activeSeries.id} series={activeSeries} />
      <HeroSlide key={activeIndex} series={activeSeries} rank={activeIndex + 1} />

      <div className="hero__dots">
        {items.map((series, index) => (
          <button
            key={series.id}
            type="button"
            className="hero__dot"
            aria-current={index === activeIndex}
            aria-label={`Show spotlight ${index + 1}`}
            onClick={() => showSlide(index)}
          />
        ))}
      </div>
    </section>
  );
};
