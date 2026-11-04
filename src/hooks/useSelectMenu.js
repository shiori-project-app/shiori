import { useEffect, useRef, useState } from 'react';

const clampIndex = (index, length) => Math.max(0, Math.min(length - 1, index));

const nextOptionStartingWith = (options, currentIndex, letter) =>
  [...options.slice(currentIndex + 1), ...options.slice(0, currentIndex + 1)].find((option) =>
    option.textContent.trim().toLowerCase().startsWith(letter),
  );

const focusSelectedOrFirstOption = (menu) =>
  (menu.querySelector('[aria-selected="true"]') ?? menu.firstElementChild)?.focus();

export const useSelectMenu = ({ value, onChange }) => {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const menu = menuRef.current;

    const syncOpenState = (event) => {
      const opened = event.newState === 'open';

      setIsOpen(opened);

      if (opened) focusSelectedOrFirstOption(menu);
    };

    menu.addEventListener('toggle', syncOpenState);

    return () => menu.removeEventListener('toggle', syncOpenState);
  }, []);

  const chooseOption = (optionValue) => {
    if (optionValue !== value) onChange(optionValue);

    menuRef.current.hidePopover();
    buttonRef.current.focus();
  };

  const openMenuWithArrowKeys = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    menuRef.current.showPopover();
  };

  const navigateMenuWithKeyboard = (event) => {
    const options = [...menuRef.current.children];
    const focusedIndex = options.indexOf(document.activeElement);

    const targetIndexByKey = {
      ArrowDown: focusedIndex + 1,
      ArrowUp: focusedIndex - 1,
      Home: 0,
      End: options.length - 1,
    };

    if (event.key === 'Tab') menuRef.current.hidePopover();
    if (event.key.length === 1) nextOptionStartingWith(options, focusedIndex, event.key.toLowerCase())?.focus();

    if (event.key in targetIndexByKey) {
      event.preventDefault();
      options[clampIndex(targetIndexByKey[event.key], options.length)]?.focus();
    }
  };

  return { buttonRef, menuRef, isOpen, chooseOption, openMenuWithArrowKeys, navigateMenuWithKeyboard };
};
