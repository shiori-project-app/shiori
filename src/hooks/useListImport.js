import { useState } from 'react';
import { useLibrary } from '@/hooks/useLibrary';

export const IMPORT_PHASES = { idle: 'idle', running: 'running', done: 'done', error: 'error' };

const IDLE_STATUS = { phase: IMPORT_PHASES.idle };

export const useListImport = () => {
  const { importList } = useLibrary();

  const [importStatus, setImportStatus] = useState(IDLE_STATUS);

  const isRunning = importStatus.phase === IMPORT_PHASES.running;

  const reportProgress = (message) => setImportStatus({ phase: IMPORT_PHASES.running, message });

  const runImport = async (fetchEntries, userName) => {
    reportProgress('Starting…');

    try {
      const { entries, unmatched } = await fetchEntries(userName, reportProgress);

      setImportStatus({ phase: IMPORT_PHASES.done, total: entries.length, unmatched, ...importList(entries) });
    } catch (error) {
      setImportStatus({ phase: IMPORT_PHASES.error, message: error.message });
    }
  };

  const resetImport = () => setImportStatus(IDLE_STATUS);

  return { importStatus, isRunning, runImport, resetImport };
};
