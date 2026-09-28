import { FONT_MIN, type CompileCtx, type CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';
import { measureText } from '../geom';

interface Level {
  id: string;
  e: number;
  occ: number;
  /** Orbitals in the degenerate set; each holds two electrons. */
  orbitals: number;
}

function malformed(reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason };
}

function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]+/g, '_');
}

/**
 * Orbitals in a degenerate set, read from its name: an atomic subshell s/p/d/f → 1/3/5/7 (a named component such as
 * px or dz2 is one); a molecular σ/π/δ (also s/p/d before a shell, as in p*2p) → 1/2/2; Mulliken a/b/e/t (t2g, eg,
 * a1g) → 1/1/2/3. Anything else — a state such as S0 or HOMO — is one orbital.
 */
function degeneracy(id: string, family: string): number {
  if (family === 'jablonski') return 1;
  const name = id.trim();
  if (/^\d*[spdf](?:[xyz]{1,2}|z2|x2-?y2)$/i.test(name)) return 1;
  const atomic = /^\d*([spdf])$/i.exec(name);
  if (atomic) return { s: 1, p: 3, d: 5, f: 7 }[atomic[1]!.toLowerCase() as 's' | 'p' | 'd' | 'f'];
  const molecular = /^\d*(σ|sigma|π|pi|δ|delta|[spd])\*?(?:_?\{?\d[spdf][xyz]?\}?)?\*?[gu]?\*?$/i.exec(name);
  if (molecular) return /^(?:σ|sigma|s)$/i.test(molecular[1]!) ? 1 : 2;
  const mulliken = /^\d*([abet])\d?[gu]?'*$/i.exec(name);
  if (mulliken) return { a: 1, b: 1, e: 2, t: 3 }[mulliken[1]!.toLowerCase() as 'a' | 'b' | 'e' | 't'];
  return 1;
}

function parseLevels(raw: string, family: string): Level[] | CompileResult {
  if (!raw.trim()) return malformed(`${family} levels cannot be empty`);
  const levels: Level[] = [];
  const ids = new Set<string>();
  for (const [index, part] of raw.split(';').map((value) => value.trim()).entries()) {
    if (!part) continue;
    const fields = part.split(/\s+/);
    if (fields.length !== 3) return malformed(`${family} level ${index + 1} needs id, energy, occupancy`);
    const id = fields[0]!;
    const e = Number(fields[1]);
    const occ = Number(fields[2]);
    if (!id || !Number.isFinite(e)) return malformed(`${family} level ${index + 1} has an invalid energy`);
    if (ids.has(id.toLowerCase())) return malformed(`${family} repeats level ${id}; each level needs a unique id`);
    if (!Number.isInteger(occ) || occ < 0) return malformed(`${family} level ${id} has an invalid occupancy`);
    const orbitals = degeneracy(id, family);
    if (occ > 2 * orbitals) return malformed(`${family} level ${id} exceeds capacity ${2 * orbitals}`);
    ids.add(id.toLowerCase());
    levels.push({ id, e, occ, orbitals });
  }
  return levels.length ? levels : malformed(`${family} needs at least one level`);
}

/** Hund's rule inside a degenerate set: one electron in every orbital before any pairs. */
function hund(level: Level): Array<{ up: boolean; down: boolean }> {
  const singles = Math.min(level.occ, level.orbitals);
  const pairs = level.occ - singles;
  return Array.from({ length: level.orbitals }, (_, i) => ({ up: i < singles, down: i < pairs }));
}

