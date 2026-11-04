import { useId } from 'react';
import { Icon } from '@/components/common/Icon';
import { useSelectMenu } from '@/hooks/useSelectMenu';
import { cx } from '@/utils/classNames';

const toSafeIdentifier = (reactId) => reactId.replace(/[^a-zA-Z0-9]/g, '');

export const Select = ({
  id,
  value,
  options,
  onChange,
  className,
  buttonClassName = 'select',
  icon,
  srLabel,
  placeholder = 'Choose…',
}) => {
  const selectIdentifier = toSafeIdentifier(useId());
  const anchorName = `--select-${selectIdentifier}`;
  const menuId = `select-menu-${selectIdentifier}`;

  const { buttonRef, menuRef, isOpen, chooseOption, openMenuWithArrowKeys, navigateMenuWithKeyboard } = useSelectMenu({
    value,
    onChange,
  });

  const selectedOption = options.find(([optionValue]) => optionValue === value);

  return (
    <>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        className={cx(buttonClassName, isOpen && 'is-open', className)}
        style={{ anchorName }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        popoverTarget={menuId}
        onKeyDown={openMenuWithArrowKeys}
      >
        {icon && <Icon name={icon} />}
        {srLabel && <span className="sr-only">{srLabel}: </span>}
        <span className="select__value">{selectedOption ? selectedOption[1] : placeholder}</span>
        <Icon name="down" className="select__chevron" />
      </button>

      <div
        id={menuId}
        ref={menuRef}
        className="select__menu"
        popover="auto"
        role="listbox"
        style={{ positionAnchor: anchorName }}
        onKeyDown={navigateMenuWithKeyboard}
      >
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            role="option"
            aria-selected={optionValue === value}
            className={cx('select__option', optionValue === value && 'is-selected')}
            onClick={() => chooseOption(optionValue)}
          >
            <span>{optionLabel}</span>
            {optionValue === value && <Icon name="check" />}
          </button>
        ))}
      </div>
    </>
  );
};
