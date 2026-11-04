import { useLayoutEffect, useMemo, useRef } from 'react';
import { EpisodeRow } from '@/components/anime/EpisodeRow';
import { Select } from '@/components/common/Select';
import { useEpisodeAvailability } from '@/hooks/useEpisodeAvailability';
import { useEpisodeTitles } from '@/hooks/useEpisodeTitles';
import { useSession } from '@/hooks/useSession';
import { cx } from '@/utils/classNames';
import { blockCount, blockOf, blockRange, buildEpisode, episodeNumbersInRange } from '@/utils/episodes';

const CURRENT_EPISODE_SCROLL_OFFSET_PX = 80;

const episodeRangeOptions = (series, rangeCount) =>
  Array.from({ length: rangeCount }, (_, rangeIndex) => {
    const [firstEpisode, lastEpisode] = blockRange(series, rangeIndex);

    return [rangeIndex, `Episodes ${firstEpisode}–${lastEpisode}`];
  });

const useScrollCurrentEpisodeIntoView = (listRef, isSideList, currentEpisode) =>
  useLayoutEffect(() => {
    if (!isSideList) return;

    const list = listRef.current;
    const currentRow = list?.querySelector('.episode-row.is-current');

    if (currentRow) {
      list.scrollTop = Math.max(0, currentRow.offsetTop - list.offsetTop - CURRENT_EPISODE_SCROLL_OFFSET_PX);
    }
  }, [listRef, isSideList, currentEpisode]);

export const EpisodePanel = ({ series, current = 0, defaultEpisode = 1, variant = 'list' }) => {
  const { episodeBlocks, setEpisodeBlock } = useSession();

  const listRef = useRef(null);

  const isSideList = variant === 'side';
  const rangeCount = blockCount(series);
  const selectedRange = Math.min(episodeBlocks[series.id] ?? blockOf(current || defaultEpisode), rangeCount - 1);

  const [firstEpisode, lastEpisode] = blockRange(series, selectedRange);

  const extraTitles = useEpisodeTitles(series, firstEpisode, lastEpisode);
  const availabilityOf = useEpisodeAvailability(series);
  const rangeOptions = useMemo(() => episodeRangeOptions(series, rangeCount), [series, rangeCount]);

  const episodes = useMemo(
    () =>
      episodeNumbersInRange(firstEpisode, lastEpisode).map((episodeNumber) =>
        buildEpisode(series, episodeNumber, extraTitles),
      ),
    [series, firstEpisode, lastEpisode, extraTitles],
  );

  useScrollCurrentEpisodeIntoView(listRef, isSideList, current);

  return (
    <>
      {rangeCount > 1 && (
        <Select
          srLabel="Episode range"
          className="episode-panel__range"
          value={selectedRange}
          onChange={(rangeIndex) => setEpisodeBlock(series.id, rangeIndex)}
          options={rangeOptions}
        />
      )}

      <div ref={listRef} className={cx('episode-list', isSideList && 'episode-list--side')}>
        {episodes.map((episode) => (
          <EpisodeRow
            key={episode.number}
            series={series}
            episode={episode}
            current={episode.number === current}
            {...availabilityOf(episode.number)}
          />
        ))}
      </div>
    </>
  );
};
