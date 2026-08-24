import { describe, it, expect, afterEach, vi } from 'vitest';
import { downloadTextFile } from './file-download';

describe('downloadTextFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('starts a file download with the given name and blob URL', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stemlm-report');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const captured = { download: '', href: '' };
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      captured.download = this.download;
      captured.href = this.href;
    });

    downloadTextFile('<html>report</html>', 'stemLM-algebra-2026-08-24.html');

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toMatch(/text\/html/);
    expect(captured.download).toBe('stemLM-algebra-2026-08-24.html');
    expect(captured.href).toBe('blob:stemlm-report');
    expect(captured.href).not.toMatch(/gemini\.google/);
  });
});
