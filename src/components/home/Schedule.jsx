import { Section } from '@/components/anime/Section';
import { ScheduleDayStrip } from '@/components/home/ScheduleDayStrip';
import { ScheduleItem } from '@/components/home/ScheduleItem';
import { SCHEDULE_PREVIEW } from '@/config/app.config';
import { useScheduleDay } from '@/hooks/useScheduleDay';
import { localTimeZone, nowInUnixSeconds } from '@/utils/schedule';

const ScheduleError = ({ onRetry }) => (
  <p className="schedule__note">
    Couldn’t load the schedule.{' '}
    <button type="button" className="panel-list__retry" onClick={onRetry}>
      Retry
    </button>
  </p>
);

const ScheduleList = ({ airings, isExpanded, onToggleExpanded }) => {
  const now = nowInUnixSeconds();
  const visibleAirings = isExpanded ? airings : airings.slice(0, SCHEDULE_PREVIEW);

  return (
    <>
      <ul className="schedule__list">
        {visibleAirings.map(({ id, episode, airingAt, series }) => (
          <ScheduleItem key={id} episode={episode} airingAt={airingAt} series={series} hasAired={airingAt <= now} />
        ))}
      </ul>

      {airings.length > SCHEDULE_PREVIEW && (
        <button type="button" className="btn btn--ghost btn--sm schedule__more" onClick={onToggleExpanded}>
          {isExpanded ? 'Show less' : `Show all ${airings.length}`}
        </button>
      )}
    </>
  );
};

const ScheduleContent = ({ airings, isExpanded, onToggleExpanded }) => {
  if (airings.error) return <ScheduleError onRetry={airings.retry} />;
  if (airings.loading) return <div className="skeleton schedule__skeleton" />;
  if (!airings.data.length) return <p className="schedule__note">Nothing scheduled on AniList for this day.</p>;

  return <ScheduleList airings={airings.data} isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} />;
};

export const Schedule = () => {
  const { selectedDay, weekStart, selectDay, isExpanded, toggleExpanded, airings } = useScheduleDay();

  return (
    <Section title="Airing Schedule">
      <ScheduleDayStrip weekStart={weekStart} selectedDay={selectedDay} onSelectDay={selectDay} />
      <p className="schedule__zone">Times in your time zone ({localTimeZone})</p>
      <ScheduleContent airings={airings} isExpanded={isExpanded} onToggleExpanded={toggleExpanded} />
    </Section>
  );
};
