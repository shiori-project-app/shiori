import { DEFAULT_BROWSE_PARAMS } from '@/constants/filters';

const TEXT_PARAMS = ['genre', 'sort', 'format', 'status', 'season'];
const NUMBER_PARAMS = ['year', 'page'];

export const readBrowseParams = (searchParams, defaults = DEFAULT_BROWSE_PARAMS) => ({
  ...Object.fromEntries(TEXT_PARAMS.map((name) => [name, searchParams.get(name) || defaults[name]])),
  ...Object.fromEntries(NUMBER_PARAMS.map((name) => [name, Number(searchParams.get(name)) || defaults[name]])),
});

export const toBrowseSearchParams = (params, defaults = DEFAULT_BROWSE_PARAMS) =>
  Object.fromEntries(Object.entries(params).filter(([name, value]) => value !== defaults[name]));
