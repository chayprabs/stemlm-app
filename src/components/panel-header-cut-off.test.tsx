/**
 * D38: a cut-off answer (the chat stopped before @end) is shown but cannot be saved until the
 * full answer replaces it; export stays available.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PanelHeader } from './PanelHeader';
import { parseCapsule } from '@/src/protocol/parser';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import type { Session } from '@/src/protocol/types';

let root: Root | null = null;
let host: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function renderHeader(session: Session) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const noop = () => {};
  act(() => root!.render(
    <PanelHeader
      session={session}
      view="steps"
      theme="light"
      saved={false}
      onSetView={noop}
      onToggleTheme={noop}
      onToggleSave={noop}
      contentScale={3}
      contentScaleBusy={false}
      onChangeContentScale={noop}
      onExportPdf={noop}
      onClose={noop}
    />,
  ));
  const save = host.querySelector<HTMLButtonElement>('.slm-icon-btn--save')!;
  const pdf = host.querySelector<HTMLButtonElement>('button[aria-label="Export PDF"]')!;
  return { save, pdf };
}

const session: Session = {
  id: 's-1', createdAt: 1, updatedAt: 1, platform: 'grok', question: 'Circuit',
  capsule: parseCapsule(FENCED_ELECTRICAL).capsule!, raw: '',
};

describe('PanelHeader save for a cut-off answer (D38)', () => {
  it('disables Save and says it becomes available with the full answer', () => {
    const { save, pdf } = renderHeader({ ...session, cutOff: true });
    expect(save.disabled).toBe(true);
    expect(save.title).toMatch(/full answer/i);
    expect(save.getAttribute('aria-label')).toMatch(/save/i);
    expect(pdf.disabled).toBe(false);
  });

  it('keeps Save enabled for a complete answer', () => {
    const { save } = renderHeader(session);
    expect(save.disabled).toBe(false);
    expect(save.title).toBe('Save session');
  });
});
