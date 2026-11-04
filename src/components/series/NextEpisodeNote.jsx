import { Icon } from '@/components/common/Icon';
import { nextAiringTime } from '@/utils/series';

export const NextEpisodeNote = ({ series }) => {
  if (!series.nextAiringAt) return null;

  return (
    <p className="next-episode">
      <Icon name="clock" />

      <span>
        Next <b>EP {series.nextEpisode}</b> · {nextAiringTime(series)}
      </span>
    </p>
  );
};
