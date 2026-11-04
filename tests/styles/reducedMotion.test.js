import path from 'node:path';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

const css = sass.compile(path.resolve('src/styles/main.scss'), { style: 'compressed' }).css;

const motionRuleFor = (selectorStart) => {
  const ruleStart = css.indexOf(selectorStart);

  return ruleStart < 0 ? '' : css.slice(ruleStart, css.indexOf('}', ruleStart));
};

describe('reduced motion styles', () => {
  it('turns motion off for the setting', () => {
    expect(motionRuleFor(':root[data-reduce-motion] *')).toMatch(/transition:none ?!important/);
    expect(motionRuleFor(':root[data-reduce-motion] *')).toMatch(/animation:none ?!important/);
  });

  it('turns motion off for the Windows setting too', () => {
    expect(css).toMatch(/@media ?\(prefers-reduced-motion: ?reduce\)\{[^}]*transition:none/);
  });

  it('covers pseudo-elements, which a plain * misses', () => {
    expect(motionRuleFor(':root[data-reduce-motion] *')).toContain(':root[data-reduce-motion] ::before');
    expect(motionRuleFor(':root[data-reduce-motion] *')).toContain(':root[data-reduce-motion] ::after');
  });

  it('keeps the loading spinners turning and skeletons pulsing, so loading never looks frozen', () => {
    expect(motionRuleFor(':root[data-reduce-motion] *')).toContain('.player__spinner');
    expect(motionRuleFor(':root[data-reduce-motion] *')).toContain('.startup-screen__spinner');
    expect(motionRuleFor(':root[data-reduce-motion] *')).toContain('.skeleton');
    expect(motionRuleFor(':root[data-reduce-motion] .skeleton')).toMatch(/animation:skeleton-pulse .*!important/);
  });

  it('pulses skeletons for the Windows setting too', () => {
    expect(css).toMatch(/@media ?\(prefers-reduced-motion: ?reduce\)\{[^@]*\.skeleton\{animation:skeleton-pulse/);
  });
});