function addPanels(b: SceneBuilder, spec: SpecDoc, width: number, height: number): CompileResult | null {
  const raw = specGetAll(spec, 'panel');
  if (!raw.length) return null;
  const panels = raw.map((value) => {
    const match = /^([A-Za-z][A-Za-z0-9_-]*)\s+(.+)$/.exec(value.trim());
    if (!match || /\b[xywh]\s*=|\b(?:left|right|top|bottom)\s*=/.test(value.toLowerCase())) return null;
    return { id: match[1]!, role: match[2]!.trim() };
  });
  if (panels.some((panel) => !panel)) return malformed('panel needs a semantic id and role, not coordinates');
  if (panels.length > 4) return malformed('too many panels for the fixed frame');
  const gap = 8;
  const panelWidth = (width - gap * (panels.length + 1)) / panels.length;
  if (panelWidth < 52) return malformed('panel comparison is too dense for the fixed frame');
  panels.forEach((panel, index) => {
    const x = gap + index * (panelWidth + gap);
    b.panel(panel!.id, panel!.role, x, 24, panelWidth, height - 34);
    b.rect(`panel-${safeId(panel!.id)}`, x, 24, panelWidth, height - 34, { role: 'boundary', width: 1 });
    b.label(`panel-label-${safeId(panel!.id)}`, panel!.role, x + panelWidth / 2, 14, { protected: true, priority: 'preferred' });
  });
  return null;
}

const ORBITAL_W = 18;
const ORBITAL_GAP = 8;
const LEVEL_GAP = 22;
const groupWidth = (level: Level) => level.orbitals * ORBITAL_W + (level.orbitals - 1) * ORBITAL_GAP;

/**
 * Columns of levels (atomic | molecular | atomic, or one column) on one energy axis. Energies map proportionally,
 * then a level is pushed up just enough to keep LEVEL_GAP from the level below it in the same column, so labels and
 * electrons never collide; equal energies stay level across columns.
 */
