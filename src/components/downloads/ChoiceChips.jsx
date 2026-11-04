import { cx } from '@/utils/classNames';

export const ChoiceChips = ({ label, options, value, onChange, children }) => (
  <div className="chips" role="group" aria-label={label}>
    {options.map(([optionValue, optionLabel]) => (
      <button
        key={optionValue}
        type="button"
        className={cx('chip chip--sm', value === optionValue && 'is-active')}
        onClick={() => onChange(optionValue)}
      >
        {optionLabel}
      </button>
    ))}

    {children}
  </div>
);
