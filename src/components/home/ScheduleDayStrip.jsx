import { Icon } from '@/components/common/Icon';
import { ScrollRow } from '@/components/common/ScrollRow';
import { useArrowKeySelection } from '@/hooks/useArrowKeySelection';
import { cx } from '@/utils/classNames';
import { DAYS_PER_WEEK, localMidnight, shortDateLabel, weekdayLabel } from '@/utils/schedule';

export const ScheduleDayStrip = ({ weekStart, selectedDay, onSelectDay }) => {
  const daysInWeek = Array.from({ length: DAYS_PER_WEEK }, (_, dayOfWeek) => weekStart + dayOfWeek);

  const selectWithArrowKeys = useArrowKeySelection(daysInWeek, selectedDay, onSelectDay);

  return (
    <div className="schedule__bar">
      <button
        type="button"
        className="section__arrow"
        aria-label="Previous week"
        disabled={weekStart === 0}
        onClick={() => onSelectDay(weekStart - DAYS_PER_WEEK)}
      >
        <Icon name="left" />
      </button>

      <ScrollRow className="schedule__days" role="tablist" aria-label="Day" onKeyDown={selectWithArrowKeys}>
        {daysInWeek.map((daysFromToday) => {
          const date = localMidnight(daysFromToday);
          const isSelected = daysFromToday === selectedDay;

          return (
            <button
              key={daysFromToday}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={cx('schedule__day', isSelected && 'is-active')}
              onClick={() => onSelectDay(daysFromToday)}
            >
              <b>{weekdayLabel(daysFromToday, date)}</b>
              <small>{shortDateLabel(date)}</small>
            </button>
          );
        })}
      </ScrollRow>

      <button
        type="button"
        className="section__arrow"
        aria-label="Next week"
        onClick={() => onSelectDay(weekStart + DAYS_PER_WEEK)}
      >
        <Icon name="right" />
      </button>
    </div>
  );
};
