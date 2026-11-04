import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { tabElementId, Tabs } from '@/components/common/Tabs';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'display', label: 'Display' },
  { id: 'backup', label: 'Backup' },
];

const TabsWithState = () => {
  const [selectedSection, setSelectedSection] = useState('appearance');

  return (
    <Tabs tabs={SECTIONS} value={selectedSection} onChange={setSelectedSection} label="Sections" panelId="panel" />
  );
};

const SegmentedWithState = () => {
  const [period, setPeriod] = useState('day');

  return (
    <SegmentedControl
      label="Period"
      options={[
        { id: 'day', label: 'Today' },
        { id: 'week', label: 'Week' },
      ]}
      value={period}
      onChange={setPeriod}
    />
  );
};

describe('Tabs', () => {
  afterEach(cleanup);

  it('moves between tabs with the arrow keys and wraps around', () => {
    render(<TabsWithState />);

    const appearanceTab = screen.getByRole('tab', { name: 'Appearance' });

    fireEvent.keyDown(appearanceTab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Display' }).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Display' }));
    fireEvent.keyDown(document.activeElement, { key: 'End' });
    fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Appearance' }).getAttribute('aria-selected')).toBe('true');
  });

  it('keeps only the selected tab in the Tab order and links it to its panel', () => {
    render(<TabsWithState />);

    const appearanceTab = screen.getByRole('tab', { name: 'Appearance' });

    expect(appearanceTab.tabIndex).toBe(0);
    expect(screen.getByRole('tab', { name: 'Backup' }).tabIndex).toBe(-1);
    expect(appearanceTab.id).toBe(tabElementId('panel', 'appearance'));
    expect(appearanceTab.getAttribute('aria-controls')).toBe('panel');
  });
});

describe('SegmentedControl', () => {
  afterEach(cleanup);

  it('changes the choice with the arrow keys', () => {
    render(<SegmentedWithState />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Today' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('radio', { name: 'Week' }).getAttribute('aria-checked')).toBe('true');
  });
});
