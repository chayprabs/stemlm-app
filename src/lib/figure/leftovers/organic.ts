import { FONT_MIN, type CompileCtx, type CompileResult } from '../types';
import { boxesOverlap, measureText } from '../geom';
import { parseCsv, specGet, specHas, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function malformed(reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason };
}

function unsupportedKey(spec: SpecDoc, allowed: ReadonlySet<string>): string | null {
  return [...spec.values.keys(), ...spec.lists.keys(), ...spec.emptyDeclarations.keys()].find((key) => !allowed.has(key)) ?? null;
}

function explicitKey(spec: SpecDoc, key: string): boolean {
  return new RegExp(`^\\s*${key.replace('.', '\\.') }\\s*:`, 'im').test(spec.raw);
}

function csvValue(spec: SpecDoc, key: string, fallback?: string): string[] | CompileResult {
  const raw = specGet(spec, key);
  if (raw === undefined) return specHas(spec, key) || explicitKey(spec, key) ? malformed(`${key}: needs at least one value`) : parseCsv(fallback ?? '');
  const values = parseCsv(raw);
  return values.length ? values : malformed(`${key}: needs at least one value`);
}

function numericValue(spec: SpecDoc, key: string, fallback: number): number | CompileResult {
  const raw = specGet(spec, key);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : malformed(`${key}: expected a number`);
}

function highlightMatching(b: SceneBuilder, spec: SpecDoc, names: Array<{ value: string; ids: string[] }>): void {
  const wanted = new Set(spec.highlight.map((value) => value.toLowerCase()));
  const ids = names.filter((entry) => wanted.has(entry.value.toLowerCase())).flatMap((entry) => entry.ids);
  b.hl([...spec.highlight, ...ids]);
}

type NewmanBond = { id: string; value: string; x1: number; y1: number; x2: number; y2: number; box: { x1: number; y1: number; x2: number; y2: number } };

/** A bond from (x, y) at `angle` degrees (clockwise, screen), `from`..`to` along it, its group written just beyond. */
function newmanBond(id: string, value: string, x: number, y: number, angle: number, from: number, to: number): NewmanBond {
  const ux = Math.cos((angle * Math.PI) / 180);
  const uy = Math.sin((angle * Math.PI) / 180);
  const { w, h } = measureText(value, FONT_MIN);
  const reach = to + 3 + Math.abs(ux) * w / 2 + Math.abs(uy) * h / 2;
  const cx = x + ux * reach;
  const cy = y + uy * reach;
  return { id, value, x1: x + ux * from, y1: y + uy * from, x2: x + ux * to, y2: y + uy * to, box: { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 } };
}

function newmanClean(bonds: NewmanBond[], circle?: { x: number; y: number; r: number }, extra: Array<{ x1: number; y1: number; x2: number; y2: number }> = []): boolean {
  const lines = [...bonds, ...extra];
  const hits = (box: NewmanBond['box'], s: { x1: number; y1: number; x2: number; y2: number }) => Array.from({ length: 51 }, (_, k) => k / 50).some((t) => {
    const x = s.x1 + (s.x2 - s.x1) * t;
    const y = s.y1 + (s.y2 - s.y1) * t;
    return x > box.x1 - 2 && x < box.x2 + 2 && y > box.y1 - 2 && y < box.y2 + 2;
  });
  return bonds.every((a, i) =>
    lines.every((s) => !hits(a.box, s)) &&
    bonds.slice(i + 1).every((b) => !boxesOverlap(a.box, b.box, 2)) &&
    (!circle || [[a.box.x1, a.box.y1], [a.box.x2, a.box.y1], [a.box.x1, a.box.y2], [a.box.x2, a.box.y2]].every(([x, y]) => Math.hypot(x! - circle.x, y! - circle.y) >= circle.r + 2)));
}

