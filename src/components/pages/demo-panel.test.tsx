import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DemoPanel } from '@/entrypoints/welcome/DemoPanel';
import { DEMO_CAPSULE, DEMO_QUESTION } from './demo-answer';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 220)); });
const kicker = () => container.querySelector('.slm-card-kicker')?.textContent;
const panel = () => container.querySelector<HTMLElement>('.slm-demo-panel')!;
const key = (name: string) => act(() => {
  panel().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
});

beforeEach(async () => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<DemoPanel capsule={DEMO_CAPSULE!} question={DEMO_QUESTION} theme="light" />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('welcome demo panel', () => {
  it('opens on step 1 with the question, built from the panel parts', () => {
    expect(kicker()).toBe('Step 1of 5');
    expect(container.querySelector('.slm-topic')?.textContent).toContain('5.0 kg block');
    expect(container.querySelector('.slm-card-title')?.textContent).toBe('Draw the forces on the block');
    expect(panel().tabIndex).toBe(0);
    expect(panel().getAttribute('aria-label')).toMatch(/demo/i);
  });

  it('navigates with a horizontal strip of numbered marks and has no outline of titles', () => {
    const marks = container.querySelectorAll('.slm-step-rail-btn');
    expect(marks).toHaveLength(5);
    for (const mark of marks) expect(mark.textContent).toBe('');
    expect(container.querySelector('nav[aria-label="Solution steps"]')).toBeTruthy();
    expect(container.querySelector('.slm-step-rail-title')).toBeNull();
  });

  it('moves between steps with the arrow keys and stops at both ends', async () => {
    key('ArrowLeft');
    await settle();
    expect(kicker()).toBe('Step 1of 5');
    key('ArrowRight');
    await settle();
    expect(kicker()).toBe('Step 2of 5');
    for (let i = 0; i < 4; i++) {
      key('ArrowRight');
      await settle();
    }
    expect(kicker()).toBe('Step 5of 5');
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next step"]')!.disabled).toBe(true);
    // The last step closes with the model's own answer.
    expect(container.querySelector('.slm-answer')?.textContent).toContain('Answer');
  });

  it('moves with the buttons and the marks, and marks where the reader is', async () => {
    const prev = container.querySelector<HTMLButtonElement>('[aria-label="Previous step"]')!;
    const next = container.querySelector<HTMLButtonElement>('[aria-label="Next step"]')!;
    expect(prev.disabled).toBe(true);
    act(() => next.click());
    await settle();
    expect(kicker()).toBe('Step 2of 5');
    expect(prev.disabled).toBe(false);
    act(() => container.querySelectorAll<HTMLButtonElement>('.slm-step-rail-btn')[3]!.click());
    await settle();
    expect(kicker()).toBe('Step 4of 5');
    expect(container.querySelector('[aria-current="step"]')?.getAttribute('aria-label')).toMatch(/^Step 4:/);
    // Like the real panel, the place is shown once: by the kicker and the strip, not a footer counter.
    expect(container.querySelector('.slm-stepnav-count')).toBeNull();
  });

  it('keeps a quick check answer back until it is asked for', async () => {
    act(() => container.querySelectorAll<HTMLButtonElement>('.slm-step-rail-btn')[1]!.click());
    await settle();
    expect(container.querySelector('.slm-quickcheck')).toBeTruthy();
    expect(container.querySelector('.slm-quickcheck-a')).toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('.slm-quickcheck-reveal')!.click());
    await settle();
    expect(container.querySelector('.slm-quickcheck-a')?.textContent).toContain('Smaller');
  });

  it('leaves out what needs a chat page: no Ask in chat, save or export', () => {
    expect(container.querySelector('.slm-followup')).toBeNull();
    expect(container.textContent).not.toMatch(/Ask in chat|Copy/);
    expect(container.querySelector('.slm-icon-btn--save')).toBeNull();
  });
});
