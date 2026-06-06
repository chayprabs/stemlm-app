import { describe, it, expect } from 'vitest';
import { mountSvgMarkup } from './mount-svg';

describe('mountSvgMarkup', () => {
  it('inserts parsed svg nodes into the container', () => {
    const host = document.createElement('div');
    const ok = mountSvgMarkup(
      host,
      '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><text x="1" y="10">mounted</text></svg>',
    );
    expect(ok).toBe(true);
    expect(host.querySelector('svg text')?.textContent).toBe('mounted');
  });
});