export function compileNewman(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const unknown = unsupportedKey(spec, new Set(['view', 'front', 'back', 'deg', 'axis', 'highlight', 'caption']));
  if (unknown) return malformed(`newman does not support key ${unknown}; no data was rendered`);
  const viewRaw = specGet(spec, 'view');
  const view = (viewRaw ?? 'circular').toLowerCase();
  if (!['circular', 'sawhorse'].includes(view)) return malformed(`newman view unsupported: ${viewRaw}`);
  const front = csvValue(spec, 'front', 'H,H,H');
  const back = csvValue(spec, 'back', 'H,H,H');
  if (!Array.isArray(front)) return front;
  if (!Array.isArray(back)) return back;
  if (front.length !== 3 || back.length !== 3) return malformed('newman needs exactly three front and three back substituents');
  const deg = numericValue(spec, 'deg', 0);
  if (typeof deg !== 'number') return deg;
  if (deg < -360 || deg > 360) return malformed('newman deg must be between -360 and 360');
  const axis = specGet(spec, 'axis');
  if (axis !== undefined && !axis.trim()) return malformed('newman axis cannot be empty');

  // Front carbon at the centre with its bonds meeting there; back carbon = the circle, its bonds from the rim, `deg`
  // clockwise of the front ones. An eclipsed pair is drawn a little apart so both bonds show; back bonds lengthen
  // until every group clears the other bonds and groups.
  const frontAngle = (i: number) => -90 + i * 120;
  const eclipsed = ((deg % 120) + 120) % 120 === 0;
  const r = 30;
  let bonds: NewmanBond[] | null = null;
  let axisLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (view === 'sawhorse') {
    // Front carbon lower left, back carbon upper right; the C–C axis tilts away from every bond.
    const backAngle = (i: number) => frontAngle(i) + deg + (eclipsed ? 16 : 0);
    const apart = (a: number, c: number) => Math.abs(((((a - c) % 360) + 540) % 360) - 180);
    const tilt = [-35, -50, -20, -60].find((t) => [0, 1, 2].every((i) => apart(frontAngle(i), t) > 25 && apart(backAngle(i), t + 180) > 25)) ?? -35;
    const line = { x1: 0, y1: 0, x2: Math.cos((tilt * Math.PI) / 180) * 72, y2: Math.sin((tilt * Math.PI) / 180) * 72 };
    axisLine = line;
    for (let length = 26; length <= 64 && !bonds; length += 4) {
      const candidate = [
        ...front.map((value, i) => newmanBond(`front-${i}`, value, 0, 0, frontAngle(i), 0, 26)),
        ...back.map((value, i) => newmanBond(`back-${i}`, value, line.x2, line.y2, backAngle(i), 0, length)),
      ];
      if (newmanClean(candidate, undefined, [line])) bonds = candidate;
    }
  } else {
    for (let length = 18; length <= 60 && !bonds; length += 4) {
      for (const offset of eclipsed ? [14, 18, 22] : [0]) {
        const candidate = [
          ...front.map((value, i) => newmanBond(`front-${i}`, value, 0, 0, frontAngle(i), 0, r + 18)),
          ...back.map((value, i) => newmanBond(`back-${i}`, value, 0, 0, frontAngle(i) + deg + offset, r, r + length)),
        ];
        if (newmanClean(candidate, { x: 0, y: 0, r })) {
          bonds = candidate;
          break;
        }
      }
    }
  }
  if (!bonds) return { ok: false, code: 'refused', reason: 'newman groups cannot be written clear of the bonds' };

  const textH = measureText('0', FONT_MIN).h;
  const margin = 8;
  const boxes = [...bonds.map((bond) => bond.box), ...(view === 'circular' ? [{ x1: -r, y1: -r, x2: r, y2: r }] : [])];
  const bounds = {
    x1: Math.min(...boxes.map((box) => box.x1)),
    y1: Math.min(...boxes.map((box) => box.y1)),
    x2: Math.max(...boxes.map((box) => box.x2)),
    y2: Math.max(...boxes.map((box) => box.y2)) + (axis ? textH + 8 : 0),
  };
  const nominal = frameSize(ctx.profile);
  const b = new SceneBuilder('newman', Math.max(nominal.w, bounds.x2 - bounds.x1 + 2 * margin), Math.max(nominal.h, bounds.y2 - bounds.y1 + 2 * margin));
  const ox = (b.width - (bounds.x2 - bounds.x1)) / 2 - bounds.x1;
  const oy = (b.height - (bounds.y2 - bounds.y1)) / 2 - bounds.y1;
  if (view === 'circular') b.circle('back-carbon', ox, oy, r, { width: 1.8, role: 'geometry' });
  if (axisLine) b.line('newman-axis', ox + axisLine.x1, oy + axisLine.y1, ox + axisLine.x2, oy + axisLine.y2, { width: 2, role: 'geometry' });
  const labels: Array<{ value: string; ids: string[] }> = [];
  for (const bond of bonds) {
    b.line(bond.id, ox + bond.x1, oy + bond.y1, ox + bond.x2, oy + bond.y2, { width: 1.8, role: 'geometry' });
    b.label(`${bond.id}-label`, bond.value, ox + (bond.box.x1 + bond.box.x2) / 2, oy + (bond.box.y1 + bond.box.y2) / 2, { protected: true, anchorId: bond.id, notation: 'chem' });
    labels.push({ value: bond.value, ids: [bond.id, `${bond.id}-label`] });
  }
  if (axis) b.label('axis-label', axis, b.width / 2, oy + bounds.y2 - textH / 2, { protected: true });
  highlightMatching(b, spec, labels);
  return layoutAndCompile(b.scene());
}

