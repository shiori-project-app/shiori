import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { Toast } from '@/components/common/Toast';
import { TOAST_MS } from '@/config/app.config';
import { useLiveAnnouncement } from '@/hooks/useLiveAnnouncement';
import { onUserDataSaveFailure } from '@/api/services/userDataStore';
import { onStorageWriteFailure } from '@/utils/storage';

const STORAGE_FAILURE_TOAST_MS = 8000;

const STORAGE_FAILURE_MESSAGE =
  'Shiori couldn’t save your latest changes because its storage is full. Export a backup in Settings → Backup.';

const USER_DATA_FAILURE_MESSAGE =
  'Shiori couldn’t save your library to disk. Check that the drive isn’t full, then export a backup in Settings → Backup.';

export const ToastContext = createContext(null);
export const ToastAnnouncementContext = createContext('');

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ message: '', visible: false, shownCount: 0 });
  const hideTimer = useRef(0);
  const reportedFailureMessages = useRef(new Set());
  const { announcement, announce, clearAnnouncement } = useLiveAnnouncement();

  const hideToast = useCallback(() => {
    setToast((current) => ({ ...current, visible: false }));
    clearAnnouncement();
  }, [clearAnnouncement]);

  const showToast = useCallback(
    (message, durationMs = TOAST_MS) => {
      setToast((current) => ({ message, visible: true, shownCount: current.shownCount + 1 }));
      announce(message);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(hideToast, durationMs);
    },
    [announce, hideToast],
  );

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
      <ToastAnnouncementContext value={announcement}>
        {children}
        <Toast message={toast.message} visible={toast.visible} shownCount={toast.shownCount} />
      </ToastAnnouncementContext>
    </ToastContext>
  );
};
