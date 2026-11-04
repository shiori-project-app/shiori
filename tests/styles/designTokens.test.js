import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const STYLES_FOLDER = path.resolve('src/styles');
const FOLDERS_THAT_DEFINE_TOKENS = ['abstracts', 'themes'];

const scssFilesIn = (folder) =>
  fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(folder, entry.name);

    if (entry.isDirectory()) return scssFilesIn(entryPath);

    return entry.name.endsWith('.scss') ? [entryPath] : [];
  });

const definesTokens = (file) =>
  FOLDERS_THAT_DEFINE_TOKENS.some((folder) => path.relative(STYLES_FOLDER, file).startsWith(folder));

const linesMatching = (pattern) =>
  scssFilesIn(STYLES_FOLDER)
    .filter((file) => !definesTokens(file))
    .flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          pattern.test(line) ? [`${path.relative(STYLES_FOLDER, file)}:${index + 1} ${line.trim()}`] : [],
        ),
    );

describe('design tokens', () => {
  it('sizes text in rem through font variables', () => {
    const literalSizes = linesMatching(/font-size:\s*[\d.]+(px|rem)/);

    expect(literalSizes).toEqual([]);
  });

  it('only sizes video captions relative to the video', () => {
    const relativeSizes = linesMatching(/font-size:\s*[\d.]+em/);

    expect(relativeSizes).toHaveLength(1);

    const captionsFile = fs.readFileSync(path.join(STYLES_FOLDER, relativeSizes[0].split(':')[0]), 'utf8');

    expect(captionsFile).toMatch(/&__video::cue/);
  });

  it('takes font weights from variables', () => {
    expect(linesMatching(/font-weight:\s*\d/)).toEqual([]);
  });

  it('takes border radii from variables', () => {
    expect(linesMatching(/(border-radius|--frame-radius):[^;]*[1-9]\d*(px|%)/)).toEqual([]);
  });

  it('takes colours from variables or the theme', () => {
    expect(linesMatching(/#[0-9a-fA-F]{3,8}\b(?!\{)|rgba?\(\s*\d/)).toEqual([]);
  });

  it('takes box shadows from variables', () => {
    expect(linesMatching(/box-shadow:\s*[^$v\sn]/)).toEqual([]);
  });

  it('uses a font mixin when a rule sets both size and weight', () => {
    const rulesSettingBoth = scssFilesIn(STYLES_FOLDER)
      .filter((file) => !definesTokens(file))
      .filter((file) => /font-size: \$font-[\w-]+;\s*\n\s*font-weight: \$weight-/.test(fs.readFileSync(file, 'utf8')));

    expect(rulesSettingBoth).toEqual([]);
  });
});