export function compileFischer(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const unknown = unsupportedKey(spec, new Set(['backbone', 'chain', 'left', 'right', 'highlight', 'caption']));
  if (unknown) return malformed(`fischer does not support key ${unknown}; no data was rendered`);
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('fischer', w, h);
  const raw = specGet(spec, 'backbone') ?? specGet(spec, 'chain');
  const chain = raw === undefined ? ['CHO', 'H', 'OH', 'CH2OH'] : parseCsv(raw);
  if (chain.length < 2) return malformed('fischer backbone needs at least two ordered centers');
  if (chain.length > 6) return malformed('fischer backbone is too dense for the fixed frame');
  if (raw !== undefined && !chain.length) return malformed('fischer backbone cannot be empty');
  const leftRaw = specGet(spec, 'left');
  const rightRaw = specGet(spec, 'right');
  if ((leftRaw === undefined) !== (rightRaw === undefined)) return malformed('fischer left and right substituents must be supplied together');
  const left = leftRaw === undefined ? [] : parseCsv(leftRaw);
  const right = rightRaw === undefined ? [] : parseCsv(rightRaw);
  const centerCount = chain.length - 2;
  if (left.length && (left.length !== centerCount || right.length !== centerCount)) return malformed(`fischer horizontal substituents need ${centerCount} left and right values`);
  const x = w / 2;
  const y0 = 25;
  const dy = (h - 50) / (chain.length - 1);
  const labels: Array<{ value: string; ids: string[] }> = [];
  const textH = measureText('C', FONT_MIN).h;
  for (let i = 0; i < chain.length; i++) {
    const y = y0 + i * dy;
    const centerId = `center-${i}`;
    const end = i === 0 || i === chain.length - 1;
    // The top and bottom groups are written at the ends of the vertical bond, not marked with a dot.
    if (!end) b.circle(centerId, x, y, 3, { fill: 'ink', role: 'geometry' });
    if (i < chain.length - 1) b.line(`backbone-${i}`, x, y, x, y + dy, { width: 1.8, role: 'geometry' });
    if (!end) {
      b.line(`cross-left-${i}`, x, y, x - 38, y, { width: 1.8, role: 'geometry' });
      b.line(`cross-right-${i}`, x, y, x + 38, y, { width: 1.8, role: 'geometry' });
      if (left.length) {
        const leftId = `fischer-left-label-${i}`;
        const rightId = `fischer-right-label-${i}`;
        b.label(leftId, left[i - 1]!, x - 54, y, { slot: 'W', protected: true, priority: 'required', anchorId: `cross-left-${i}`, notation: 'chem' });
        b.label(rightId, right[i - 1]!, x + 54, y, { slot: 'E', protected: true, priority: 'required', anchorId: `cross-right-${i}`, notation: 'chem' });
        labels.push({ value: left[i - 1]!, ids: [`cross-left-${i}`, leftId] }, { value: right[i - 1]!, ids: [`cross-right-${i}`, rightId] });
      }
    }
    // A crossing is the stereocentre itself: with its two substituents drawn, its carbon is not written.
    if (left.length && !end) {
      labels.push({ value: chain[i]!, ids: [centerId] });
      continue;
    }
    const labelId = `center-label-${i}`;
    if (end) {
      b.label(labelId, chain[i]!, x, y + (i === 0 ? -1 : 1) * (4 + textH / 2), { protected: true, priority: 'required', anchorId: `backbone-${Math.min(i, chain.length - 2)}`, notation: 'chem' });
      labels.push({ value: chain[i]!, ids: [labelId] });
      continue;
    }
    b.label(labelId, chain[i]!, x + (i % 2 ? -54 : 54), y, { slot: i % 2 ? 'W' : 'E', priority: 'required', anchorId: centerId, notation: 'chem' });
    labels.push({ value: chain[i]!, ids: [centerId, labelId] });
  }
  highlightMatching(b, spec, labels);
  return layoutAndCompile(b.scene());
}

