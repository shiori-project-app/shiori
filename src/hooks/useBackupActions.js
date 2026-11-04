import { useCallback, useState } from 'react';
import { autoBackup, openBackup, saveExport } from '@/api/clients/desktopClient';
import { buildMalExport } from '@/api/services/listExportService';
import { restoreBackupData, snapshotForBackup } from '@/api/services/userDataStore';
import { useLibrary } from '@/hooks/useLibrary';
import { useToast } from '@/hooks/useToast';
import { createBackup, parseBackup } from '@/utils/backup';
import { pluralize, todayAsIsoDate } from '@/utils/format';

export const BACKUP_ACTIONS = { backup: 'backup', restore: 'restore', listExport: 'list-export' };

const exportedListMessage = (count, skippedTitles) => {
  const skippedNote = skippedTitles.length ? ` · ${skippedTitles.length} without a MyAnimeList id left out` : '';

  return `Exported ${pluralize(count, 'title')}${skippedNote}`;
};

export const useBackupActions = () => {
  const { list, watched } = useLibrary();
  const showToast = useToast();

  const [runningAction, setRunningAction] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [backupAwaitingConfirmation, setBackupAwaitingConfirmation] = useState(null);

  const runAction = useCallback(async (actionName, task) => {
    setRunningAction(actionName);
    setErrorMessage(null);

    try {
      await task();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setRunningAction(null);
    }
  }, []);

  const exportBackup = () =>
    runAction(BACKUP_ACTIONS.backup, async () => {
      const content = createBackup(snapshotForBackup());

      const savedPath = await saveExport({
        kind: 'backup',
        fileName: `shiori-backup-${todayAsIsoDate()}.json`,
        content,
      });

      if (savedPath) showToast(`Backup saved to ${savedPath}`);
    });

  const chooseBackupFile = () =>
    runAction(BACKUP_ACTIONS.restore, async () => {
      const backupFile = await openBackup();

      if (backupFile) setBackupAwaitingConfirmation({ ...parseBackup(backupFile.text), path: backupFile.path });
    });

  const confirmRestore = useCallback(
    () =>
      runAction(BACKUP_ACTIONS.restore, async () => {
        await autoBackup(createBackup(snapshotForBackup()));
        await restoreBackupData(backupAwaitingConfirmation.data);
        window.location.reload();
      }),
    [runAction, backupAwaitingConfirmation],
  );

  const cancelRestore = useCallback(() => {
    setBackupAwaitingConfirmation(null);
    setErrorMessage(null);
  }, []);

  const exportListForMal = () =>
    runAction(BACKUP_ACTIONS.listExport, async () => {
      const { xml, count, skipped } = await buildMalExport(list, watched);

      if (!count) throw new Error('None of the titles in My List have a MyAnimeList id to export.');

      const savedPath = await saveExport({
        kind: 'mal',
        fileName: `shiori-list-${todayAsIsoDate()}.xml`,
        content: xml,
      });

      if (savedPath) showToast(exportedListMessage(count, skipped));
    });

  return {
    listSize: Object.keys(list).length,
    runningAction,
    errorMessage,
    backupAwaitingConfirmation,
    exportBackup,
    chooseBackupFile,
    confirmRestore,
    cancelRestore,
    exportListForMal,
  };
};