function compileLevels(
  spec: SpecDoc,
  ctx: CompileCtx,
  family: string,
  columns: { left: Level[]; center: Level[]; right: Level[] },
  options: { title?: string; footer?: string[]; delta?: string } = {},
): CompileResult {
  const all = [...columns.left, ...columns.center, ...columns.right];
  if (!all.length) return malformed(`${family} needs semantic levels`);
  const textH = measureText('0', FONT_MIN).h;
  const text = (value: string) => measureText(value, FONT_MIN).w;
  const energies = [...new Set(all.map((level) => level.e))].sort((a, b) => a - b);
  const span = energies.at(-1)! - energies[0]! || 1;
  const perUnit = 140 / span;
  const height = new Map<number, number>();
  const lastInColumn = new Map<string, number>();
  let push = 0;
  for (const e of energies) {
    let rise = (e - energies[0]!) * perUnit + push;
    for (const [name, levels] of Object.entries(columns)) {
      if (!levels.some((level) => level.e === e)) continue;
      const below = lastInColumn.get(name);
      if (below !== undefined && rise < below + LEVEL_GAP) {
        push += below + LEVEL_GAP - rise;
        rise = below + LEVEL_GAP;
      }
    }
    height.set(e, rise);
    for (const [name, levels] of Object.entries(columns)) if (levels.some((level) => level.e === e)) lastInColumn.set(name, rise);
  }
  const rise = Math.max(...height.values());

  // Horizontal layout: energy axis | left labels, left sets | molecular sets, their labels | right sets, labels.
  const widest = (levels: Level[]) => Math.max(0, ...levels.map(groupWidth));
  const labelW = (levels: Level[]) => Math.max(0, ...levels.map((level) => text(level.id)));
  const deltaW = options.delta ? text(options.delta) + 22 : 0;
  const axisX = 12;
  const margin = 10;
  const twoSided = Boolean(columns.left.length || columns.right.length);
  const leftLabel = axisX + 18 + deltaW;
  const leftX = leftLabel + labelW(columns.left) + 6 + widest(columns.left) / 2;
  const centerX = twoSided ? leftX + widest(columns.left) / 2 + 40 + widest(columns.center) / 2 : leftLabel + widest(columns.center) / 2;
  const rightX = centerX + widest(columns.center) / 2 + 6 + labelW(columns.center) + 30 + widest(columns.right) / 2;
  const contentW = (twoSided ? rightX + widest(columns.right) / 2 + 6 + labelW(columns.right) : centerX + widest(columns.center) / 2 + 6 + labelW(columns.center)) + margin;
  // Above the highest level: the axis arrow tip, the axis name, and the title if any.
  const top = (options.title ? textH + 10 : 0) + textH + 24;
  const footerH = (options.footer?.length ?? 0) * (textH + 2);
  const contentH = top + rise + 14 + footerH + margin;
  const nominal = frameSize(ctx.profile);
  const b = new SceneBuilder(family, Math.max(nominal.w, contentW), Math.max(nominal.h, contentH));
  const ox = (b.width - contentW) / 2;
  const baseline = (b.height - contentH) / 2 + top + rise;
  const yOf = (e: number) => baseline - height.get(e)!;
  const panelResult = addPanels(b, spec, b.width, b.height);
  if (panelResult) return panelResult;

  b.line('energy-axis', ox + axisX, baseline + 10, ox + axisX, baseline - rise - 12, { color: 'muted', role: 'axis', width: 1.2, markerEnd: true });
  b.label('energy-axis-label', 'E', ox + axisX, baseline - rise - 18 - textH / 2, { protected: true });
  const wanted = new Set(spec.highlight.map((value) => value.toLowerCase()));
  const draw = (levels: Level[], column: 'left' | 'center' | 'right', x: number, side: 'W' | 'E') => {
    levels.forEach((level, index) => {
      const y = yOf(level.e);
      const prefix = `${column}-${index}-${safeId(level.id)}`;
      const width = groupWidth(level);
      const color = wanted.has(level.id.toLowerCase()) ? 'accent' : 'neutral';
      hund(level).forEach((spin, k) => {
        const ox1 = ox + x - width / 2 + k * (ORBITAL_W + ORBITAL_GAP);
        const mid = ox1 + ORBITAL_W / 2;
        b.line(`${prefix}-orbital-${k}`, ox1, y, ox1 + ORBITAL_W, y, { width: 2, color, role: 'geometry' });
        if (spin.up) b.line(`${prefix}-orbital-${k}-up`, mid - 4, y + 6, mid - 4, y - 9, { width: 1, color: 'accent', role: 'annotation', markerEnd: true });
        if (spin.down) b.line(`${prefix}-orbital-${k}-down`, mid + 4, y - 9, mid + 4, y + 6, { width: 1, color: 'accent', role: 'annotation', markerEnd: true });
      });
      const name = text(level.id);
      const labelX = side === 'W' ? ox + x - width / 2 - 6 - name / 2 : ox + x + width / 2 + 6 + name / 2;
      b.label(`${prefix}-label`, level.id, labelX, y, { protected: true, anchorId: `${prefix}-orbital-0`, notation: family === 'jablonski' ? undefined : 'orbital' });
    });
  };
  draw(columns.left, 'left', leftX, 'W');
  draw(columns.center, 'center', centerX, 'E');
  draw(columns.right, 'right', rightX, 'E');
  if (options.delta && columns.center.length >= 2) {
    const low = Math.min(...columns.center.map((level) => level.e));
    const high = Math.max(...columns.center.map((level) => level.e));
    const x = ox + centerX - widest(columns.center) / 2 - 10;
    b.line('splitting-energy', x, yOf(low), x, yOf(high), { color: 'muted', role: 'annotation', width: 1, markerStart: true, markerEnd: true });
    b.label('splitting-energy-label', options.delta, x - 4 - text(options.delta) / 2, (yOf(low) + yOf(high)) / 2, { protected: true, anchorId: 'splitting-energy' });
  }
  if (options.title?.trim()) b.label('ladder-title', options.title, b.width / 2, (b.height - contentH) / 2 + 6 + textH / 2, { protected: true, notation: 'chem' });
  options.footer?.forEach((line, index) => b.label(`ladder-footer-${index}`, line, b.width / 2, baseline + 14 + textH / 2 + index * (textH + 2), { protected: true }));
  b.hl(spec.highlight);
  return layoutAndCompile(b.scene());
}

