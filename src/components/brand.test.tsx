import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { StemMark, BrandWordmark, AnimatedStemMark, BRAND_SIGNAL, BRAND_INK } from './brand';
import { Loading } from './Loading';
import { OverlayButton } from './OverlayButton';
import { PanelHeader } from './PanelHeader';
import { Report } from './Report';
import { Panel } from './Panel';
import { useStore } from '@/src/state/store';
import type { Session } from '@/src/protocol/types';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
      id: 'test',
    },
  },
}));

vi.mock('@/src/content/controller', () => ({
  getController: () => null,
}));

vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: vi.fn(async () => ({ prunedCount: 0 })),
  deleteSavedSession: vi.fn(async () => undefined),
  isSessionSaved: vi.fn(async () => false),
  refreshSavedSession: vi.fn(async () => false),
}));

vi.mock('@/src/lib/pdf', () => ({
  exportSessionPdf: vi.fn(async () => ({ ok: true, method: 'print' as const })),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SIGNAL = BRAND_SIGNAL.toLowerCase();
const INK = BRAND_INK.toLowerCase();

function fillOf(el: Element): string {
  return (el.getAttribute('fill') ?? '').toLowerCase();
}

function parseSvg(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function thereforeParts(root: ParentNode) {
  const circles = [...root.querySelectorAll('circle')];
  const rects = [...root.querySelectorAll('rect')];
  const signal = [...root.querySelectorAll('[fill]')].filter((el) => fillOf(el) === SIGNAL);
  return { circles, rects, signal };
}

function stubMatchMedia(reducedMotion: boolean) {
  window.matchMedia = ((query: string) => {
    const matches = reducedMotion
      ? query.includes('prefers-reduced-motion')
      : query.includes('prefers-color-scheme: dark')
        ? false
        : false;
    return {
      matches,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
      onchange: null,
    } as MediaQueryList;
  }) as typeof window.matchMedia;
}

beforeEach(() => {
  stubMatchMedia(false);
});

describe('StemMark (therefore mark)', () => {
  it('two-tone bare mark is two dots plus a Signal apex only', () => {
    const html = renderToStaticMarkup(<StemMark size={32} variant="light" />);
    const { circles, rects, signal } = thereforeParts(parseSvg(html));
    expect(circles).toHaveLength(2);
    expect(rects.length).toBeGreaterThanOrEqual(1);
    expect(signal).toHaveLength(1);
    expect(signal[0]!.tagName.toLowerCase()).toBe('rect');
    expect(circles.every((c) => fillOf(c) === INK)).toBe(true);
    expect(html).not.toContain('slm-wordmark-lm');
    expect(html).not.toContain('M24 40V17');
  });

  it('inverse mark uses light dots and keeps Signal on the apex', () => {
    const html = renderToStaticMarkup(<StemMark size={32} variant="dark" />);
    const { circles, signal } = thereforeParts(parseSvg(html));
    expect(circles).toHaveLength(2);
    expect(circles.every((c) => fillOf(c) === '#ffffff')).toBe(true);
    expect(signal).toHaveLength(1);
    expect(signal[0]!.tagName.toLowerCase()).toBe('rect');
  });

  it('renders the ink tile below 28px and the bare mark at 28px', () => {
    const small = parseSvg(renderToStaticMarkup(<StemMark size={14} />));
    const tile = small.querySelector('rect[rx="14.5"]');
    expect(tile).toBeTruthy();
    expect(fillOf(tile!)).toBe(INK);
    const { circles, signal } = thereforeParts(small);
    expect(circles).toHaveLength(2);
    expect(signal).toHaveLength(1);

    const large = parseSvg(renderToStaticMarkup(<StemMark size={28} />));
    expect(large.querySelector('rect[rx="14.5"]')).toBeNull();
    expect(thereforeParts(large).circles).toHaveLength(2);
  });
});

describe('BrandWordmark (outlined lockup)', () => {
  it('is outlined SVG, not a live-font stem/LM split', () => {
    const html = renderToStaticMarkup(<BrandWordmark variant="light" height={20} />);
    expect(html).not.toContain('slm-wordmark-lm');
    expect(html).not.toContain('slm-wordmark-stem');
    expect(html).toContain('<svg');
    expect(html).toContain('<path');
    expect(html).toContain('viewBox="0 0 226.7 64"');
    const { circles, signal } = thereforeParts(parseSvg(html));
    expect(circles).toHaveLength(2);
    expect(signal).toHaveLength(1);
    expect(signal[0]!.tagName.toLowerCase()).toBe('rect');
    const svg = parseSvg(html).querySelector('svg');
    const w = Number(svg?.getAttribute('width'));
    const h = Number(svg?.getAttribute('height'));
    expect(h).toBe(20);
    expect(w / h).toBeCloseTo(226.7 / 64, 5);
  });

  it('dark lockup uses light premises and Signal apex', () => {
    const html = renderToStaticMarkup(<BrandWordmark variant="dark" />);
    const { circles, signal } = thereforeParts(parseSvg(html));
    expect(circles.every((c) => fillOf(c) === '#ffffff')).toBe(true);
    expect(signal).toHaveLength(1);
  });

  it('mono lockup has no Signal fill', () => {
    const html = renderToStaticMarkup(<BrandWordmark variant="mono" />);
    const { signal, circles } = thereforeParts(parseSvg(html));
    expect(signal).toHaveLength(0);
    expect(circles).toHaveLength(2);
    expect(html).toContain('<path');
  });
});

describe('Loading processing mark', () => {
  it('inlines SMIL animate on the therefore mark', () => {
    const html = renderToStaticMarkup(<Loading theme="light" />);
    expect(html).toMatch(/<animate/i);
    expect(html).toContain('Reading response');
    const { circles } = thereforeParts(parseSvg(html));
    expect(circles).toHaveLength(2);
  });

  it('uses the static mark when prefers-reduced-motion is set', () => {
    stubMatchMedia(true);
    const html = renderToStaticMarkup(<Loading theme="light" />);
    expect(html).not.toMatch(/<animate/i);
    const { circles, signal } = thereforeParts(parseSvg(html));
    expect(circles).toHaveLength(2);
    expect(signal).toHaveLength(1);
  });
});

describe('AnimatedStemMark', () => {
  it('includes SMIL animate unless reduced motion is on', () => {
    const html = renderToStaticMarkup(<AnimatedStemMark size={32} />);
    expect(html).toMatch(/<animate/i);
    stubMatchMedia(true);
    const reduced = renderToStaticMarkup(<AnimatedStemMark size={32} />);
    expect(reduced).not.toMatch(/<animate/i);
  });
});

describe('shipped surfaces: header, inject, report, panel loading', () => {
  it('panel header lockup is outlined SVG', () => {
    const html = renderToStaticMarkup(
      <PanelHeader
        session={undefined}
        view="steps"
        theme="light"
        saved={false}
        onSetView={() => {}}
        onToggleTheme={() => {}}
        onToggleSave={() => {}}
        onExportPdf={() => {}}
        onClose={() => {}}
      />,
    );
    expect(html).not.toContain('slm-wordmark-lm');
    expect(html).toContain('slm-wordmark');
    expect(html).toContain('<path');
    const doc = parseSvg(html);
    const wordmark = doc.querySelector('.slm-wordmark') ?? doc;
    expect(thereforeParts(wordmark).circles).toHaveLength(2);
    expect(html).toContain('slm-theme-glyph');
    expect(html).toContain('slm-theme-disc');
    expect(html).toContain('slm-theme-crescent');
    expect(html).toContain('M20.15 14.2A8.2 8.2 0 1 1 10.35 3.85 6.25 6.25 0 0 0 20.15 14.2Z');
    expect(html).not.toContain(
      'M13.15 6.05a6.15 6.15 0 1 0 4.2 10.85 5.05 5.05 0 1 1-4.2-10.85Z',
    );
    expect(html).toContain('slm-icon-save');
    expect(html).not.toContain('IconMoon');
  });

  it('inject idle glyph is a plus, not the therefore mark', () => {
    const html = renderToStaticMarkup(<OverlayButton />);
    const doc = parseSvg(html);
    const btn = doc.querySelector('.slm-inject-btn');
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute('data-glyph')).toBe('plus');
    expect(html).toContain('M12 5v14');
    expect(html).toContain('slm-inject-plus');
    expect(html).toContain('slm-inject-tick');
    const { circles, signal } = thereforeParts(btn ?? doc);
    expect(circles).toHaveLength(0);
    expect(signal).toHaveLength(0);
    expect(html).not.toContain('slm-extension-logo');
    expect(html).not.toContain('M24 40V17');
  });

  it('PDF report uses the colorful outlined lockup', () => {
    const session: Session = {
      id: 'brand-report',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: 'Why?',
      raw: '',
      capsule: {
        meta: { version: 1, subject: 'Math', topic: 'Therefore' },
        solution: 'QED.',
        solutionDiagrams: [],
        steps: [],
      },
    };
    const html = renderToStaticMarkup(<Report session={session} diagramSvg={{}} />);
    expect(html).not.toContain('slm-wordmark-lm');
    expect(html).toContain('slm-report-wordmark');
    expect(html).toContain('<path');
    const header = html.slice(html.indexOf('slm-report-wordmark'), html.indexOf('</header>'));
    expect(thereforeParts(parseSvg(header)).signal.length).toBeGreaterThan(0);
    expect(html).toContain('PDF made using stemLM');
    expect(html).toContain('https://stemlm.app');
  });

  it('panel loading state ships the animated mark', () => {
    useStore.setState({ panelOpen: true, status: 'loading', sessions: [], theme: 'light' });
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });
    const html = container.innerHTML;
    expect(html).toContain('Reading response');
    expect(html).toMatch(/<animate/i);
    expect(html).not.toContain('slm-wordmark-lm');
    act(() => {
      root?.unmount();
    });
    container.remove();
    useStore.getState().resetSessions();
  });
});

describe('shipped raster tiles', () => {
  it('public/icon tiles match temp-icon and are not empty botanicals', async () => {
    execFileSync(process.execPath, [resolve(process.cwd(), 'scripts/gen-icons.mjs')], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    expect(existsSync(resolve(process.cwd(), 'public/icon/96.png'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'scripts/logo.png'))).toBe(false);

    const samples: Record<string, unknown> = {};
    for (const size of [16, 32, 48, 128] as const) {
      const shippedPath = resolve(process.cwd(), 'public/icon', `${size}.png`);
      const sourcePath = resolve(process.cwd(), 'temp-icon', `icon${size}.png`);
      const shipped = readFileSync(shippedPath);
      const source = readFileSync(sourcePath);
      expect(shipped.equals(source), `${size}.png should be byte-identical to temp-icon/icon${size}.png`).toBe(
        true,
      );

      const meta = await sharp(shipped).metadata();
      expect(meta.width).toBe(size);
      expect(meta.height).toBe(size);
      expect(meta.hasAlpha).toBe(true);

      const { data, info } = await sharp(shipped).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let opaque = 0;
      let inkish = false;
      let signalish = false;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const a = data[i + 3]!;
        if (a > 200) {
          opaque += 1;
          if (r < 40 && g < 40 && b < 40) inkish = true;
          if (r > 200 && g < 160 && b < 90) signalish = true;
        }
      }
      expect(opaque).toBeGreaterThan(size);
      expect(inkish).toBe(true);
      expect(signalish).toBe(true);
      samples[`${size}`] = { width: info.width, height: info.height, channels: info.channels, opaque, inkish, signalish };
    }
    expect(Object.keys(samples)).toEqual(['16', '32', '48', '128']);

    for (const size of [16, 32, 48, 128] as const) {
      const darkPath = resolve(process.cwd(), 'public/icon', `dark-${size}.png`);
      const lightPath = resolve(process.cwd(), 'public/icon', `light-${size}.png`);
      const defaultPath = resolve(process.cwd(), 'public/icon', `${size}.png`);
      expect(existsSync(darkPath), `dark-${size}.png`).toBe(true);
      expect(existsSync(lightPath), `light-${size}.png`).toBe(true);
      expect(readFileSync(darkPath).equals(readFileSync(defaultPath))).toBe(true);

      const lightMeta = await sharp(readFileSync(lightPath)).metadata();
      expect(lightMeta.width).toBe(size);
      expect(lightMeta.height).toBe(size);
      expect(lightMeta.hasAlpha).toBe(true);

      const { data } = await sharp(readFileSync(lightPath)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let paper = false;
      let inkish = false;
      let signalish = false;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const a = data[i + 3]!;
        if (a < 200) continue;
        if (r > 200 && g > 200 && b > 200) paper = true;
        if (r < 40 && g < 40 && b < 40) inkish = true;
        if (r > 200 && g < 160 && b < 90) signalish = true;
      }
      expect(paper, `light-${size} paper`).toBe(true);
      expect(inkish, `light-${size} ink`).toBe(true);
      expect(signalish, `light-${size} signal`).toBe(true);
    }

    const sample128 = await sharp(readFileSync(resolve(process.cwd(), 'public/icon/128.png')))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => {
      const i = (y * sample128.info.width + x) * 4;
      return {
        r: sample128.data[i],
        g: sample128.data[i + 1],
        b: sample128.data[i + 2],
        a: sample128.data[i + 3],
      };
    };
    const inkPixel = at(20, 100);
    const apexPixel = at(64, 40);
    expect(inkPixel.a).toBeGreaterThan(200);
    expect(inkPixel.r).toBeLessThan(40);
    expect(apexPixel.a).toBeGreaterThan(200);
    expect(apexPixel.r).toBeGreaterThan(200);

    const scratch = resolve(process.env.SLM_SCRATCH ?? 'artifacts/test-output');
    mkdirSync(scratch, { recursive: true });
    writeFileSync(
      resolve(scratch, 'icons-meta.json'),
      JSON.stringify(
        {
          source: 'temp-icon',
          pipeline: 'scripts/gen-icons.mjs',
          leftover96: existsSync(resolve(process.cwd(), 'public/icon/96.png')),
          leftoverLogo: existsSync(resolve(process.cwd(), 'scripts/logo.png')),
          sizes: samples,
          sample128: { ink: inkPixel, apex: apexPixel },
        },
        null,
        2,
      ),
    );
  });
});

describe('old botanical brand is gone from shipped UI source', () => {
  it('does not keep the sprout path or live-font LM split', () => {
    const files = [
      'src/components/icons.tsx',
      'src/components/brand.tsx',
      'src/components/BrandWordmark.tsx',
      'src/components/Loading.tsx',
      'src/components/PanelHeader.tsx',
      'src/components/Report.tsx',
      'src/components/OverlayButton.tsx',
      'src/components/ExtensionLogo.tsx',
      'src/lib/pdf.ts',
      'assets/panel.css',
      'assets/pages.css',
      'scripts/gen-icons.mjs',
    ];
    for (const file of files) {
      const text = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(text, file).not.toContain('M24 40V17');
      expect(text, file).not.toContain('slm-wordmark-lm');
      expect(text, file).not.toContain('scripts/logo.png');
    }
  });
});

afterEach(() => {
  stubMatchMedia(false);
});
