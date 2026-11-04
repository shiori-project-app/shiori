import { formatRating } from '@/utils/format';
import { airingStatusText, isUpcoming, releasedEpisodesText } from '@/utils/series';

const Fact = ({ label, value }) => (
  <li className="facts__item" title={String(value)}>
    <small>{label}</small>
    <b>{value}</b>
  </li>
);

export const SeriesFacts = ({ series }) => (
  <ul className="facts">
    <Fact label="Score" value={`★ ${formatRating(series.rating)} / 10`} />
    <Fact label="Year" value={series.year || '–'} />
    <Fact label="Episodes" value={releasedEpisodesText(series)} />
    {series.studio && <Fact label="Studio" value={series.studio} />}
    <Fact label={isUpcoming(series) ? 'Premieres' : 'Status'} value={airingStatusText(series)} />
  </ul>
);