export function compileHaworth(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const unknown = unsupportedKey(spec, new Set(['sugar', 'anomer', 'highlight', 'caption']));
  if (unknown) return malformed(`haworth does not support key ${unknown}; no data was rendered`);
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('haworth', w, h);
  const sugar = specGet(spec, 'sugar') ?? 'Glc';
  if (!sugar.trim()) return malformed('haworth sugar cannot be empty');
  const rawAnomer = specGet(spec, 'anomer') ?? 'α';
  const key = rawAnomer.toLowerCase();
  const anomer = key === 'alpha' || key === 'a' || rawAnomer === 'α' ? 'α' : key === 'beta' || key === 'b' || rawAnomer === 'β' ? 'β' : null;
  if (!anomer) return malformed(`haworth anomer unsupported: ${rawAnomer}`);
  const cx = w / 2;
  const cy = h / 2 + 8;
  const ring = [cx - 78, cy, cx - 38, cy - 40, cx + 38, cy - 40, cx + 78, cy, cx + 38, cy + 40, cx - 38, cy + 40];
  b.polygon('ring', ring, { fill: 'none', width: 1.8, role: 'geometry' });
  b.label('ring-oxygen', 'O', cx + 38, cy - 40, { protected: true, priority: 'required', anchorId: 'ring' });
  const direction = anomer === 'α' ? 1 : -1;
  b.line('anomeric-bond', cx + 78, cy, cx + 78, cy + direction * 30, { width: 1.5, role: 'connector' });
  b.label('anomer-label', anomer, cx + 78, cy + direction * 42, { slot: direction > 0 ? 'SE' : 'NE', protected: true, priority: 'required', anchorId: 'anomeric-bond' });
  b.label('sugar-label', sugar, w / 2, 14, { protected: true, priority: 'required' });
  b.hl(spec.highlight);
  return layoutAndCompile(b.scene());
}

type Domain = { angle: number; kind: 'plane' | 'wedge' | 'dash' | 'lone' };

/**
 * Electron domains of each AXnEm in the textbook 2D drawing (angles clockwise from +x on screen): in-plane bonds as
 * lines, the front/back pair as wedge and hashed wedge, lone pairs where the electron geometry puts them.
 */
