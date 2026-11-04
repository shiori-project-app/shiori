import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scanLibrary } from '@/api/clients/desktopClient';
import { useDownloads } from '@/hooks/useDownloads';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';
import { isSameScan } from '@/utils/libraryScan';

const EMPTY_SCAN = { root: '', files: [] };
const FOCUS_RESCAN_MIN_INTERVAL_MS = 15000;
const UNREACHABLE_NOTICE_MS = 10000;

export const LocalFilesContext = createContext(null);

export const LocalFilesProvider = ({ children }) => {
  const { downloadDir } = useSettings();
  const { downloads } = useDownloads();

  const [scan, setScan] = useState(EMPTY_SCAN);

  const showToast = useToast();

  const lastScanStartedAt = useRef(0);

  const rescan = useCallback(async () => {
    if (!window.shiori) return EMPTY_SCAN;

    lastScanStartedAt.current = Date.now();

    try {
      const scanResult = await scanLibrary();

      setScan((currentScan) => (isSameScan(currentScan, scanResult) ? currentScan : scanResult));

      return scanResult;
    } catch {
      return { ...EMPTY_SCAN, isUnreachable: true };
    }
  }, []);

  const completedDownloadCount = downloads.filter((download) => download.state === 'completed').length;

  useEffect(() => {
    rescan();
  }, [rescan, downloadDir, completedDownloadCount]);

  useEffect(() => {
    const rescanIfStale = () => {
      if (Date.now() - lastScanStartedAt.current >= FOCUS_RESCAN_MIN_INTERVAL_MS) rescan();
    };

    window.addEventListener('focus', rescanIfStale);

    return () => window.removeEventListener('focus', rescanIfStale);
  }, [rescan]);

  useEffect(() => {
    if (scan.isUnreachable) {
      showToast(`Your download folder can’t be reached: ${scan.root}. Is the drive connected?`, UNREACHABLE_NOTICE_MS);
    }
  }, [scan.isUnreachable, scan.root, showToast]);

  const value = useMemo(() => ({ ...scan, rescan }), [scan, rescan]);

  return <LocalFilesContext value={value}>{children}</LocalFilesContext>;
};
