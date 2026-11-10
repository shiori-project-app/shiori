import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/common/Icon';
import { ToastAnnouncement } from '@/components/common/ToastAnnouncement';

const PRIMARY_MOUSE_BUTTON = 0;

export const Modal = ({ title, subtitle, dismissible = true, onClose, children }) => {
  const dialogRef = useRef(null);
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  const closeDialog = () => dialogRef.current.close();

  const isOnBackdrop = (event) => event.target === dialogRef.current;

  const rememberWherePressStarted = (event) => {
    pressStartedOnBackdrop.current = event.button === PRIMARY_MOUSE_BUTTON && isOnBackdrop(event);
  };

  const closeOnBackdropRelease = (event) => {
    if (dismissible && pressStartedOnBackdrop.current && isOnBackdrop(event)) closeDialog();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="dialog"
      closedby={dismissible ? undefined : 'none'}
      onClose={onClose}
      onMouseDown={rememberWherePressStarted}
      onMouseUp={closeOnBackdropRelease}
    >
      <div className="dialog__panel">
        <header className="dialog__head">
          <div>
            <h2 className="dialog__title">{title}</h2>
            {subtitle && <p className="dialog__sub">{subtitle}</p>}
          </div>

          <button
            type="button"
            className="dialog__close"
            aria-label="Close"
            disabled={!dismissible}
            onClick={closeDialog}
          >
            <Icon name="close" />
          </button>
        </header>

        {children}
      </div>

      <ToastAnnouncement />
    </dialog>,
    document.body,
  );
};