const VSEPR_SHAPES: Record<string, { name: string; domains: Domain[] }> = {
  AX2: { name: 'linear', domains: [{ angle: 180, kind: 'plane' }, { angle: 0, kind: 'plane' }] },
  AX3: { name: 'trigonal planar', domains: [{ angle: 270, kind: 'plane' }, { angle: 30, kind: 'plane' }, { angle: 150, kind: 'plane' }] },
  AX2E: { name: 'bent', domains: [{ angle: 150, kind: 'plane' }, { angle: 30, kind: 'plane' }, { angle: 270, kind: 'lone' }] },
  AX4: { name: 'tetrahedral', domains: [{ angle: 270, kind: 'plane' }, { angle: 160.5, kind: 'plane' }, { angle: 20, kind: 'wedge' }, { angle: 60, kind: 'dash' }] },
  AX3E: { name: 'trigonal pyramidal', domains: [{ angle: 160.5, kind: 'plane' }, { angle: 20, kind: 'wedge' }, { angle: 60, kind: 'dash' }, { angle: 270, kind: 'lone' }] },
  AX2E2: { name: 'bent', domains: [{ angle: 142.25, kind: 'plane' }, { angle: 37.75, kind: 'plane' }, { angle: 220, kind: 'lone' }, { angle: 320, kind: 'lone' }] },
  AX5: { name: 'trigonal bipyramidal', domains: [{ angle: 270, kind: 'plane' }, { angle: 90, kind: 'plane' }, { angle: 180, kind: 'plane' }, { angle: 30, kind: 'wedge' }, { angle: 330, kind: 'dash' }] },
  AX4E: { name: 'seesaw', domains: [{ angle: 270, kind: 'plane' }, { angle: 90, kind: 'plane' }, { angle: 30, kind: 'wedge' }, { angle: 330, kind: 'dash' }, { angle: 180, kind: 'lone' }] },
  AX3E2: { name: 'T-shaped', domains: [{ angle: 270, kind: 'plane' }, { angle: 90, kind: 'plane' }, { angle: 180, kind: 'plane' }, { angle: 30, kind: 'lone' }, { angle: 330, kind: 'lone' }] },
  AX2E3: { name: 'linear', domains: [{ angle: 270, kind: 'plane' }, { angle: 90, kind: 'plane' }, { angle: 180, kind: 'lone' }, { angle: 30, kind: 'lone' }, { angle: 330, kind: 'lone' }] },
  AX6: { name: 'octahedral', domains: [{ angle: 270, kind: 'plane' }, { angle: 90, kind: 'plane' }, { angle: 180, kind: 'plane' }, { angle: 0, kind: 'plane' }, { angle: 135, kind: 'wedge' }, { angle: 315, kind: 'dash' }] },
  AX5E: { name: 'square pyramidal', domains: [{ angle: 270, kind: 'plane' }, { angle: 180, kind: 'plane' }, { angle: 0, kind: 'plane' }, { angle: 135, kind: 'wedge' }, { angle: 315, kind: 'dash' }, { angle: 90, kind: 'lone' }] },
  AX4E2: { name: 'square planar', domains: [{ angle: 180, kind: 'plane' }, { angle: 0, kind: 'plane' }, { angle: 135, kind: 'wedge' }, { angle: 315, kind: 'dash' }, { angle: 270, kind: 'lone' }, { angle: 90, kind: 'lone' }] },
};

const VSEPR_NAMES: Record<string, string> = {
  linear: 'AX2', lin: 'AX2', trigonalplanar: 'AX3', trigplanar: 'AX3', tetrahedral: 'AX4', tetra: 'AX4',
  trigonalpyramidal: 'AX3E', pyramidal: 'AX3E', trigonalbipyramidal: 'AX5', tbp: 'AX5', seesaw: 'AX4E', tshaped: 'AX3E2',
  octahedral: 'AX6', oct: 'AX6', oh: 'AX6', squarepyramidal: 'AX5E', squareplanar: 'AX4E2', sq: 'AX4E2',
};

