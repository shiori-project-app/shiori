import { useState } from 'react';
import { fetchSchedule } from '@/api/services/animeService';
import { useAsync } from '@/hooks/useAsync';
import { useContentFilter } from '@/hooks/usePreferences';
import { firstDayOfWeek, localMidnight, toUnixSeconds } from '@/utils/schedule';

export const useScheduleDay = () => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const dayStartsAt = toUnixSeconds(localMidnight(selectedDay));
  const dayEndsAt = toUnixSeconds(localMidnight(selectedDay + 1));

  const contentFilter = useContentFilter();

  const airings = useAsync(
    () => fetchSchedule(dayStartsAt - 1, dayEndsAt, contentFilter),
    [dayStartsAt, dayEndsAt, contentFilter],
  );

  const selectDay = (daysFromToday) => {
    setSelectedDay(daysFromToday);
    setIsExpanded(false);
  };

  const toggleExpanded = () => setIsExpanded((expanded) => !expanded);

  return {
    selectedDay,
    weekStart: firstDayOfWeek(selectedDay),
    selectDay,
    isExpanded,
    toggleExpanded,
    airings,
  };
};
