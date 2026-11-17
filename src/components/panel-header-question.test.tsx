/**
 * The header's question block (label, two-line clamp, Show more / Show less) and the Steps /
 * Solution switch as a keyboard tablist.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PanelHeader } from './PanelHeader';
import { Panel } from './Panel';
import { useStore, type PanelView } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import type { Session } from '@/src/protocol/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: vi.fn(async () => ({ prunedCount: 0 })),
  deleteSavedSession: vi.fn(async () => undefined),
  isSessionSaved: vi.fn(async () => false),
  refreshSavedSession: vi.fn(async () => false),
}));
vi.mock('wxt/browser', () => ({ browser: { runtime: { getURL: (path: string) => `chrome-extension://test/${path}` } } }));

const TWO_LINES = 47;

function buildSession(patch: Partial<Session> = {}, meta: Partial<Session['capsule']['meta']> = {}): Session {
  return {
    id: 'header-question',
    createdAt: 0,
    updatedAt: 0,
    platform: 'claude',
    question: 'A 5.0 kg block is released from rest on a 30° incline. Find its acceleration.',
    raw: '',
    capsule: {
      meta: { version: 2, subject: 'Physics', topic: 'Block on a rough incline', ...meta },
      solution: 'It accelerates at 3.2 m/s².',
      solutionDiagrams: [],
      steps: [
        { id: 's1', index: 1, title: 'Draw the forces', body: 'Three forces act.' },
        { id: 's2', index: 2, title: 'Apply the second law', body: 'Sum the forces.' },
      ],
    },
    ...patch,
  };
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;
/** Height the question would have with no clamp; the clamped height is always two lines. */
let fullHeight = TWO_LINES;

beforeEach(() => {
  fullHeight = TWO_LINES;
  // happy-dom lays nothing out. The header measures the question clamped, then unclamped (while its
  // wrapper carries `is-measuring`); answer those two measurements as a browser would.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const measuringFull = this.classList.contains('slm-topic') && this.parentElement?.classList.contains('is-measuring');
    const height = this.classList.contains('slm-topic') ? (measuringFull ? fullHeight : Math.min(fullHeight, TWO_LINES)) : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: 300, bottom: height, width: 300, height, toJSON: () => ({}) } as DOMRect;
  });
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  vi.restoreAllMocks();
});

function renderHeader(session: Session, view: PanelView = 'steps', onSetView: (v: PanelView) => void = () => {}) {
  if (!host) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  }
  const noop = () => {};
  act(() => root!.render(
    <PanelHeader
      session={session}
      view={view}
      theme="light"
      saved={false}
      onSetView={onSetView}
      onToggleTheme={noop}
      onToggleSave={noop}
      contentScale={2}
      contentScaleBusy={false}
      onChangeContentScale={noop}
      onExportPdf={noop}
      onClose={noop}
    />,
  ));
  return host;
}

const toggle = () => host!.querySelector<HTMLButtonElement>('.slm-question-toggle');
const region = () => host!.querySelector<HTMLElement>('.slm-topic-scroll')!;

