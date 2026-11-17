/**
 * When the site changes its markup, the student is told what is wrong and how to go on, and an
 * answer that arrives still reaches the panel: no guide file is left in a chat box stemLM cannot
 * write in, and an armed answer opens the panel though the reply and Stop button went unrecognised.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachTextFile } from '@/src/lib/file-inject';

vi.mock('@/src/lib/file-inject', () => ({
  attachTextFile: vi.fn(async () => ({ ok: true, method: 'input' as const })),
  hasConfirmedAttachment: vi.fn(() => true),
}));

import { StemController } from './controller';
import type { PlatformAdapter } from '@/src/platforms/types';
import { useStore } from '@/src/state/store';

const MESSAGE_BOX = "stemlm cannot find this site's message box. Use Paste an answer in the panel, or Copy the guide from the toolbar button.";
const CAPSULE = [
  '@meta', 'version: 2', 'subject: Physics', 'topic: Incline', '@endmeta',
  '@step id=s1', 'title: Draw the forces', '@body', 'Weight, normal force and friction.', '@endbody', '@endstep',
  '@solution', 'The block accelerates at 3.2 m/s^2.', '@endsolution', '@end',
].join('\n');

/** A site whose replies, Stop button and student messages are all in markup stemLM does not know. */
class ChangedSite implements PlatformAdapter {
  id = 'claude' as const;
  label = 'Claude';
  brand = { accent: '#000000' };
  layoutRoots = ['main'];
  editorText = '';
  editor = true;
  matches() { return true; }
  findEditor(): HTMLElement | null { return this.editor ? document.getElementById('composer') : null; }
  getEditorText() { return this.editor ? this.editorText : ''; }
  insertPrompt(text: string, mode: 'replace' | 'append' = 'replace') {
    this.editorText = mode === 'append' && this.editorText.trim() ? `${this.editorText.trimEnd()}\n\n${text}` : text;
    return true;
  }
  composerHasAttachments() { return false; }
  focusComposerQuestionSlot() {}
  getComposerBox() { return this.findEditor(); }
  getComposerLeadingAnchor() { return null; }
  getComposerShell() { return this.findEditor(); }
  getAssistantBlocks() { return []; }
  getLatestAssistantText() { return ''; }
  /** Found only by scanning the whole conversation for a code block. */
  extractCapsules() { return [...document.querySelectorAll('main pre')].map((pre) => pre.textContent ?? ''); }
  isStreaming() { return false; }
}

let site: ChangedSite;
let c: StemController;
const opened = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(attachTextFile).mockClear();
  opened.mockClear();
  document.body.innerHTML = '<main id="thread"></main><div id="composer"></div>';
  useStore.setState({ sessions: [], activeSessionId: undefined, status: 'idle', errorMessage: undefined, buttonInjected: false, writingId: undefined });
  site = new ChangedSite();
  c = new StemController(site, 'file');
  c.setOnAnswerStarted(opened);
});
afterEach(() => {
  c.stopWatching();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('a site whose markup stemLM no longer recognises', () => {
  it('says it cannot find the message box, with the ways through, and attaches nothing', async () => {
    site.editor = false;
    expect(await c.inject()).toBe(false);
    expect(attachTextFile).not.toHaveBeenCalled();
    expect(useStore.getState()).toMatchObject({ status: 'error', errorMessage: MESSAGE_BOX, buttonInjected: false });
    expect(c.takeAttachNotice()).toEqual({ tone: 'error', text: MESSAGE_BOX });
  });

  it('opens the panel on the answer a press was waiting for, though its reply and Stop button went unrecognised', async () => {
    site.editorText = 'Find the acceleration of the block.';
    const pressed = c.inject();
    await vi.advanceTimersByTimeAsync(300);
    expect(await pressed).toBe(true);
    // Sent in markup stemLM does not know, and answered the same way.
    site.editorText = '';
    document.getElementById('thread')!.innerHTML = `<div class="q">Find the acceleration.</div><div class="a"><pre></pre></div>`;
    document.querySelector('pre')!.textContent = CAPSULE;
    await vi.advanceTimersByTimeAsync(1_000);

    expect(useStore.getState().sessions).toHaveLength(1);
    expect(opened).toHaveBeenCalledOnce();
    expect(useStore.getState().status).toBe('ready');
  });
});
