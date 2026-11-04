import { cx } from '@/utils/classNames';

export const Tags = ({ items, onSelect, className }) => (
  <div className={cx('tags', className)}>
    {items.map((item) =>
      onSelect ? (
        <button key={item} type="button" className="tag" onClick={() => onSelect(item)}>
          {item}
        </button>
      ) : (
        <span key={item} className="tag">
          {item}
        </span>
      ),
    )}
  </div>
);