describe('header question block', () => {
  it('labels the question with its subject and topic, then gives the question itself', () => {
    const el = renderHeader(buildSession());
    const meta = el.querySelector('.slm-question-meta')!;
    expect(meta.querySelector('.slm-question-subject')?.textContent).toBe('Physics');
    expect(meta.querySelector('.slm-question-topic')?.textContent).toBe('Block on a rough incline');
    expect(el.querySelector('.slm-topic')?.textContent).toContain('A 5.0 kg block is released from rest');
    // Label first, question second, and no "Q." glyph in front of either.
    expect(meta.compareDocumentPosition(el.querySelector('.slm-question-body')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(el.querySelector('.slm-question-icon')).toBeNull();
    expect(el.querySelector('.slm-header-title')?.textContent).not.toMatch(/\bQ\./);
  });

  it('drops the topic when it would only repeat the question', () => {
    const el = renderHeader(buildSession({ question: 'Block on a rough incline' }));
    expect(el.querySelector('.slm-question-subject')?.textContent).toBe('Physics');
    expect(el.querySelector('.slm-question-topic')).toBeNull();
    const again = renderHeader(buildSession({ question: '  block on a ROUGH incline ' }));
    expect(again.querySelector('.slm-question-topic')).toBeNull();
  });

  it('says under the question when the answer was structured from the chat, and nothing for a stemlm answer', () => {
    const question = 'A 5.0 kg block is released from rest on a 30° incline. Find its acceleration.';
    const el = renderHeader(buildSession({ origin: 'ingest' }, { topic: 'A 5.0 kg block is released from rest…', question }));
    const note = el.querySelector('.slm-header-title .slm-origin-note')!;
    // Where it came from, here; what was and was not checked is said once, under the answer.
    expect(note.textContent).toBe('Structured from the chat answer.');
    // The explanation is a hover away, and the label sits after the question, never before it.
    expect(note.getAttribute('title')).toMatch(/did not verify/);
    expect(el.querySelector('.slm-question-body')!.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Its topic is only the opening of the question, so it is not printed above it as well.
    expect(el.querySelector('.slm-question-topic')).toBeNull();

    expect(renderHeader(buildSession()).querySelector('.slm-origin-note')).toBeNull();
    expect(renderHeader(buildSession({ origin: 'capsule' })).querySelector('.slm-origin-note')).toBeNull();
  });

  it('offers no toggle for a question that fits in two lines', () => {
    renderHeader(buildSession());
    expect(region().classList.contains('is-single')).toBe(true);
    expect(toggle()).toBeNull();
    // The measuring state never outlives the measurement.
    expect(region().classList.contains('is-measuring')).toBe(false);
  });

  it('offers Show more when the clamp cuts the question, and opens and closes it', () => {
    fullHeight = 164;
    renderHeader(buildSession());
    const more = toggle()!;
    expect(more.textContent).toBe('Show more');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(more.getAttribute('aria-controls')).toBe(region().id);
    expect(region().id).toMatch(/^slm-question-/);
    expect(region().classList.contains('is-single')).toBe(true);

    act(() => more.click());
    expect(toggle()!.textContent).toBe('Show less');
    expect(toggle()!.getAttribute('aria-expanded')).toBe('true');
    expect(region().classList.contains('is-expanded')).toBe(true);
    expect(region().classList.contains('is-single')).toBe(false);

    act(() => toggle()!.click());
    expect(toggle()!.textContent).toBe('Show more');
    expect(toggle()!.getAttribute('aria-expanded')).toBe('false');
    expect(region().classList.contains('is-single')).toBe(true);
  });

  it('keeps the toggle while open, so the question can always be closed again', () => {
    fullHeight = 164;
    renderHeader(buildSession());
    act(() => toggle()!.click());
    // Open, the text is no longer cut; the control must not vanish with the overflow.
    expect(toggle()).toBeTruthy();
    expect(toggle()!.getAttribute('aria-expanded')).toBe('true');
  });

  it('gives the header the whole question, so Show more has something to show', () => {
    const tail = 'and finally state the angle below the horizontal at which it lands.';
    const long = `${'A ball is thrown from the edge of a 45 m cliff at 20 m/s, 30° above the horizontal. '.repeat(5)}${tail}`;
    expect(long.length).toBeGreaterThan(280);
    fullHeight = 300;
    const el = renderHeader(buildSession({ question: long }));
    const text = el.querySelector('.slm-topic')?.textContent ?? '';
    expect(text).toContain(tail);
    expect(text).not.toMatch(/…$/);
    expect(toggle()).toBeTruthy();
  });

  it('keeps lettered parts on their own lines', () => {
    const el = renderHeader(buildSession({ question: 'Find the field.\n(a) At the centre\n(b) At the edge' }));
    expect(el.querySelectorAll('.slm-topic p').length).toBeGreaterThanOrEqual(1);
    const text = el.querySelector('.slm-topic')?.textContent ?? '';
    expect(text).toContain('(a) At the centre');
    expect(text).toContain('(b) At the edge');
  });

  it('closes again when another question is opened', () => {
    fullHeight = 164;
    renderHeader(buildSession());
    act(() => toggle()!.click());
    expect(region().classList.contains('is-expanded')).toBe(true);
    renderHeader(buildSession({ id: 'another', question: 'A different, equally long question about circuits.' }));
    expect(region().classList.contains('is-single')).toBe(true);
    expect(toggle()!.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows no question block before there is an answer', () => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const noop = () => {};
    act(() => root!.render(
      <PanelHeader
        session={undefined}
        view="steps"
        theme="light"
        saved={false}
        onSetView={noop}
        onToggleTheme={noop}
        onToggleSave={noop}
        contentScale={2}
        contentScaleBusy={false}
        onChangeContentScale={noop}
        onExportPdf={noop}
        onClose={noop}
      />,
    ));
    expect(host.querySelector('.slm-header-title')).toBeNull();
    expect(host.querySelector('.slm-tabs')).toBeNull();
    expect(host.querySelector('.slm-content-scale')).toBeNull();
  });
});

describe('Steps / Solution switch', () => {
  function key(target: Element, name: string) {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    act(() => { target.dispatchEvent(event); });
    return event;
  }

  it('is a tablist with one tab stop: the selected view', () => {
    const el = renderHeader(buildSession(), 'steps');
    const list = el.querySelector('[role="tablist"]')!;
    expect(list.getAttribute('aria-label')).toBe('Study view');
    const [steps, solution] = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(steps!.getAttribute('aria-selected')).toBe('true');
    expect(solution!.getAttribute('aria-selected')).toBe('false');
    expect(steps!.tabIndex).toBe(0);
    expect(solution!.tabIndex).toBe(-1);
    expect(steps!.getAttribute('aria-controls')).toBe('slm-panel-steps');
    expect(solution!.getAttribute('aria-controls')).toBe('slm-panel-solution');
    expect(list.getAttribute('data-view')).toBe('steps');

    renderHeader(buildSession(), 'solution');
    expect(steps!.tabIndex).toBe(-1);
    expect(solution!.tabIndex).toBe(0);
    expect(list.getAttribute('data-view')).toBe('solution');
  });

  it('moves between the two views with the arrow keys, taking focus along', () => {
    const onSetView = vi.fn();
    const el = renderHeader(buildSession(), 'steps', onSetView);
    const steps = el.querySelector<HTMLButtonElement>('#slm-tab-steps')!;
    const solution = el.querySelector<HTMLButtonElement>('#slm-tab-solution')!;
    steps.focus();

    const right = key(steps, 'ArrowRight');
    expect(onSetView).toHaveBeenLastCalledWith('solution');
    expect(document.activeElement).toBe(solution);
    expect(right.defaultPrevented).toBe(true);

    renderHeader(buildSession(), 'solution', onSetView);
    key(solution, 'ArrowLeft');
    expect(onSetView).toHaveBeenLastCalledWith('steps');
    expect(document.activeElement).toBe(steps);

    // Two tabs wrap: Left from the first is the second.
    renderHeader(buildSession(), 'steps', onSetView);
    key(steps, 'ArrowLeft');
    expect(onSetView).toHaveBeenLastCalledWith('solution');
  });

  it('ignores other keys', () => {
    const onSetView = vi.fn();
    const el = renderHeader(buildSession(), 'steps', onSetView);
    const steps = el.querySelector<HTMLButtonElement>('#slm-tab-steps')!;
    for (const name of ['ArrowDown', 'ArrowUp', 'Home', 'a', 'Enter']) {
      expect(key(steps, name).defaultPrevented).toBe(false);
    }
    expect(onSetView).not.toHaveBeenCalled();
  });

  it('switches the view inside the panel without also turning the step page', () => {
    const session = buildSession();
    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light', settings: DEFAULT_SETTINGS, activeStepIndex: 0 });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => root!.render(<Panel />));

    const steps = host.querySelector<HTMLButtonElement>('#slm-tab-steps')!;
    steps.focus();
    key(steps, 'ArrowRight');
    // The same key turns pages when focus is on the page; on the switch it belongs to the switch.
    expect(useStore.getState().view).toBe('solution');
    expect(useStore.getState().activeStepIndex).toBe(0);
    expect(document.activeElement).toBe(host.querySelector('#slm-tab-solution'));
    expect(host.querySelector('#slm-panel-solution')).toBeTruthy();

    key(host.querySelector('#slm-tab-solution')!, 'ArrowRight');
    expect(useStore.getState().view).toBe('steps');
    expect(useStore.getState().activeStepIndex).toBe(0);

    useStore.getState().resetSessions();
    useStore.setState({ panelOpen: false });
  });
});
