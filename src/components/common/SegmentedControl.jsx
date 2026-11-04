import { useArrowKeySelection } from '@/hooks/useArrowKeySelection';
import { cx } from '@/utils/classNames';

const SELECTION_ROLES = {
  radiogroup: { optionRole: 'radio', selectedAttribute: 'aria-checked' },
  tablist: { optionRole: 'tab', selectedAttribute: 'aria-selected' },
};

export const SegmentedControl = ({ options, value, onChange, label, role = 'radiogroup' }) => {
  const { optionRole, selectedAttribute } = SELECTION_ROLES[role];

  const selectWithArrowKeys = useArrowKeySelection(
    options.map((option) => option.id),
    value,
    onChange,
  );

  return (
    <div className="segmented" role={role} aria-label={label} onKeyDown={selectWithArrowKeys}>
      {options.map((option) => {
        const isSelected = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            role={optionRole}
            {...{ [selectedAttribute]: isSelected }}
            tabIndex={isSelected ? 0 : -1}
            className={cx('segmented__option', isSelected && 'is-active')}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