function explicitNumber(spec: SpecDoc, key: string, fallback?: number): number | CompileResult | undefined {
  const raw = specGet(spec, key);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : malformed(`${key}: expected a number`);
}

function unsupportedKey(spec: SpecDoc, allowed: ReadonlySet<string>): string | null {
  return [...spec.values.keys(), ...spec.lists.keys(), ...spec.emptyDeclarations.keys()].find((key) => !allowed.has(key)) ?? null;
}

function booleanValue(spec: SpecDoc, key: string): boolean | CompileResult | undefined {
  const raw = specGet(spec, key);
  if (raw === undefined) return undefined;
  if (/^(?:true|yes|1)$/i.test(raw.trim())) return true;
  if (/^(?:false|no|0)$/i.test(raw.trim())) return false;
  return malformed(`${key}: expected true or false`);
}

export function compileLadder(spec: SpecDoc, ctx: CompileCtx, family = 'mo'): CompileResult {
  const allowed = family === 'mo'
    ? new Set(['left', 'right', 'center', 'levels', 'molecule', 'mix', 'electrons', 'highlight', 'caption', 'panel'])
    : new Set(['levels', 'molecule', 'highlight', 'caption', 'panel']);
  const unknown = unsupportedKey(spec, allowed);
  if (unknown) return malformed(`${family} does not support key ${unknown}; no data was rendered`);
  const mix = family === 'mo' ? booleanValue(spec, 'mix') : undefined;
  if (mix && typeof mix !== 'boolean') return mix;
  const electrons = family === 'mo' ? explicitNumber(spec, 'electrons') : undefined;
  if (electrons !== undefined && typeof electrons !== 'number') return electrons;
  if (typeof electrons === 'number' && (!Number.isInteger(electrons) || electrons < 0)) return malformed('mo electrons must be a non-negative integer');
  const leftRaw = specGet(spec, 'left');
  const rightRaw = specGet(spec, 'right');
  const centerRaw = specGet(spec, 'center') ?? specGet(spec, 'levels');
  const left = leftRaw === undefined ? [] : parseLevels(leftRaw, family);
  const right = rightRaw === undefined ? [] : parseLevels(rightRaw, family);
  const center = centerRaw === undefined ? [] : parseLevels(centerRaw, family);
  if (!Array.isArray(left)) return left;
  if (!Array.isArray(right)) return right;
  if (!Array.isArray(center)) return center;
  if (family === 'mo' && !left.length && !right.length && !center.length) return malformed('mo needs left, right, or center levels');
  const footer = family === 'mo'
    ? [...(typeof electrons === 'number' ? [`e⁻ = ${electrons}`] : []), ...(mix === true ? ['mixed ordering'] : [])]
    : [];
  return compileLevels(spec, ctx, family, { left, center, right }, { title: specGet(spec, 'molecule'), footer });
}

/** Octahedral t2g below eg; tetrahedral e below t2 (energies in units of Δ). */
const FIELDS = {
  octahedral: { lower: 't2g', upper: 'eg', lowerE: -0.4, upperE: 0.6, lowerN: 3, delta: 'Δ_o' },
  tetrahedral: { lower: 'e', upper: 't2', lowerE: -0.6, upperE: 0.4, lowerN: 2, delta: 'Δ_t' },
} as const;

