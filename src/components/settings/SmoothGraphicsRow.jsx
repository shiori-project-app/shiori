import { Switch } from '@/components/common/Switch';
import { SettingsRow } from '@/components/settings/SettingsSection';
import { useSettings } from '@/hooks/useSettings';

const TITLE = 'Smoother scrolling and faster seeking';

const DESCRIPTION =
  'Try this if scrolling feels choppy or skipping through a video is slow. Shiori then draws its window with the CPU instead of the graphics card, so it uses more CPU and can make scrolling worse on slower PCs.';

export const SmoothGraphicsRow = () => {
  const { smoothGraphics, smoothGraphicsAtLaunch, updateGraphics, restartApp } = useSettings();

  const needsRestart = smoothGraphics !== smoothGraphicsAtLaunch;

  return (
    <SettingsRow title={TITLE} description={DESCRIPTION}>
      <div className="settings-row__actions">
        {needsRestart && (
          <button type="button" className="btn btn--primary btn--sm" onClick={restartApp}>
            Restart to apply
          </button>
        )}

        <Switch
          label={TITLE}
          checked={smoothGraphics}
          onChange={() => updateGraphics({ smoothGraphics: !smoothGraphics })}
        />
      </div>
    </SettingsRow>
  );
};
