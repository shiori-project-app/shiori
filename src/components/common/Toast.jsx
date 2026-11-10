import { useRef } from 'react';
import { ToastAnnouncement } from '@/components/common/ToastAnnouncement';
import { useTopLayerPopover } from '@/hooks/useTopLayerPopover';
import { cx } from '@/utils/classNames';

export const Toast = ({ message, visible, shownCount }) => {
  const toastRef = useRef(null);

  useTopLayerPopover(toastRef, visible, shownCount);

  return (
    <>
      <div ref={toastRef} popover="manual" className={cx('toast', visible && 'is-visible')} aria-hidden="true">
        {message}
      </div>

      <ToastAnnouncement />
    </>
  );
};
