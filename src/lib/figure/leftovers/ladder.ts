import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

interface Level {
  id: string;
  e: number;
  occ: number;
  capacity: number;
}

function malformed(reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason };
}

function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]+/g, '_');
}

function occupancyCapacity(id: string, family: string): number {
  if (family === 'cft' && /^t2g$/i.test(id)) return 6;
  if (family === 'cft' && /^eg$/i.test(id)) return 4;
  if (/π|p/i.test(id)) return 4;
  return family === 'jablonski' ? 2 : 2;
}

function parseLevels(raw: string, family: string): Level[] | CompileResult {
  if (!raw.trim()) return malformed(`${family} levels cannot be empty`);
  const levels: Level[] = [];
  for (const [index, part] of raw.split(';').map((value) => value.trim()).entries()) {
    if (!part) continue;
    const fields = part.split(/\s+/);
    if (fields.length !== 3) return malformed(`${family} level ${index + 1} needs id, energy, occupancy`);
    const id = fields[0]!;
    const e = Number(fields[1]);
    const occ = Number(fields[2]);
    if (!id || !Number.isFinite(e)) return malformed(`${family} level ${index + 1} has an invalid energy`);
    if (!Number.isInteger(occ) || occ < 0) return malformed(`${family} level ${id} has an invalid occupancy`);
    const capacity = occupancyCapacity(id, family);
    if (occ > capacity) return malformed(`${family} level ${id} exceeds capacity ${capacity}`);
    levels.push({ id, e, occ, capacity });
  }
  return levels.length ? levels : malformed(`${family} needs at least one level`);
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

function highlightLevels(b: SceneBuilder, spec: SpecDoc, levels: Level[], prefixes: string[]): void {
  const wanted = new Set(spec.highlight.map((value) => value.toLowerCase()));
  const ids: string[] = [...spec.highlight];
  prefixes.forEach((prefix) => levels.forEach((level) => {
    if (wanted.has(level.id.toLowerCase())) ids.push(`${prefix}-${safeId(level.id)}`);
  }));
  b.hl(ids);
}

function compileLevels(spec: SpecDoc, ctx: CompileCtx, family: string, left: Level[], right: Level[], center: Level[]): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder(family, w, h);
  const panelResult = addPanels(b, spec, w, h);
  if (panelResult) return panelResult;
  const all = [...left, ...right, ...center];
  if (!all.length) return malformed(`${family} needs semantic levels`);
  const energies = all.map((level) => level.e);
  const eMin = Math.min(...energies);
  const eMax = Math.max(...energies);
  const top = 40;
  const bottom = h - 25;
  const mapY = (energy: number) => bottom - ((energy - eMin) / (eMax - eMin || 1)) * (bottom - top);
  const drawColumn = (levels: Level[], x: number, prefix: string, labelSide: 'E' | 'W'): void => {
    levels.forEach((level) => {
      const y = mapY(level.e);
      const sid = `${prefix}-${safeId(level.id)}`;
      b.line(sid, x - 22, y, x + 22, y, { width: 2, color: spec.highlight.some((value) => value.toLowerCase() === level.id.toLowerCase()) ? 'accent' : 'neutral', role: 'geometry' });
      b.label(`${sid}-label`, level.id, x + (labelSide === 'E' ? 34 : -34), y, { slot: labelSide, priority: 'required', anchorId: sid });
      const arrows = level.occ;
      for (let i = 0; i < arrows; i++) {
        const dx = (i - (arrows - 1) / 2) * 8;
        b.label(`${sid}-electron-${i}`, i % 2 === 0 ? '↑' : '↓', x + dx, y - 8, { protected: true, priority: 'required', anchorId: sid });
      }
    });
  };
  if (left.length || right.length) {
    drawColumn(left, w * 0.18, 'left', 'E');
    drawColumn(center, w * 0.5, 'center', 'E');
    drawColumn(right, w * 0.82, 'right', 'W');
  } else {
    drawColumn(center, w * 0.31, 'center', 'E');
  }
  const title = specGet(spec, 'molecule') ?? (family === 'cft' ? specGet(spec, 'geom') : undefined);
  if (title?.trim()) b.label('ladder-title', title, w / 2, 14, { protected: true, priority: 'preferred' });
  highlightLevels(b, spec, all, ['left', 'center', 'right']);
  return layoutAndCompile(b.scene());
}

function explicitNumber(spec: SpecDoc, key: string, fallback?: number): number | CompileResult | undefined {
  const raw = specGet(spec, key);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : malformed(`${key}: expected a number`);
}

export function compileLadder(spec: SpecDoc, ctx: CompileCtx, family = 'mo'): CompileResult {
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
  return compileLevels(spec, ctx, family, left, right, center);
}

export function compileCft(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const d = explicitNumber(spec, 'd');
  if (d !== undefined && typeof d !== 'number') return d;
  if (typeof d === 'number' && (!Number.isInteger(d) || d < 0 || d > 10)) return malformed('cft d must be an integer from 0 through 10');
  const geometry = specGet(spec, 'geom');
  if (geometry && !/^(?:oh|oct|octahedral)$/i.test(geometry.trim())) return malformed(`cft geometry unsupported: ${geometry}`);
  let levelsRaw = specGet(spec, 'levels');
  if (levelsRaw === undefined) {
    if (d === undefined) return malformed('cft needs levels or d');
    levelsRaw = `t2g -1 ${Math.min(6, d)}; eg 1 ${Math.max(0, d - 6)}`;
  }
  const parsed = parseLevels(levelsRaw, 'cft');
  if (!Array.isArray(parsed)) return parsed;
  if (d !== undefined && parsed.reduce((sum, level) => sum + level.occ, 0) !== d) return malformed('cft level occupancy must equal d');
  const t2g = parsed.find((level) => /^t2g$/i.test(level.id));
  const eg = parsed.find((level) => /^eg$/i.test(level.id));
  if (t2g && eg && t2g.e >= eg.e) return malformed('cft requires t2g below eg for octahedral splitting');
  return compileLevels(spec, ctx, 'cft', [], [], parsed);
}

export function compileJablonski(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const raw = specGet(spec, 'levels') ?? 'S0 0 2; S1 20 0; T1 12 0';
  const parsed = parseLevels(raw, 'jablonski');
  if (!Array.isArray(parsed)) return parsed;
  return compileLevels(spec, ctx, 'jablonski', [], [], parsed);
}
