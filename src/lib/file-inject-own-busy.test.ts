import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachTextFile, hasConfirmedAttachment } from './file-inject';

// Live Gemini 2026-09-27: the composer box gains a "with-file-preview" class, so it counts as the
// chip's preview container; it also holds the stemlm + (docked in the composer), which is
// aria-busy while attaching. The + vetoed its own confirmation until it gave up.
const COMPOSER = [
  '<div class="text-input-field with-file-preview">',
  '<div data-stemlm-composer-slot=""><button data-stemlm-inject="" aria-busy="true">+</button></div>',
  '<div class="attachment-preview-wrapper"><uploader-file-preview class="file-preview-chip">',
  '<gem-attachment class="gem-attachment"><span class="gem-attachment-text">stemLM Guide</span></gem-attachment>',
  '</uploader-file-preview></div>',
  '<div class="ql-editor" contenteditable="true">Question</div>',
  '</div>',
].join('');

describe('the stemlm control is not the host upload', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('confirms a shown chip while the stemlm + is busy attaching', () => {
    document.body.innerHTML = `<form id="composer">${COMPOSER}</form>`;
    expect(hasConfirmedAttachment('stemLM Guide.txt', document.getElementById('composer')!)).toBe(true);
  });

  it('still refuses a chip beside the host upload progress bar', () => {
    document.body.innerHTML = `<form id="composer">${COMPOSER.replace('</uploader-file-preview>', '<span role="progressbar"></span></uploader-file-preview>')}</form>`;
    expect(hasConfirmedAttachment('stemLM Guide.txt', document.getElementById('composer')!)).toBe(false);
  });

  it('attaches once the host shows the chip, with the + busy the whole time', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<form id="composer"><div class="text-input-field"><div data-stemlm-composer-slot=""><button data-stemlm-inject="" aria-busy="true">+</button></div><div class="ql-editor" contenteditable="true">Question</div></div></form>';
    const root = document.getElementById('composer')!;
    const box = root.querySelector('.text-input-field')!;
    const sent: string[] = [];
    root.addEventListener('drop', () => {
      sent.push('drop');
      setTimeout(() => {
        box.classList.add('with-file-preview');
        box.insertAdjacentHTML('afterbegin', '<div class="attachment-preview-wrapper"><gem-attachment class="gem-attachment"><span>TXT</span><span class="gem-attachment-text">stemLM Guide</span></gem-attachment></div>');
      }, 900);
    });
    root.addEventListener('paste', (event) => { if ((event as ClipboardEvent).clipboardData?.files.length) sent.push('paste'); });
    const pending = attachTextFile('guide', { root, requireConfirmation: true, dropTargets: ['#composer'], timeoutMs: 4000, waitMs: 1 });
    await vi.runAllTimersAsync();
    const result = await pending;
    console.log('OWN_BUSY', JSON.stringify({ result, sent }));
    expect(result).toEqual({ ok: true, method: 'drop' });
    expect(sent).toEqual(['drop']);
  });
});
