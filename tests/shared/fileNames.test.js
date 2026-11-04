import { describe, expect, it } from 'vitest';
import { MAX_NAME_LENGTH, safeName } from '@shared/fileNames';

describe('safeName', () => {
  it('removes characters Windows forbids and collapses spaces', () => {
    expect(safeName('Mob  Psycho: 100?')).toBe('Mob Psycho 100');
  });

  it('drops a dot or space at the end, which Windows cannot open', () => {
    expect(safeName('Your Name.')).toBe('Your Name');
    expect(safeName('Gintama...')).toBe('Gintama');
    expect(safeName(`${'a'.repeat(MAX_NAME_LENGTH - 1)} and more`)).toBe('a'.repeat(MAX_NAME_LENGTH - 1));
    expect(safeName('Dr. Stone')).toBe('Dr. Stone');
  });

  it('limits the length', () => {
    expect(safeName('a'.repeat(MAX_NAME_LENGTH + 10))).toHaveLength(MAX_NAME_LENGTH);
  });

  it('never returns a name that points at a parent folder', () => {
    expect(safeName('..')).toBe('Untitled');
    expect(safeName('.')).toBe('Untitled');
    expect(safeName('../..')).toBe('Untitled');
  });

  it('falls back when nothing is left', () => {
    expect(safeName('???')).toBe('Untitled');
  });
});
