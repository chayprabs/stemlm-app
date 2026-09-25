import { afterEach, describe, expect, it } from 'vitest';
import { HOST_FIXTURES, mountHostComposer } from './host-fixtures';
import { geminiAdapter } from './gemini';
import { hasConfirmedAttachment } from '@/src/lib/file-inject';

afterEach(() => { document.body.innerHTML = ''; });

describe.each(HOST_FIXTURES)('$id active composer selection', (spec) => {
  it('reads and writes the same visible editor selected for the control', () => {
    const { composer } = mountHostComposer(spec, { capsule: false });
    const hidden = composer.cloneNode(true) as HTMLElement;
    hidden.hidden = true;
    document.body.prepend(hidden);
    const visibleEditor = composer.querySelector<HTMLElement>('textarea, [contenteditable="true"]')!;
    const hiddenEditor = hidden.querySelector<HTMLElement>('textarea, [contenteditable="true"]')!;
    if (visibleEditor instanceof HTMLTextAreaElement) visibleEditor.value = 'Visible question';
    else visibleEditor.textContent = 'Visible question';
    if (hiddenEditor instanceof HTMLTextAreaElement) hiddenEditor.value = 'Hidden draft';
    else hiddenEditor.textContent = 'Hidden draft';
    expect(spec.adapter.findEditor()).toBe(visibleEditor);
    expect(spec.adapter.getEditorText()).toBe('Visible question');
    expect(spec.adapter.insertPrompt('Updated visible question')).toBe(true);
    expect(spec.adapter.getEditorText()).toBe('Updated visible question');
    expect(hiddenEditor instanceof HTMLTextAreaElement ? hiddenEditor.value : hiddenEditor.textContent).toBe('Hidden draft');
  });

  it('does not write to a hidden composer when there is no active editor', () => {
    const { composer } = mountHostComposer(spec, { capsule: false });
    (composer as HTMLElement).hidden = true;
    expect(spec.adapter.findEditor()).toBeNull();
    expect(spec.adapter.insertPrompt('Question')).toBe(false);
  });
});

it('includes Gemini file previews beside rich-textarea in the active composer scope', () => {
  document.body.innerHTML = `<div class="text-input-field with-file-preview">
    <div class="attachment-preview-wrapper"><uploader-file-preview-container>
      <uploader-file-preview class="file-preview-chip"><div class="file-preview-container">
        <gem-attachment><mat-basic-chip><div class="gem-attachment-content"><span>TXT</span><span>stemlm-protocol</span></div></mat-basic-chip></gem-attachment>
      </div></uploader-file-preview>
    </uploader-file-preview-container></div>
    <rich-textarea><div class="ql-editor" contenteditable="true">Question</div></rich-textarea>
  </div>`;
  const scope = geminiAdapter.getComposerBox() ?? geminiAdapter.getComposerShell()!;
  expect(hasConfirmedAttachment('stemlm-protocol.txt', scope)).toBe(true);
  expect(geminiAdapter.getComposerShell()?.contains(geminiAdapter.findEditor())).toBe(true);
});
