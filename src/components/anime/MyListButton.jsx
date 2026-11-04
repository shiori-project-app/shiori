import { Icon } from '@/components/common/Icon';
import { Select } from '@/components/common/Select';
import { DEFAULT_LIST_STATUS, LIST_STATUSES, listStatusLabel } from '@/constants/listStatuses';
import { useLibrary } from '@/hooks/useLibrary';
import { useToast } from '@/hooks/useToast';
import { cx } from '@/utils/classNames';

const REMOVE_FROM_LIST = 'remove';

const LIST_STATUS_OPTIONS = [
  ...LIST_STATUSES.map((status) => [status.id, status.label]),
  [REMOVE_FROM_LIST, 'Remove from My List'],
];

export const MyListButton = ({ series, className = 'btn btn--ghost' }) => {
  const { list, setListStatus, removeFromList } = useLibrary();
  const showToast = useToast();

  const listEntry = list[series.id];

  const addToList = () => {
    setListStatus(series.id, DEFAULT_LIST_STATUS);
    showToast(`Added to My List · ${listStatusLabel(DEFAULT_LIST_STATUS)}`);
  };

  const changeListStatus = (status) => {
    if (status === REMOVE_FROM_LIST) {
      removeFromList(series.id);
      showToast('Removed from My List');

      return;
    }

    setListStatus(series.id, status);
    showToast(`Moved to ${listStatusLabel(status)}`);
  };

  if (!listEntry) {
    return (
      <button type="button" className={className} onClick={addToList}>
        <Icon name="plus" />
        <span>My List</span>
      </button>
    );
  }

  return (
    <Select
      buttonClassName={cx(className, 'list-status')}
      icon="check"
      srLabel="My List status"
      value={listEntry.status}
      onChange={changeListStatus}
      options={LIST_STATUS_OPTIONS}
    />
  );
};
