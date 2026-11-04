import { useState } from 'react';
import { findSubsPleaseShow, loadShow, searchShowList } from '@/api/services/subsPleaseService';
import { useAsync } from '@/hooks/useAsync';

const lookUpShow = (series, pickedShow, isEnabled) => {
  if (!isEnabled) return Promise.resolve(null);

  return pickedShow ? loadShow(series, pickedShow) : findSubsPleaseShow(series);
};

export const useSubsPleaseShow = (series, { initialShow = null, enabled = true } = {}) => {
  const [pickedShow, setPickedShow] = useState(initialShow);
  const [searchQuery, setSearchQuery] = useState('');

  const foundShow = useAsync(() => lookUpShow(series, pickedShow, enabled), [enabled, pickedShow, series.id]);

  const searchMatches = useAsync(
    () => (searchQuery ? searchShowList(searchQuery) : Promise.resolve(null)),
    [searchQuery],
  );

  return {
    found: foundShow,
    picked: pickedShow,
    pick: setPickedShow,
    query: searchQuery,
    search: setSearchQuery,
    matches: searchMatches,
  };
};
