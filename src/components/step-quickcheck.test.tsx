import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QuickCheck } from './QuickCheck';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { trackEventMock } = vi.hoisted(() => ({ trackEventMock: vi.fn(async () => undefined) }));
vi.mock('@/src/lib/analytics', () => ({ trackEvent: trackEventMock }));

const CHECK = { question: 'What does $F$ equal?', answer: 'Mass times acceleration, $F = ma$.' };

describe('QuickCheck', () => {
  let container: HTMLElement;
  let root: Root | undefined;

  beforeEach(() => {
    trackEventMock.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    root = undefined;
  });

  function mount(checkNumber?: number) {
    act(() => {
      root = createRoot(container);
      root.render(<QuickCheck check={CHECK} platform="claude" checkNumber={checkNumber} />);
    });
  }

  /** Let the reveal and hide transitions finish. */
  async function settle() {
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
  }

  const reveal = () => container.querySelector<HTMLButtonElement>('.slm-quickcheck-reveal');
  const hide = () => container.querySelector<HTMLButtonElement>('.slm-quickcheck-hide');

  it('asks first: the answer is not in the page until the student asks for it', () => {
    mount(3);
    const card = container.querySelector('section.slm-quickcheck')!;
    expect(card.getAttribute('aria-label')).toBe('Quick check 3');
    expect(card.querySelector('.slm-quickcheck-badge')?.textContent).toBe('Check 3');
    expect(card.querySelector('.slm-quickcheck-q')?.textContent).toContain('What does');
    expect(card.querySelector('.slm-quickcheck-q .katex')).toBeTruthy();
    expect(card.classList.contains('is-revealed')).toBe(false);
    // Not hidden with CSS: absent, so it cannot be read, selected or found by a screen reader.
    expect(container.textContent).not.toContain('Mass times acceleration');
    expect(container.querySelector('.slm-quickcheck-a')).toBeNull();
    expect(reveal()!.textContent).toContain('Reveal answer');
    expect(reveal()!.getAttribute('aria-expanded')).toBe('false');
    expect(card.querySelector('.slm-quickcheck-hint')?.textContent).toBe('Try it before you look');
  });

  it('numbers the check 1 when the step does not say', () => {
    mount();
    expect(container.querySelector('section.slm-quickcheck')?.getAttribute('aria-label')).toBe('Quick check 1');
    expect(container.querySelector('.slm-quickcheck-badge')?.textContent).toBe('Check 1');
  });

  it('reveals the answer in a labelled region and moves focus to it', async () => {
    mount(2);
    reveal()!.focus();
    act(() => reveal()!.click());
    await settle();

    const card = container.querySelector('section.slm-quickcheck')!;
    expect(card.classList.contains('is-revealed')).toBe(true);
    expect(reveal()).toBeNull();
    const answer = container.querySelector('.slm-quickcheck-a')!;
    const region = answer.querySelector('.slm-quickcheck-a-inner') as HTMLElement;
    expect(region.textContent).toContain('Mass times acceleration');
    expect(region.querySelector('.katex')).toBeTruthy();
    expect(region.getAttribute('role')).toBe('group');
    expect(region.getAttribute('aria-label')).toBe('Answer to check 2');
    expect(region.querySelector('.slm-quickcheck-a-label')?.textContent).toBe('Answer');
    // The pressed button is gone; focus follows to what replaced it instead of dropping to the page.
    expect(document.activeElement).toBe(region);
    // The control that closes it says what it controls.
    expect(hide()!.textContent).toBe('Hide answer');
    expect(hide()!.getAttribute('aria-expanded')).toBe('true');
    expect(hide()!.getAttribute('aria-controls')).toBe(answer.id);
    expect(answer.id).toMatch(/^slm-check-/);
  });

  it('hides the answer again for another try, and returns focus to Reveal', async () => {
    mount();
    act(() => reveal()!.click());
    await settle();
    hide()!.focus();
    act(() => hide()!.click());
    await settle();

    expect(container.querySelector('.slm-quickcheck-a')).toBeNull();
    expect(container.textContent).not.toContain('Mass times acceleration');
    expect(container.querySelector('section.slm-quickcheck')!.classList.contains('is-revealed')).toBe(false);
    expect(reveal()).toBeTruthy();
    expect(document.activeElement).toBe(reveal());

    act(() => reveal()!.click());
    await settle();
    expect(container.textContent).toContain('Mass times acceleration');
  });

  it('does not take focus when it first appears on a step', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    mount();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('counts a reveal once per reveal, never a hide', async () => {
    mount();
    act(() => reveal()!.click());
    await settle();
    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith('quickcheck_revealed', { platform: 'claude' });
    act(() => hide()!.click());
    await settle();
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it('keeps each check\'s answer id its own when a page has several', () => {
    act(() => {
      root = createRoot(container);
      root.render(
        <>
          <QuickCheck check={CHECK} checkNumber={1} />
          <QuickCheck check={CHECK} checkNumber={2} />
        </>,
      );
    });
    const buttons = [...container.querySelectorAll<HTMLButtonElement>('.slm-quickcheck-reveal')];
    act(() => buttons.forEach((button) => button.click()));
    const ids = [...container.querySelectorAll('.slm-quickcheck-a')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
