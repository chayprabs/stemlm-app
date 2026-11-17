/**
 * Finding your place in an answer: the strip of marks, the counter in the bar, follow-up answers
 * between steps, and the switch between the questions of one chat.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Panel } from './Panel';
import { StepList } from './StepList';
import { Loading } from './Loading';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { buildStepEntries } from '@/src/lib/step-entries';
import type { Session, Step } from '@/src/protocol/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: vi.fn(async () => ({ prunedCount: 0 })),
  deleteSavedSession: vi.fn(async () => undefined),
  isSessionSaved: vi.fn(async () => false),
  refreshSavedSession: vi.fn(async () => false),
}));
vi.mock('wxt/browser', () => ({ browser: { runtime: { getURL: (path: string) => `chrome-extension://test/${path}` } } }));

// Framer Motion reads the reduced-motion preference once per page; the tests switch it per case.
const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const step = (n: number): Step => ({ id: `s${n}`, index: n, title: `Step title ${n}`, body: `Working of step ${n}.` });

function buildSession(steps: number, patch: Partial<Session> = {}): Session {
  return {
    id: 'nav',
    createdAt: 0,
    updatedAt: 0,
    platform: 'claude',
    question: 'Solve it.',
    raw: '',
    capsule: {
      meta: { version: 2, subject: 'Math', topic: 'Navigation' },
      solution: 'Done.',
      solutionDiagrams: [],
      steps: Array.from({ length: steps }, (_, i) => step(i + 1)),
    },
    ...patch,
  };
}

/** A session whose first step has one Ask-in-chat answer hanging after it. */
function withFollowup(): Session {
  return buildSession(3, {
    followups: [{
      id: 'f1',
      anchorStepId: 's1',
      question: 'Why is that allowed?',
      createdAt: 1,
      capsule: {
        meta: { version: 2, subject: 'Math', topic: 'Why it is allowed', mode: 'resolve' },
        solution: 'Because both sides change equally.',
        solutionDiagrams: [],
        steps: [{ id: 'r1', index: 1, title: 'Both sides change equally', body: 'Adding the same number keeps the balance.', takeaway: 'Do the same to both sides.' }],
      },
    }],
  });
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

beforeEach(() => {
  motionPreference.reduced = false;
  useStore.getState().resetSessions();
  useStore.setState({ panelOpen: true, status: 'ready', errorMessage: undefined, view: 'steps', theme: 'light', settings: DEFAULT_SETTINGS, activeStepIndex: 0 });
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  useStore.getState().resetSessions();
  useStore.setState({ panelOpen: false, status: 'idle' });
  vi.restoreAllMocks();
});

function mount(ui: React.ReactNode = <Panel />): HTMLDivElement {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

async function turnPage(index: number) {
  act(() => useStore.getState().setActiveStep(index));
  await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
}

const counter = (el: HTMLElement) => el.querySelector('.slm-stepnav-count')?.textContent;

describe('finding your place', () => {
  it('agrees in three places: the mark, the page kicker and the counter', async () => {
    useStore.getState().addSession(buildSession(4));
    const el = mount();
    for (const index of [0, 2, 3]) {
      await turnPage(index);
      const current = el.querySelector('.slm-step-rail-btn[aria-current="step"]')!;
      expect(current.getAttribute('aria-label')).toBe(`Step ${index + 1}: Step title ${index + 1}`);
      expect(el.querySelector('.slm-card-kicker')?.textContent).toBe(`Step ${index + 1}of 4`);
      expect(counter(el)).toBe(`${index + 1}/ 4`);
    }
    expect((el.querySelector('button[aria-label="Next step"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('counts steps, not pages: a follow-up answer belongs to the step it was asked about', async () => {
    useStore.getState().addSession(withFollowup());
    const el = mount();
    // Strip: 1, the follow-up, 2, 3.
    const marks = [...el.querySelectorAll<HTMLButtonElement>('.slm-step-rail-btn')];
    expect(marks.map((mark) => mark.getAttribute('aria-label'))).toEqual([
      'Step 1: Step title 1',
      'Follow-up answer after step 1: Why is that allowed?',
      'Step 2: Step title 2',
      'Step 3: Step title 3',
    ]);
    expect(counter(el)).toBe('1/ 3');

    await turnPage(1);
    expect(el.querySelector('.slm-card--followup')).toBeTruthy();
    expect(el.querySelector('.slm-followup-card-kicker')?.textContent).toBe('Follow-up · after step 1');
    expect(counter(el)).toBe('1/ 3');
    expect(marks[1]!.getAttribute('aria-current')).toBe('step');
    expect(marks[1]!.closest('li')?.classList.contains('slm-step-rail-item--followup')).toBe(true);

    // The next real step is step 2 of 3 everywhere, although it is the third page.
    await turnPage(2);
    expect(el.querySelector('.slm-card-kicker')?.textContent).toBe('Step 2of 3');
    expect(counter(el)).toBe('2/ 3');

    await turnPage(3);
    expect(counter(el)).toBe('3/ 3');
    expect((el.querySelector('button[aria-label="Next step"]') as HTMLButtonElement).disabled).toBe(true);
    expect((el.querySelector('button[aria-label="Previous step"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('draws a follow-up\'s closing answer as the answer block, leaving the takeaway the only ruled note', async () => {
    useStore.getState().addSession(withFollowup());
    const el = mount();
    await turnPage(1);
    const card = el.querySelector('.slm-card--followup')!;
    const answer = card.querySelector('.slm-answer')!;
    expect(answer.getAttribute('aria-label')).toBe('Answer');
    expect(answer.querySelector('.slm-answer-label')?.textContent).toBe('Answer');
    expect(answer.textContent).toContain('Because both sides change equally.');
    expect(card.querySelectorAll('.slm-takeaway')).toHaveLength(1);
    expect(answer.querySelector('.slm-takeaway-label')).toBeNull();
    // It keeps its own Ask in chat, so questions can chain.
    expect(card.querySelector('.slm-followup .slm-followup-action--ask')).toBeTruthy();
  });
});

describe('step strip', () => {
  function stubGeometry(itemWidth = 40, stripWidth = 200) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('slm-step-rail')) {
        return { left: 0, right: stripWidth, width: stripWidth, top: 0, bottom: 40, height: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      }
      if (this.classList.contains('slm-step-rail-item')) {
        const index = [...this.parentElement!.children].indexOf(this);
        const left = index * itemWidth;
        return { left, right: left + itemWidth, width: itemWidth, top: 0, bottom: 40, height: 40, x: left, y: 0, toJSON: () => ({}) } as DOMRect;
      }
      return { left: 0, right: 0, width: 0, top: 0, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
  }

  it('keeps the current mark in the middle of the strip, scrolling only the strip', () => {
    stubGeometry();
    const scrollBy = vi.fn();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, writable: true, value: scrollBy });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value: scrollIntoView });
    const entries = buildStepEntries(buildSession(14));

    const el = mount(<StepList entries={entries} activeIndex={0} onSelect={() => {}} />);
    expect(el.querySelectorAll('.slm-step-rail-btn')).toHaveLength(14);
    // Mark 1 spans 0..40 in a 200 wide strip: its centre is 80 left of the strip's.
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -80 }));

    act(() => root!.render(<StepList entries={entries} activeIndex={9} onSelect={() => {}} />));
    // Mark 10 spans 360..400: its centre is 280 right of the strip's.
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: 280 }));
    // scrollIntoView would also move the page and the chat behind the panel.
    expect(scrollIntoView).not.toHaveBeenCalled();
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy');
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  });

  it('glides to the current mark, and jumps instead under reduced motion', () => {
    stubGeometry();
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, writable: true, value: scrollBy });
    const entries = buildStepEntries(buildSession(6));
    mount(<StepList entries={entries} activeIndex={3} onSelect={() => {}} />);
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    act(() => root?.unmount());
    host?.remove();

    motionPreference.reduced = true;
    mount(<StepList entries={entries} activeIndex={3} onSelect={() => {}} />);
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }));
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy');
  });

  it('selects a step from its mark and names every mark for assistive technology', () => {
    const onSelect = vi.fn();
    const entries = buildStepEntries(buildSession(14));
    const el = mount(<StepList entries={entries} activeIndex={12} onSelect={onSelect} />);
    const nav = el.querySelector('nav.slm-step-rail')!;
    expect(nav.getAttribute('aria-label')).toBe('Solution steps');
    const marks = [...el.querySelectorAll<HTMLButtonElement>('.slm-step-rail-btn')];
    expect(marks[13]!.getAttribute('aria-label')).toBe('Step 14: Step title 14');
    expect(marks[13]!.getAttribute('title')).toBe('Step title 14');
    // The numeral is decoration beside that name.
    for (const mark of marks) expect(mark.querySelector('.slm-step-rail-mark')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('.is-past')).toHaveLength(12);
    expect(el.querySelectorAll('.is-active')).toHaveLength(1);
    act(() => marks[13]!.click());
    expect(onSelect).toHaveBeenCalledWith(13);
  });

  it('tells the strip how wide the page\'s scrollbar gutter is, to stay on the reading column', () => {
    // The page is 640 wide and its content box 628: a 12px scrollbar gutter.
    const widths = { offsetWidth: 640, clientWidth: 628 } as const;
    const restore = (Object.keys(widths) as Array<keyof typeof widths>).map((name) => {
      const owner = [HTMLElement.prototype, Element.prototype].find((proto) => Object.getOwnPropertyDescriptor(proto, name)) ?? HTMLElement.prototype;
      const original = Object.getOwnPropertyDescriptor(owner, name);
      Object.defineProperty(owner, name, { configurable: true, get(this: Element) { return this.classList.contains('slm-read') ? widths[name] : 0; } });
      return () => (original ? Object.defineProperty(owner, name, original) : Reflect.deleteProperty(owner, name));
    });
    useStore.getState().addSession(buildSession(3));
    const el = mount();
    expect((el.querySelector('.slm-panel') as HTMLElement).style.getPropertyValue('--slm-scroll-gutter')).toBe('12px');
    restore.forEach((undo) => undo());
  });
});

