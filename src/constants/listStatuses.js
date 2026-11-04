export const LIST_STATUSES = [
  { id: 'watching', label: 'Watching' },
  { id: 'planning', label: 'Planning' },
  { id: 'completed', label: 'Completed' },
  { id: 'paused', label: 'Paused' },
  { id: 'dropped', label: 'Dropped' },
];

export const DEFAULT_LIST_STATUS = 'planning';

export const listStatusLabel = (statusId) => LIST_STATUSES.find((status) => status.id === statusId)?.label ?? statusId;
