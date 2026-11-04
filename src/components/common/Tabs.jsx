import { Icon } from '@/components/common/Icon';
import { useArrowKeySelection } from '@/hooks/useArrowKeySelection';
import { cx } from '@/utils/classNames';

export const tabElementId = (panelId, tabId) => `${panelId}-tab-${tabId}`;

export const Tabs = ({ tabs, value, onChange, label, panelId }) => {
  const selectWithArrowKeys = useArrowKeySelection(
    tabs.map((tab) => tab.id),
    value,
    onChange,
  );

  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={selectWithArrowKeys}>
      {tabs.map((tab) => {
        const isSelected = tab.id === value;

        return (
          <button
            key={tab.id}
            id={panelId ? tabElementId(panelId, tab.id) : undefined}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={panelId}
            tabIndex={isSelected ? 0 : -1}
            className={cx('tabs__tab', isSelected && 'is-active')}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <Icon name={tab.icon} />}
            {tab.label}
            {tab.hint != null && <small>{tab.hint}</small>}
          </button>
        );
      })}
    </div>
  );
};
