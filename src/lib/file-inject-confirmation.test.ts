import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachTextFile, assignFileToInput, createTextFile } from './file-inject';

describe('provider attachment confirmation', () => {
  afterEach(() => { vi.useRealTimers(); });
  beforeEach(() => {
    document.body.innerHTML = '<form id="composer"><input type="file" multiple /></form>';
  });

  function options() {
    return {
      root: document.getElementById('composer')!,
      requireConfirmation: true,
      dropTargets: [],
      waitMs: 1,
      timeoutMs: 1,
    };
  }

  it('does not report delivery when the provider ignores the assigned FileList', async () => {
    const result = await attachTextFile('protocol', options());
    expect(result).toEqual({ ok: false, method: 'none' });
  });

  it('ignores a protocol attachment in an older conversation message', async () => {
    document.body.insertAdjacentHTML('afterbegin', '<article><div class="attachment-chip">stemLM Guide.txt</div></article>');
    const result = await attachTextFile('protocol', options());
    expect(result).toEqual({ ok: false, method: 'none' });
  });

  it('does not confirm a hidden or failed protocol preview', async () => {
    const root = document.getElementById('composer')!;
    root.insertAdjacentHTML('beforeend', '<div hidden><div class="attachment-chip">stemLM Guide.txt</div></div><div class="attachment-chip">stemLM Guide.txt Upload failed</div>');
    const result = await attachTextFile('protocol', options());
    expect(result).toEqual({ ok: false, method: 'none' });
  });

  it('does not confirm an upload that is still busy', async () => {
    document.getElementById('composer')!.insertAdjacentHTML('beforeend', '<div class="attachment-chip" aria-busy="true">stemLM Guide.txt</div>');
    const result = await attachTextFile('protocol', options());
    expect(result).toEqual({ ok: false, method: 'none' });
  });

  it('does not confirm a nested filename inside a failed preview', async () => {
    document.getElementById('composer')!.insertAdjacentHTML('beforeend', '<div class="attachment-chip"><div class="file-preview">stemLM Guide.txt</div><span>Upload failed</span></div>');
    expect(await attachTextFile('protocol', options())).toEqual({ ok: false, method: 'none' });
  });

  it('does not confirm a nested filename beside an upload progress bar', async () => {
    document.getElementById('composer')!.insertAdjacentHTML('beforeend', '<div class="attachment-chip"><div class="file-preview">stemLM Guide.txt</div><span role="progressbar"></span></div>');
    expect(await attachTextFile('protocol', options())).toEqual({ ok: false, method: 'none' });
  });

  it('accepts a confirmed upload when the framework clears its native input', async () => {
    const input = document.querySelector('input')!;
    let changes = 0;
    input.addEventListener('change', () => {
      changes++;
      input.value = '';
      document.getElementById('composer')!.insertAdjacentHTML('beforeend', '<div class="attachment-chip">stemLM Guide.txt</div>');
    });
    const result = await attachTextFile('protocol', options());
    expect(result).toEqual({ ok: true, method: 'input' });
    expect(changes).toBe(1);
  });

  it('reports assignment once when a framework consumes the file synchronously', () => {
    const input = document.querySelector('input')!;
    let changes = 0;
    input.addEventListener('change', () => { changes++; input.value = ''; });
    expect(assignFileToInput(input, createTextFile('protocol', 'stemLM Guide.txt'))).toBe(true);
    expect(changes).toBe(1);
  });

  it('waits for an asynchronous upload before trying another attachment method', async () => {
    vi.useFakeTimers();
    const root = document.getElementById('composer')!;
    let pastes = 0;
    root.addEventListener('drop', () => {
      setTimeout(() => root.insertAdjacentHTML('beforeend', '<div class="attachment-preview-wrapper"><uploader-file-preview class="file-preview-chip"><span class="gem-attachment-text">stemLM Guide</span></uploader-file-preview></div>'), 350);
    });
    root.addEventListener('paste', () => { pastes++; });
    const pending = attachTextFile('protocol', {
      ...options(),
      dropTargets: ['#composer'],
      timeoutMs: 1200,
    });
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ ok: true, method: 'drop' });
    expect(pastes).toBe(0);
  });
});
