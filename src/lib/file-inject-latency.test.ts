import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachTextFile, PROTOCOL_ATTACHMENT_NAME } from './file-inject';

describe('Claude named file-input delivery', () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

  it('starts the native upload immediately and preserves existing problem chips', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<fieldset><div class="attachment-chip">question.png</div><input type="file" aria-label="Upload files" multiple><div class="ProseMirror" contenteditable="true"></div></fieldset>';
    const root = document.querySelector('fieldset')!;
    const input = document.querySelector('input')!;
    const started = Date.now();
    const changes: number[] = [];
    let drops = 0;
    let pastes = 0;
    root.addEventListener('drop', () => { drops++; });
    root.addEventListener('paste', () => { pastes++; });
    input.addEventListener('change', () => {
      changes.push(Date.now() - started);
      expect(input.files?.[0]?.name).toBe(PROTOCOL_ATTACHMENT_NAME);
      input.value = '';
      setTimeout(() => root.insertAdjacentHTML('beforeend', `<div class="attachment-chip">${PROTOCOL_ATTACHMENT_NAME}</div>`), 350);
    });
    const pending = attachTextFile('reference', { root, requireConfirmation: true, inputIsAdditive: true });
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ ok: true, method: 'input' });
    console.info(JSON.stringify({ firstInputMs: changes[0], elapsedMs: Date.now() - started, drops, pastes }));
    expect(changes).toEqual([0]);
    expect(drops).toBe(0);
    expect(pastes).toBe(0);
    expect(root.textContent).toContain('question.png');
  });

  it('never retries another transport while a native upload remains unconfirmed', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<form><input type="file"><div class="ProseMirror" contenteditable="true"></div></form>';
    const root = document.querySelector('form')!;
    const change = vi.fn();
    const drop = vi.fn();
    const paste = vi.fn();
    root.addEventListener('change', change);
    root.addEventListener('drop', drop);
    root.addEventListener('paste', paste);
    const pending = attachTextFile('reference', { root, inputIsAdditive: true, requireConfirmation: true, timeoutMs: 400 });
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ ok: false, method: 'none' });
    expect(change).toHaveBeenCalledTimes(1);
    expect(drop).not.toHaveBeenCalled();
    expect(paste).not.toHaveBeenCalled();
  });

  it('does not fall back to a renaming file-paste handler when the native input is missing', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<fieldset><div class="ProseMirror" contenteditable="true"></div></fieldset>';
    const root = document.querySelector('fieldset')!;
    const paste = vi.fn();
    root.addEventListener('paste', paste);
    const pending = attachTextFile('reference', { root, inputIsAdditive: true, requireConfirmation: true });
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ ok: false, method: 'none' });
    expect(paste).not.toHaveBeenCalled();
  });
});
