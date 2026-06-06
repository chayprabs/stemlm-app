import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Panel } from './Panel';
import { useStore } from '@/src/state/store';
import type { Session } from '@/src/protocol/types';

function buildTwoDiagramSession(): Session {
  return {
    id: 'panel-diagrams',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'Show progressive diagrams',
    reviewedStepIds: [],
    raw: '',
    capsule: {
      meta: { version: 1, subject: 'Physics', topic: 'Progressive diagrams' },
      solution: 'Done.',
      solutionDiagrams: [],
      steps: [
        {
          id: 's1',
          index: 0,
          title: 'First visual state',
          body: 'First.',
          diagram: {
            type: 'svg',
            content: '<svg viewBox="0 0 20 20"><text x="1" y="10">first-diagram</text></svg>',
          },
        },
        {
          id: 's2',
          index: 1,
          title: 'Second visual state',
          body: 'Second.',
          diagram: {
            type: 'svg',
            content: '<svg viewBox="0 0 20 20"><text x="1" y="10">second-diagram</text></svg>',
          },
        },
      ],
    },
  };
}

afterEach(() => {
  useStore.getState().resetSessions();
});

describe('Panel diagram well', () => {
  it('shows the active step diagram instead of the first session diagram', () => {
    const session = buildTwoDiagramSession();
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
      sessions: [session],
      activeSessionId: session.id,
      activeStepIndex: 1,
    });

    const html = renderToStaticMarkup(<Panel />);
    expect(html).toContain('second-diagram');
    expect(html).not.toContain('first-diagram');
  });
});

