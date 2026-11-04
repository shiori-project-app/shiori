import { useEffect, useRef } from 'react';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { usePageVisible } from '@/hooks/usePageVisible';
import { useToast } from '@/hooks/useToast';
import { updateAvailableMessage, updateReadyMessage } from '@/utils/updateStatus';
import { UPDATE_PHASES } from '@shared/updatePhases';

const MESSAGE_MS = 10000;

const MESSAGE_BY_PHASE = {
  [UPDATE_PHASES.available]: updateAvailableMessage,
  [UPDATE_PHASES.ready]: updateReadyMessage,
};

export const UpdateNotifier = () => {
  const update = useAppUpdate();
  const isPageVisible = usePageVisible();
  const showToast = useToast();
  const lastNotice = useRef(null);

  useEffect(() => {
    if (!update || !isPageVisible) return;

    const buildMessage = MESSAGE_BY_PHASE[update.phase];
    const notice = `${update.phase}:${update.availableVersion}`;

    if (!buildMessage || lastNotice.current === notice) return;

    lastNotice.current = notice;
    showToast(buildMessage(update), MESSAGE_MS);
  }, [update, isPageVisible, showToast]);

  return null;
};
