import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { Toast } from '@/components/common/Toast';
import { TOAST_MS } from '@/config/app.config';
import { onUserDataSaveFailure } from '@/api/services/userDataStore';
import { onStorageWriteFailure } from '@/utils/storage';

const STORAGE_FAILURE_TOAST_MS = 8000;

const STORAGE_FAILURE_MESSAGE =
  'Shiori couldn’t save your latest changes because its storage is full. Export a backup in Settings → Backup.';

const USER_DATA_FAILURE_MESSAGE =
  'Shiori couldn’t save your library to disk. Check that the drive isn’t full, then export a backup in Settings → Backup.';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ message: '', visible: false });
  const hideTimer = useRef(0);
  const reportedFailureMessages = useRef(new Set());

  const showToast = useCallback((message, durationMs = TOAST_MS) => {
    setToast({ message, visible: true });
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setToast((current) => ({ ...current, visible: false })), durationMs);
  }, []);

  const reportFailureOnce = useCallback(
    (message) => {
      if (reportedFailureMessages.current.has(message)) return;

      reportedFailureMessages.current.add(message);
      showToast(message, STORAGE_FAILURE_TOAST_MS);
    },
    [showToast],
  );

  useEffect(() => {
    const unsubscribeFromStorage = onStorageWriteFailure(() => reportFailureOnce(STORAGE_FAILURE_MESSAGE));
    const unsubscribeFromUserData = onUserDataSaveFailure(() => reportFailureOnce(USER_DATA_FAILURE_MESSAGE));

    return () => {
      unsubscribeFromStorage();
      unsubscribeFromUserData();
    };
  }, [reportFailureOnce]);

  return (
    <ToastContext value={showToast}>
      {children}
      <Toast message={toast.message} visible={toast.visible} />
    </ToastContext>
  );
};