describe('questions of one chat', () => {
  it('lists them above the question being read, inside the header', () => {
    const first = buildSession(2, { id: 'q-one', question: 'First question' });
    const second = buildSession(2, { id: 'q-two', question: 'Second question' });
    second.capsule = { ...second.capsule, meta: { ...second.capsule.meta, topic: 'Second topic' } };
    useStore.getState().addSession(first);
    useStore.getState().addSession(second);
    const el = mount();

    const header = el.querySelector('.slm-header')!;
    const list = header.querySelector('.slm-session-switch')!;
    const question = header.querySelector('.slm-header-title')!;
    const bar = header.querySelector('.slm-header-bar')!;
    expect(list).toBeTruthy();
    expect(bar.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(list.compareDocumentPosition(question) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // So the two numbered rows, questions and steps, are never stacked on each other.
    expect(list.compareDocumentPosition(el.querySelector('.slm-step-rail')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(question.compareDocumentPosition(el.querySelector('.slm-step-rail')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(list.getAttribute('role')).toBe('group');
    expect(list.getAttribute('aria-label')).toBe('Questions in this chat');
    const pills = [...list.querySelectorAll<HTMLButtonElement>('.slm-session-pill')];
    expect(pills.map((pill) => pill.textContent)).toEqual(['1. Navigation', '2. Second topic']);
    expect(pills[1]!.getAttribute('aria-current')).toBe('true');
    expect(pills[0]!.getAttribute('aria-current')).toBeNull();
    expect(question.textContent).toContain('Second question');

    act(() => pills[0]!.click());
    expect(pills[0]!.getAttribute('aria-current')).toBe('true');
    expect(header.querySelector('.slm-header-title')?.textContent).toContain('First question');
  });

  it('shows no list for a single question', () => {
    useStore.getState().addSession(buildSession(2));
    const el = mount();
    expect(el.querySelector('.slm-session-switch')).toBeNull();
  });
});

describe('loading', () => {
  it('has the shape of the page that is coming: a row of marks above one column', () => {
    const el = mount(<Loading theme="dark" />);
    const status = el.querySelector('.slm-loading')!;
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Reading response');
    expect(status.textContent).toContain('The steps appear here when the chat finishes its answer.');
    const strip = status.querySelector('.slm-loading-strip')!;
    const page = status.querySelector('.slm-loading-page')!;
    expect(strip.querySelectorAll('.slm-sk-dot').length).toBeGreaterThanOrEqual(3);
    expect(strip.compareDocumentPosition(page) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(page.querySelector('.slm-sk-dot')).toBeNull();
    // Placeholders are for the eye only.
    expect(strip.getAttribute('aria-hidden')).toBe('true');
    expect(page.querySelector('.slm-skeleton-card')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.slm-loading-rail')).toBeNull();
  });
});
