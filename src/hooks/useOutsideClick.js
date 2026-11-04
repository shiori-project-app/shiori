import { useEffect } from 'react';

export const useOutsideClick = (elementRef, isListening, onOutsideClick) => {
  useEffect(() => {
    if (!isListening) return;

    const handleMouseDown = (event) => {
      if (!elementRef.current.contains(event.target)) onOutsideClick();
    };

    document.addEventListener('mousedown', handleMouseDown);

    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [elementRef, isListening, onOutsideClick]);
};
