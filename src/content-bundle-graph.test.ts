/**
 * The content script is parsed on every Claude / Gemini / Grok page load, used or not.
 * PDF export runs on the extension's own pdf.html page (D7), so nothing reachable
 * from the content entry may pull in the PDF stack.
 */
import { describe, it, expect } from 'vitest';
import { CONTENT_ENTRY, importGraph } from '@/scripts/panel-split';

describe('content-script import graph', () => {
  const { files, packages } = importGraph(process.cwd(), CONTENT_ENTRY);
  const repoModules = [...files];

  it('walks the real content entry', () => {
    expect(repoModules).toContain('src/components/Panel.tsx');
    expect(repoModules).toContain('src/content/controller.ts');
    expect(packages).toContain('react-dom/client');
  });

  it('never reaches the PDF stack (export runs on pdf.html)', () => {
    expect(repoModules.filter((file) => /^src\/lib\/pdf(-raster|-paginate)?\.ts$/.test(file))).toEqual([]);
    expect([...packages].filter((name) => /^(jspdf|html2canvas|canvg|react-dom\/server)/.test(name))).toEqual([]);
  });

  it('never mounts the saved-library UI inside a chat tab', () => {
    expect(repoModules.filter((file) => /SavedLibraryOverlay|SavedSessionList|saved-pdf-page/.test(file))).toEqual([]);
  });
});
