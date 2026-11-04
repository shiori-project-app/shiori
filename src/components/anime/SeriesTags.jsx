import { formatLabel, seriesYearTag } from '@/utils/series';

export const SeriesTags = ({ series }) =>
  [formatLabel(series.format), seriesYearTag(series)].filter(Boolean).map((tag) => (
    <span key={tag} className="tag-pill">
      {tag}
    </span>
  ));
