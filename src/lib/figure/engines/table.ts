import type { CompileCtx, CompileResult } from '../types';
import { parseCsv, specGet, specGetAll, specList, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

export function compileTable(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('table', w, h);
  b.hl(spec.highlight);
  const kind = (specGet(spec, 'kind') ?? 'matrix').toLowerCase();
  let headers: string[] = [];
  let rows: string[][] = [];

  if (kind === 'ice') {
    headers = ['', ...parseCsv(specGet(spec, 'species') ?? '')];
    rows = [
      ['I', ...parseCsv(specGet(spec, 'I') ?? specGet(spec, 'i') ?? '')],
      ['C', ...parseCsv(specGet(spec, 'C') ?? specGet(spec, 'c') ?? '')],
      ['E', ...parseCsv(specGet(spec, 'E') ?? specGet(spec, 'e') ?? '')],
    ];
  } else if (kind === 'punnett') {
    const cols = parseCsv(specGet(spec, 'cols') ?? specGet(spec, 'columns') ?? '');
    const rws = parseCsv(specGet(spec, 'rows') ?? '');
    headers = ['', ...cols];
    const cells = specList(spec, 'cells');
    rws.forEach((r, i) => {
      const rowCells = cells[i] ? parseCsv(cells[i]!) : cols.map(() => '');
      rows.push([r, ...rowCells]);
    });
  } else {
    headers = parseCsv(specGet(spec, 'headers') ?? specGet(spec, 'header') ?? '');
    const rowLines = [...specGetAll(spec, 'row'), ...specList(spec, 'rows')];
    rows = rowLines.map((line) => parseCsv(line));
    if (!headers.length && rows[0]) headers = rows[0].map((_, i) => String(i + 1));
  }

  const cols = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const rCount = rows.length + (headers.length ? 1 : 0);
  const gridW = w - 24;
  const gridH = h - 24;
  const cw = gridW / cols;
  const rh = gridH / Math.max(1, rCount);
  const x0 = 12;
  const y0 = 12;
  const hlRow = (specGet(spec, 'highlight_row') ?? '').toLowerCase();

  b.rect('frame', x0, y0, gridW, gridH, { color: 'neutral' });
  for (let c = 1; c < cols; c++) b.line(`vc${c}`, x0 + c * cw, y0, x0 + c * cw, y0 + gridH, { color: 'muted', width: 1 });
  for (let r = 1; r < rCount; r++) b.line(`hr${r}`, x0, y0 + r * rh, x0 + gridW, y0 + r * rh, { color: 'muted', width: 1 });

  const paint = (text: string, c: number, r: number, id: string, hl = false) => {
    const x = x0 + (c + 0.5) * cw;
    const y = y0 + (r + 0.5) * rh;
    if (hl) b.rect(`${id}-hl`, x0 + c * cw + 1, y0 + r * rh + 1, cw - 2, rh - 2, { color: 'accent', fill: 'none' });
    b.label(id, text, x, y, { protected: true });
  };

  let r = 0;
  if (headers.length) {
    headers.forEach((cell, c) => paint(cell, c, 0, `h${c}`, spec.highlight.some((x) => x.toLowerCase() === cell.toLowerCase())));
    r = 1;
  }
  rows.forEach((row, ri) => {
    const rowHl = hlRow && row[0]?.toLowerCase() === hlRow;
    row.forEach((cell, c) => {
      paint(cell, c, r + ri, `c${ri}-${c}`, rowHl || spec.highlight.some((x) => x.toLowerCase() === cell.toLowerCase()));
    });
  });

  return layoutAndCompile(b.scene());
}
