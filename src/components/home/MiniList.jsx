import { Link } from 'react-router';
import { CompactRow } from '@/components/anime/CompactRow';

export const MiniList = ({ title, items, moreTo }) => (
  <section className="mini-list">
    <div className="mini-list__head">
      <h2 className="mini-list__title">{title}</h2>

      <Link className="section__more" to={moreTo}>
        View all
      </Link>
    </div>

    <ul className="compact-list">
      {items.map((series) => (
        <CompactRow key={series.id} series={series} />
      ))}
    </ul>
  </section>
);
