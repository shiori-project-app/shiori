import { useCallback } from 'react';

const nextIndex = (currentIndex, optionCount) => (currentIndex + 1) % optionCount;

const previousIndex = (currentIndex, optionCount) => (currentIndex - 1 + optionCount) % optionCount;

const TARGET_INDEX_BY_KEY = {
  ArrowRight: nextIndex,
  ArrowDown: nextIndex,
  ArrowLeft: previousIndex,
  ArrowUp: previousIndex,
  Home: () => 0,
  End: (_currentIndex, optionCount) => optionCount - 1,
};

export const useArrowKeySelection = (optionIds, selectedId, onSelect) =>
  useCallback(
    (event) => {
      const targetIndexFor = TARGET_INDEX_BY_KEY[event.key];

      if (!targetIndexFor) return;

      const targetIndex = targetIndexFor(optionIds.indexOf(selectedId), optionIds.length);

      event.preventDefault();
      onSelect(optionIds[targetIndex]);

      const optionButtons = event.currentTarget.querySelectorAll('[role="tab"], [role="radio"]');

      optionButtons[targetIndex]?.focus();
    },
    [optionIds, selectedId, onSelect],
  );
