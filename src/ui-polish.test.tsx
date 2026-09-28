/**
 * Phase 6 UI polish rules (UI-FOCUS-01, UI-COPY-01, BRAND-01, UX-ERR-01) that hold
 * across every surface, so a new component cannot quietly regress them.
 */
import { describe, it, expect } from 'vitest';
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { useDialogFocus } from '@/src/components/use-dialog-focus';
import { ErrorBanner } from '@/src/components/ErrorBanner';
import { STEMLM_TOGGLE_LABEL } from '@/src/lib/saved-library';
import { unsupportedHostNotice } from '@/src/lib/popup-launch';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ROOT = process.cwd();

function uiSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(tsx|html)$/.test(name) && !/\.test\./.test(name)) out.push(path);
    }
  };
  walk(resolve(ROOT, 'src/components'));
  walk(resolve(ROOT, 'entrypoints'));
  return out;
}

/** String literals and JSX text, with comments and console calls dropped. */
function visibleStrings(file: string): string[] {
  const code = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line) && !/console\.\w+\(/.test(line))
    .join('\n');
  const literals = [...code.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
  const jsxText = [...code.matchAll(/>([^<>{}\n]+)</g)].map((m) => m[1] ?? '');
  return [...literals, ...jsxText];
}

describe('copy', () => {
  it('shows no em or en dash in any visible UI string', () => {
    const hits = uiSources().flatMap((file) =>
      visibleStrings(file).filter((s) => /[\u2014\u2013]/.test(s)).map((s) => `${file.slice(ROOT.length + 1)}: ${s}`));
    expect(hits).toEqual([]);
  });

  it('calls the attached file the stemLM guide, never the protocol', () => {
    const hits = uiSources().flatMap((file) =>
      visibleStrings(file).filter((s) => /\bprotocol\b/i.test(s) && !/^[@./]|\//.test(s)).map((s) => `${file.slice(ROOT.length + 1)}: ${s}`));
    expect(hits).toEqual([]);
  });

  // D28 (user, 2026-09-27): visible text, the PDF file name included, spells the brand like the logotype.
  // Model-facing text (the Guide file, the composer pointer) keeps its spelling.
  it('writes the brand in lowercase, like the logotype, in every visible string', () => {
    const modelFacing = /stemLM (?:instructions|follow-up context|Guide\.txt)|--- stemLM/;
    const messageSources = [
      'src/content/controller.ts', 'src/lib/popup-launch.ts', 'src/lib/saved-library.ts', 'src/lib/saved-pdf-page.ts',
      'src/lib/pdf.ts', 'entrypoints/content/index.ts', 'wxt.config.ts',
    ].map((file) => resolve(ROOT, file));
    // JSX / HTML text that wraps onto its own lines, which visibleStrings (one line at a time) does not see.
    const wrappedText = (file: string) => /\.(tsx|html)$/.test(file)
      ? [...readFileSync(file, 'utf8').matchAll(/>([^<>{}]*stemLM[^<>{}]*)</g)].map((m) => (m[1] ?? '').replace(/\s+/g, ' ').trim())
      : [];
    const hits = [...uiSources(), ...messageSources].flatMap((file) =>
      [...new Set([...visibleStrings(file), ...wrappedText(file)])]
        .filter((s) => s.includes('stemLM') && !modelFacing.test(s)).map((s) => `${file.slice(ROOT.length + 1)}: ${s}`));
    expect(hits).toEqual([]);
    expect(STEMLM_TOGGLE_LABEL).toBe('stemlm');
  });

  it('lists the supported chats in a sentence', () => {
    expect(unsupportedHostNotice(['Claude', 'Gemini', 'Grok'])).toBe('Open a chat tab (Claude, Gemini, Grok) to use the study panel.');
  });
});

describe('error banner', () => {
  it('leads with the plain message and keeps technical detail behind Details', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ErrorBanner message={'stemLM could not read this answer.\nParser code: missing_end.'} tone="error" />));
    const banner = container.querySelector('[role="alert"]') as HTMLElement;
    expect(banner.firstChild?.textContent).toBe('stemLM could not read this answer.');
    const details = banner.querySelector('details');
    expect(details?.querySelector('summary')?.textContent).toBe('Details');
    expect(details?.textContent).toContain('Parser code: missing_end.');
    expect(details?.open).toBe(false);
    act(() => root.render(<ErrorBanner message="Saved." tone="info" />));
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Saved.');
    expect(container.querySelector('details')).toBeNull();
    act(() => root.unmount());
  });
});

describe('focus', () => {
  function Dialog({ initial, onReady }: { initial?: 'container'; onReady: (el: HTMLElement | null) => void }) {
    const ref = useDialogFocus<HTMLDivElement>(initial);
    useEffect(() => onReady(ref.current), [onReady, ref]);
    return (
      <div ref={ref} role="dialog" tabIndex={-1}>
        <button type="button">Close</button>
        <button type="button">Other</button>
      </div>
    );
  }

  it('can focus a page-sized dialog itself so no ring shows before the user acts (UI-FOCUS-01)', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    for (const button of [HTMLButtonElement.prototype]) {
      Object.defineProperty(button, 'offsetParent', { configurable: true, get() { return document.body; } });
    }
    let dialog: HTMLElement | null = null;
    act(() => root.render(<Dialog initial="container" onReady={(el) => { dialog = el; }} />));
    expect(document.activeElement).toBe(dialog);
    act(() => root.unmount());
    const root2 = createRoot(container);
    act(() => root2.render(<Dialog onReady={() => undefined} />));
    expect(document.activeElement?.textContent).toBe('Close');
    act(() => root2.unmount());
    container.remove();
  });

  it('never rings a container that only holds focus', () => {
    const css = ['assets/panel.css', 'assets/settings.css', 'assets/pages.css']
      .map((f) => readFileSync(resolve(ROOT, f), 'utf8')).join('\n').replace(/\s+/g, ' ');
    for (const selector of ['.slm-panel:focus', '.slm-settings-dialog:focus', '.slm-library-dialog:focus']) {
      const rule = new RegExp(`${selector.replace(/[.:]/g, (c) => `\\${c}`)}\\s*[,{][^}]*outline:\\s*none`);
      expect(css, selector).toMatch(rule);
    }
  });
});
