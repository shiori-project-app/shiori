import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { changesForVersion, releaseNotes } from '../../.github/scripts/releaseNotes.js';

const CHANGELOG = `# Changelog

## 1.1.0

### Fixed

- Second change.

## 1.0.0

First release.
`;

describe('changesForVersion', () => {
  it('returns only that version’s section', () => {
    expect(changesForVersion(CHANGELOG, '1.1.0')).toBe('### Fixed\n\n- Second change.');
  });

  it('reads the last section to the end of the file', () => {
    expect(changesForVersion(CHANGELOG, '1.0.0')).toBe('First release.');
  });

  it('reads a changelog checked out with Windows line endings', () => {
    expect(changesForVersion(CHANGELOG.replaceAll('\n', '\r\n'), '1.0.0')).toBe('First release.');
  });

  it('stops a release with no changelog entry', () => {
    expect(() => changesForVersion(CHANGELOG, '2.0.0')).toThrow('no "## 2.0.0" section');
  });

  it('does not mistake one version for a longer one', () => {
    expect(() => changesForVersion(CHANGELOG, '1.1')).toThrow('no "## 1.1" section');
  });

  it('stops a release with an empty entry', () => {
    expect(() => changesForVersion('## 1.0.0\n\n## 0.9.0\n\nOld.', '1.0.0')).toThrow('is empty');
  });
});

describe('releaseNotes', () => {
  it('fills in every version and the changes', () => {
    expect(releaseNotes('v{{version}} and {{version}}: {{changes}}', CHANGELOG, '1.0.0')).toBe(
      'v1.0.0 and 1.0.0: First release.',
    );
  });

  it('leaves dollar signs in the changes alone', () => {
    expect(releaseNotes('{{changes}}', '## 1.0.0\n\nCosts $& nothing.', '1.0.0')).toBe('Costs $& nothing.');
  });

  it('works with the real template and the current version, so a release can’t fail on its notes', () => {
    const template = fs.readFileSync('.github/release-notes-template.md', 'utf8');
    const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
    const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    const notes = releaseNotes(template, changelog, version);

    expect(notes).toContain(`releases/download/v${version}/Shiori-Setup-${version}.exe`);
    expect(notes).not.toContain('{{');
  });
});