export function compileCft(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const unknown = unsupportedKey(spec, new Set(['d', 'geom', 'levels', 'spin', 'highlight', 'caption', 'panel']));
  if (unknown) return malformed(`cft does not support key ${unknown}; no data was rendered`);
  const d = explicitNumber(spec, 'd');
  if (d !== undefined && typeof d !== 'number') return d;
  if (typeof d === 'number' && (!Number.isInteger(d) || d < 0 || d > 10)) return malformed('cft d must be an integer from 0 through 10');
  const geometry = specGet(spec, 'geom')?.trim();
  const shape = !geometry || /^(?:oh|oct|octahedral)$/i.test(geometry) ? 'octahedral' : /^(?:td|tet|tetra|tetrahedral)$/i.test(geometry) ? 'tetrahedral' : null;
  if (!shape) return malformed(`cft geometry unsupported: ${geometry}`);
  const field = FIELDS[shape];
  const spinRaw = specGet(spec, 'spin')?.trim().toLowerCase();
  if (spinRaw !== undefined && spinRaw !== 'high' && spinRaw !== 'low') return malformed('cft spin must be high or low');
  let levelsRaw = specGet(spec, 'levels');
  if (levelsRaw === undefined) {
    if (d === undefined) return malformed('cft needs levels or d');
    // Filling from d alone: high spin puts one electron in every orbital (lower set first) before pairing; low spin
    // fills the lower set completely first. Octahedral d4–d7 differ between the two, so the spin must be stated;
    // tetrahedral complexes are high spin.
    if (shape === 'tetrahedral' && spinRaw === 'low') return { ok: false, code: 'refused', reason: 'a low-spin tetrahedral splitting is not drawn' };
    if (shape === 'octahedral' && d >= 4 && d <= 7 && !spinRaw) return malformed('an octahedral d4–d7 splitting needs spin: high or low');
    const upperN = 5 - field.lowerN;
    let lower: number;
    if (shape === 'octahedral' && spinRaw === 'low') lower = Math.min(2 * field.lowerN, d);
    else {
      const singles = Math.min(d, 5);
      const pairs = d - singles;
      lower = Math.min(singles, field.lowerN) + Math.min(pairs, field.lowerN);
    }
    levelsRaw = `${field.lower} ${field.lowerE} ${lower}; ${field.upper} ${field.upperE} ${d - lower}`;
    if (d - lower > 2 * upperN) return malformed('cft electron count exceeds the d shell');
  }
  const parsed = parseLevels(levelsRaw, 'cft');
  if (!Array.isArray(parsed)) return parsed;
  if (d !== undefined && parsed.reduce((sum, level) => sum + level.occ, 0) !== d) return malformed('cft level occupancy must equal d');
  const lowerLevel = parsed.find((level) => level.id.toLowerCase() === field.lower);
  const upperLevel = parsed.find((level) => level.id.toLowerCase() === field.upper);
  if (lowerLevel && upperLevel && lowerLevel.e >= upperLevel.e) return malformed(`cft requires ${field.lower} below ${field.upper} for ${shape} splitting`);
  const title = `${spinRaw ? `${spinRaw}-spin ` : ''}${shape}${d !== undefined ? ` d^${d}` : ''}`;
  return compileLevels(spec, ctx, 'cft', { left: [], center: parsed, right: [] }, { title, delta: field.delta });
}

export function compileJablonski(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const unknown = unsupportedKey(spec, new Set(['levels', 'molecule', 'highlight', 'caption', 'panel']));
  if (unknown) return malformed(`jablonski does not support key ${unknown}; no data was rendered`);
  const raw = specGet(spec, 'levels') ?? 'S0 0 2; S1 20 0; T1 12 0';
  const parsed = parseLevels(raw, 'jablonski');
  if (!Array.isArray(parsed)) return parsed;
  const s0 = parsed.find((level) => /^S0$/i.test(level.id));
  const s1 = parsed.find((level) => /^S1$/i.test(level.id));
  const t1 = parsed.find((level) => /^T1$/i.test(level.id));
  if (s0 && s1 && s0.e >= s1.e) return malformed('jablonski requires S0 below S1');
  if (t1 && s1 && t1.e >= s1.e) return malformed('jablonski requires T1 below S1');
  return compileLevels(spec, ctx, 'jablonski', { left: [], center: parsed, right: [] }, { title: specGet(spec, 'molecule') });
}
