import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachTextFile } from './file-inject';

// Live Gemini 2026-09-27: the host showed its upload preview within a second but only named the
// "stemLM Guide" chip ~18 s later. stemlm gave up after its 4 s windows, fired paste, a second drop
// and the file input meanwhile, and reported "Could not attach" while the upload was still running.
describe('an upload the host has visibly started', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('is waited for instead of being answered with more uploads', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<form id="composer"><input type="file" multiple /><div class="ql-editor" contenteditable="true"></div></form>';
    const root = document.getElementById('composer')!;
    const input = root.querySelector('input')!;
    const sent: string[] = [];
    const startUpload = (via: string) => {
      sent.push(via);
      // Nameless pending preview now, the named chip much later.
      root.insertAdjacentHTML('beforeend', '<div class="file-preview"><span class="spinner"></span></div>');
      const preview = root.lastElementChild!;
      setTimeout(() => { preview.innerHTML = '<span class="gem-attachment-text">stemLM Guide</span>'; }, 18_000);
    };
    root.addEventListener('drop', () => startUpload('drop'));
    root.addEventListener('paste', (event) => { if ((event as ClipboardEvent).clipboardData?.files.length) sent.push('paste'); });
    input.addEventListener('change', () => sent.push('input'));

    const pending = attachTextFile('guide', { root, requireConfirmation: true, dropTargets: ['#composer'], timeoutMs: 4000, waitMs: 1 });
    await vi.runAllTimersAsync();
    const result = await pending;
    console.log('SLOW_UPLOAD', JSON.stringify({ result, sent }));
    expect(result).toEqual({ ok: true, method: 'drop' });
    expect(sent).toEqual(['drop']);
  });

  it('still fails when the started upload never names the file', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<form id="composer"><input type="file" multiple /></form>';
    const root = document.getElementById('composer')!;
    const sent: string[] = [];
    root.addEventListener('drop', () => {
      sent.push('drop');
      root.insertAdjacentHTML('beforeend', '<div class="file-preview"><span class="spinner"></span></div>');
    });
    root.addEventListener('paste', () => sent.push('paste'));
    root.querySelector('input')!.addEventListener('change', () => sent.push('input'));
    const pending = attachTextFile('guide', { root, requireConfirmation: true, dropTargets: ['#composer'], timeoutMs: 4000, waitMs: 1 });
    await vi.runAllTimersAsync();
    // Not delivered, and marked as begun: the caller must not answer it with a second upload.
    expect(await pending).toEqual({ ok: false, method: 'none', started: true });
    expect(sent).toEqual(['drop']);
  });
});

// A chat that rebuilds its composer when a file arrives: the old one is no longer in the page, so
// no chip can appear in it. The 4 s windows (16 s over a drop and a paste on two targets) used to
// be waited out in full with the stemlm button busy; now the attempt ends as soon as that is known.
describe('a composer the chat has rebuilt', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('is given up on at once instead of being waited for', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<form id="composer"><div class="ql-editor" contenteditable="true"></div></form>';
    const root = document.getElementById('composer')!;
    root.addEventListener('drop', () => root.replaceWith(root.cloneNode(true)));
    const started = Date.now();
    const pending = attachTextFile('guide', { root, requireConfirmation: true, dropTargets: ['#composer', '.ql-editor'], timeoutMs: 4000, waitMs: 1 });
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ ok: false, method: 'none' });
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