/** `AX3E`, `AX2E2`, `AX4` or an unambiguous shape name → the AXnEm key; `bent` names two shapes and is not accepted. */
function vseprKey(raw: string): string | null {
  const axe = /^AX(\d)(?:E(\d)?)?$/i.exec(raw.trim());
  if (axe) {
    const lone = axe[0].toUpperCase().includes('E') ? Number(axe[2] ?? 1) : 0;
    return `AX${axe[1]}${lone ? `E${lone > 1 ? lone : ''}` : ''}`;
  }
  return VSEPR_NAMES[raw.toLowerCase().replace(/[\s_-]+/g, '')] ?? null;
}

export function compileVsepr(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const unknown = unsupportedKey(spec, new Set(['geom', 'ax', 'center', 'ligands', 'highlight', 'caption']));
  if (unknown) return malformed(`vsepr does not support key ${unknown}; no data was rendered`);
  // geom: and ax: may both be written: the one that resolves decides, and a shape name must name that shape
  // ("bent" alone is AX2E or AX2E2, but agrees with either).
  const written = [specGet(spec, 'geom'), specGet(spec, 'ax')].filter((text): text is string => text !== undefined);
  const geomRaw = written[0] ?? 'AX4';
  const keys = [...new Set((written.length ? written : [geomRaw]).map(vseprKey).filter((k): k is string => k !== null))];
  if (keys.length > 1) return malformed('vsepr geom and ax disagree');
  const shape = keys[0] ? VSEPR_SHAPES[keys[0]] : undefined;
  if (!shape) return malformed(`vsepr geometry unsupported: ${geomRaw} (write AXnEm, e.g. AX2E2)`);
  const sameName = (text: string) => text.toLowerCase().replace(/[\s_-]+/g, '') === shape.name.toLowerCase().replace(/[\s_-]+/g, '');
  if (written.some((text) => vseprKey(text) === null && !sameName(text))) return malformed('vsepr geom and ax disagree');
  const bonds = shape.domains.filter((domain) => domain.kind !== 'lone');
  const ligandRaw = specGet(spec, 'ligands');
  if (ligandRaw === undefined && explicitKey(spec, 'ligands')) return malformed('vsepr ligands cannot be empty');
  const ligands = ligandRaw === undefined ? bonds.map(() => 'X') : parseCsv(ligandRaw);
  if (!ligands.length) return malformed('vsepr ligands cannot be empty');
  if (ligands.length !== bonds.length) return malformed(`vsepr ${geomRaw} needs ${bonds.length} ligands`);
  const center = specGet(spec, 'center') ?? 'A';
  if (!center.trim()) return malformed('vsepr center cannot be empty');
  const centerElement = /^\[?([A-Z][a-z]?)/.exec(center.trim())?.[1];
  if (centerElement && ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'].includes(centerElement) && shape.domains.length > 4) {
    return malformed(`vsepr: a period-2 ${centerElement} centre has at most four electron domains`);
  }

  const textH = measureText('0', FONT_MIN).h;
  const centerR = { rx: measureText(center, FONT_MIN).w / 2 + 3, ry: textH / 2 + 1 };
  const edge = (u: { x: number; y: number }) => 1 / Math.hypot(u.x / centerR.rx, u.y / centerR.ry);
  const bondEnd = 46;
  const boxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [{ x1: -centerR.rx, y1: -centerR.ry, x2: centerR.rx, y2: centerR.ry }];
  const placed = shape.domains.map((domain) => {
    const u = { x: Math.cos((domain.angle * Math.PI) / 180), y: Math.sin((domain.angle * Math.PI) / 180) };
    return { domain, u, start: edge(u) + 2 };
  });
  let bondIndex = 0;
  const ligandAt = placed.map((item) => {
    if (item.domain.kind === 'lone') return null;
    const text = ligands[bondIndex++]!;
    const { w, h } = measureText(text, FONT_MIN);
    const reach = bondEnd + 3 + Math.abs(item.u.x) * w / 2 + Math.abs(item.u.y) * h / 2;
    const box = { x1: item.u.x * reach - w / 2, y1: item.u.y * reach - h / 2, x2: item.u.x * reach + w / 2, y2: item.u.y * reach + h / 2 };
    boxes.push(box);
    return { text, box };
  });
  const lonePairAt = (u: { x: number; y: number }, start: number) => [-1, 1].map((side) => ({ x: u.x * (start + 9) - u.y * side * 3.2, y: u.y * (start + 9) + u.x * side * 3.2 }));
  for (const item of placed.filter((p) => p.domain.kind === 'lone')) {
    for (const dot of lonePairAt(item.u, item.start)) boxes.push({ x1: dot.x - 2, y1: dot.y - 2, x2: dot.x + 2, y2: dot.y + 2 });
  }
  const bounds = { x1: Math.min(...boxes.map((r) => r.x1)), y1: Math.min(...boxes.map((r) => r.y1)), x2: Math.max(...boxes.map((r) => r.x2)), y2: Math.max(...boxes.map((r) => r.y2)) };
  const titleH = textH + 10;
  const nominal = frameSize(ctx.profile);
  const b = new SceneBuilder('vsepr', Math.max(nominal.w, bounds.x2 - bounds.x1 + 20), Math.max(nominal.h, bounds.y2 - bounds.y1 + titleH + 20));
  const cx = b.width / 2 - (bounds.x1 + bounds.x2) / 2;
  const cy = (b.height - (bounds.y2 - bounds.y1) - titleH) / 2 + titleH - bounds.y1;
  b.label('geometry-label', shape.name, b.width / 2, cy + bounds.y1 - titleH / 2 - 2, { protected: true });
  b.label('center-label', center, cx, cy, { protected: true, anchorId: 'center', notation: 'chem' });
  const labels: Array<{ value: string; ids: string[] }> = [];
  let lone = 0;
  placed.forEach((item, i) => {
    const { u, start } = item;
    if (item.domain.kind === 'lone') {
      lonePairAt(u, start).forEach((dot, k) => b.circle(`lone-pair-${lone}-${k ? 'b' : 'a'}`, cx + dot.x, cy + dot.y, 1.8, { role: 'annotation', fill: 'ink' }));
      lone += 1;
      return;
    }
    const index = ligandAt.slice(0, i).filter(Boolean).length;
    const bondId = `ligand-bond-${index}`;
    const [x1, y1, x2, y2] = [cx + u.x * start, cy + u.y * start, cx + u.x * bondEnd, cy + u.y * bondEnd];
    const n = { x: -u.y, y: u.x };
    if (item.domain.kind === 'wedge') {
      b.polygon(bondId, [x1 + n.x * 0.8, y1 + n.y * 0.8, x2 + n.x * 4, y2 + n.y * 4, x2 - n.x * 4, y2 - n.y * 4, x1 - n.x * 0.8, y1 - n.y * 0.8], { role: 'connector', fill: 'ink', width: 1 });
    } else if (item.domain.kind === 'dash') {
      for (let k = 0; k < 6; k++) {
        const t = (k + 0.5) / 6;
        const [x, y, half] = [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0.8 + 3.4 * t];
        b.line(`${bondId}-hash-${k}`, x - n.x * half, y - n.y * half, x + n.x * half, y + n.y * half, { width: 1.2, role: 'connector' });
      }
    } else {
      b.line(bondId, x1, y1, x2, y2, { width: 1.6, role: 'connector' });
    }
    const { text, box } = ligandAt[i]!;
    b.label(`ligand-label-${index}`, text, cx + (box.x1 + box.x2) / 2, cy + (box.y1 + box.y2) / 2, { protected: true, anchorId: bondId, notation: 'chem' });
    labels.push({ value: text, ids: [bondId, `ligand-label-${index}`] });
  });
  highlightMatching(b, spec, [{ value: center, ids: ['center', 'center-label'] }, ...labels]);
  return layoutAndCompile(b.scene());
}
