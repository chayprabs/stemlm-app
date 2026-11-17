/**
 * Sequence diagram: actors left to right, messages top to bottom.
 *
 *   actor: <id> [label words]     optional; an actor a message names first is declared by that message
 *   msg:   <from> <to> <text>     solid arrow
 *   reply: <from> <to> <text>     dashed arrow
 *   note:  <actor> <text>         note box beside that lifeline
 *
 * Actors stand in order of first appearance in the source (a declaration or a message), as in Mermaid.
 * The lifeline spacing follows the message text; text that still does not fit its span wraps, then ends in an
 * ellipsis, so two labels never share space. The canvas grows downward with the story.
 */
import type { CompileCtx, CompileResult } from '../../types';
import type { SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { layoutAndCompile } from '../../pipeline';
import { LINE_PITCH, fail, isClipped, orderedEntries, textWidth, unquote, wrapText } from './common';

export const SEQUENCE_MAX_ACTORS = 6;
export const SEQUENCE_MAX_EVENTS = 20;

const MARGIN = 8;
/** Lifelines stand this far apart when the frame has the room, and never closer than the floor. */
const EASY_GAP = 64;
const MIN_GAP = 44;
const BOX_MIN_W = 34;
const BOX_PAD = 7;
const ACTOR_LABEL_W = 78;
const ACTOR_WORD_W = 130;
const LABEL_W_CAP = 150;
const LOOP_W = 18;
const LOOP_H = 14;
const SIDE_TEXT_W = 96;
const NOTE_PAD = 6;
const ROW_GAP = 8;
/** Widths tried in order: the nominal frame first, wider only while some text would still end in an ellipsis. */
const WIDTH_STEPS = [1, 1.2, 1.4, 1.5];
const MAX_HEIGHT_FACTOR = 3.5;
/** Between these heights the panel would shrink the whole figure; a slightly airier diagram reads at full size. */
const SHRINK_FLOOR = 1.25;
const TALL_FROM = 1.51;

interface Actor {
  id: string;
  label: string;
}

interface SequenceEvent {
  kind: 'msg' | 'reply' | 'note';
  from: number;
  to: number;
  text: string;
}

interface Parsed {
  actors: Actor[];
  events: SequenceEvent[];
}

const ARROW = /^(?:-{1,2}>{1,2}|-{1,2}[x)]|→|⇒|=>)$/;

function parse(spec: SpecDoc): Parsed | string {
  const actors: Actor[] = [];
  const events: SequenceEvent[] = [];
  const find = (id: string): number => {
    const exact = actors.findIndex((actor) => actor.id === id);
    return exact >= 0 ? exact : actors.findIndex((actor) => actor.id.toLowerCase() === id.toLowerCase());
  };
  const use = (id: string): number => {
    const known = find(id);
    if (known >= 0) return known;
    actors.push({ id, label: id });
    return actors.length - 1;
  };
  const cleanId = (token: string) => unquote(token.replace(/[:,]+$/, ''));

  for (const entry of orderedEntries(spec, ['actor', 'msg', 'reply', 'note'])) {
    const words = entry.value.trim().split(/\s+/).filter(Boolean);
    if (entry.key === 'actor') {
      const id = cleanId(words[0] ?? '');
      if (!id) return 'actor needs an id';
      const label = unquote(words.slice(1).join(' ').replace(/^as\s+/i, ''));
      const index = use(id);
      if (label) actors[index]!.label = label;
      continue;
    }
    if (entry.key === 'note') {
      const id = cleanId(words[0] ?? '');
      const text = unquote(words.slice(1).join(' '));
      const index = id ? find(id) : -1;
      if (index < 0) return `note names an actor that no actor or message line declares: ${id || '(none)'}`;
      if (!text) return `note on ${id} has no text`;
      events.push({ kind: 'note', from: index, to: index, text });
      continue;
    }
    // `a -> b: text` and `a->b text` are the same message as `a b text`.
    const spaced = entry.value.replace(/^\s*([^\s-]+)\s*(-{1,2}>{1,2})\s*/, '$1 $2 ').trim().split(/\s+/).filter(Boolean);
    const from = cleanId(spaced[0] ?? '');
    const hasArrow = ARROW.test(spaced[1] ?? '');
    const to = cleanId(spaced[hasArrow ? 2 : 1] ?? '');
    if (!from || !to) return `${entry.key} needs a sender and a receiver: ${entry.value.trim()}`;
    const text = unquote(spaced.slice(hasArrow ? 3 : 2).join(' ').replace(/^:\s*/, ''));
    const fromIndex = use(from);
    events.push({ kind: entry.key as 'msg' | 'reply', from: fromIndex, to: use(to), text });
  }
  return { actors, events };
}

interface Plan {
  width: number;
  xs: number[];
  boxW: number[];
  actorLines: string[][];
  eventLines: string[][];
  noteLeft: boolean[];
  score: number;
}

/** Space beside the last lifeline before the frame ends: what its self-messages need, and what its notes would like. */
function sideRoom(parsed: Parsed): { need: number; want: number } {
  const last = parsed.actors.length - 1;
  let need = 0;
  let want = 0;
  for (const event of parsed.events) {
    if (event.from !== last || event.to !== last) continue;
    const text = Math.min(textWidth(event.text), SIDE_TEXT_W);
    if (event.kind === 'note') want = Math.max(want, 5 + text + 2 * NOTE_PAD + 2);
    else need = Math.max(need, LOOP_W + 5 + text + 2);
  }
  return { need, want: Math.max(need, want) };
}

function plan(parsed: Parsed, target: number): Plan {
  const { actors, events } = parsed;
  const count = actors.length;
  // A box is as wide as its longest word, so a one-word name is never cut for the sake of a narrow column.
  const actorLines = actors.map((actor) => {
    const widestWord = Math.max(...actor.label.split(/\s+/).map(textWidth));
    return wrapText(actor.label, Math.min(ACTOR_WORD_W, Math.max(ACTOR_LABEL_W, widestWord)), 2);
  });
  const boxW = actorLines.map((lines) => Math.max(BOX_MIN_W, Math.max(...lines.map(textWidth)) + 2 * BOX_PAD));
  const minGap = Array.from({ length: Math.max(0, count - 1) }, (_, i) => Math.max(MIN_GAP, (boxW[i]! + boxW[i + 1]!) / 2 + 10));
  const want = minGap.map((gap) => Math.max(gap, EASY_GAP));
  const span = (a: number, b: number, gaps: number[]) => gaps.slice(Math.min(a, b), Math.max(a, b)).reduce((sum, gap) => sum + gap, 0);
  const need = (event: SequenceEvent) => Math.min(textWidth(event.text), LABEL_W_CAP) + 18;
  // Nearest neighbours first, so a long call across several lifelines only widens what the short ones left narrow.
  const across = events.filter((event) => event.kind !== 'note' && event.from !== event.to)
    .sort((a, b) => Math.abs(a.from - a.to) - Math.abs(b.from - b.to));
  for (const event of across) {
    const lo = Math.min(event.from, event.to);
    const hi = Math.max(event.from, event.to);
    const deficit = need(event) - span(lo, hi, want);
    if (deficit > 0) for (let i = lo; i < hi; i++) want[i]! += deficit / (hi - lo);
  }
  for (const event of events) {
    if (event.kind === 'note' || event.from !== event.to || event.from === count - 1) continue;
    want[event.from] = Math.max(want[event.from]!, LOOP_W + 5 + Math.min(textWidth(event.text), SIDE_TEXT_W) + 8);
  }
  // The room right of the last lifeline is one more gap: it shrinks with the others when the frame is tight.
  const side = sideRoom(parsed);
  minGap.push(Math.max(boxW[count - 1]! / 2, side.need));
  want.push(Math.max(boxW[count - 1]! / 2, side.want));
  const edge = MARGIN + boxW[0]! / 2 + MARGIN;
  const total = (gaps: number[]) => edge + gaps.reduce((sum, gap) => sum + gap, 0);
  const slack = total(want) - total(minGap);
  const t = total(want) <= target || slack <= 0 ? 1 : Math.max(0, (target - total(minGap)) / slack);
  const gaps = minGap.map((gap, i) => gap + (want[i]! - gap) * t);
  const width = Math.max(target, total(gaps));
  const left = (width - total(gaps)) / 2 + MARGIN + boxW[0]! / 2;
  const xs: number[] = [left];
  gaps.slice(0, -1).forEach((gap, i) => xs.push(xs[i]! + gap));

  const noteLeft: boolean[] = [];
  const eventLines = events.map((event, index) => {
    const x = xs[event.from]!;
    if (event.kind === 'note') {
      const rightRoom = width - MARGIN - (x + 5) - 2 * NOTE_PAD;
      const leftRoom = x - 5 - MARGIN - 2 * NOTE_PAD;
      noteLeft[index] = rightRoom < Math.min(textWidth(event.text), 60) && leftRoom > rightRoom;
      return wrapText(event.text, Math.min(SIDE_TEXT_W + 14, noteLeft[index] ? leftRoom : rightRoom), 4);
    }
    noteLeft[index] = false;
    if (!event.text) return [];
    if (event.from === event.to) {
      const next = xs[event.from + 1];
      const room = (next === undefined ? width - MARGIN : next - 6) - (x + LOOP_W + 5);
      return wrapText(event.text, Math.max(20, room), 3);
    }
    return wrapText(event.text, Math.abs(xs[event.to]! - x) - 14, 3);
  });
  const score = eventLines.filter(isClipped).length;
  return { width, xs, boxW, actorLines, eventLines, noteLeft, score };
}

export function compileSequence(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const parsed = parse(spec);
  if (typeof parsed === 'string') return fail(`sequence: ${parsed}`);
  const { actors, events } = parsed;
  if (!events.some((event) => event.kind !== 'note')) return fail('sequence needs at least one msg or reply line');
  if (actors.length > SEQUENCE_MAX_ACTORS) return fail(`sequence draws at most ${SEQUENCE_MAX_ACTORS} actors legibly; this one has ${actors.length}`, 'refused');
  if (events.length > SEQUENCE_MAX_EVENTS) return fail(`sequence draws at most ${SEQUENCE_MAX_EVENTS} messages and notes legibly; this one has ${events.length}`, 'refused');

  const nominal = frameSize(ctx.profile);
  let best: Plan | null = null;
  for (const step of WIDTH_STEPS) {
    const candidate = plan(parsed, nominal.w * step);
    if (!best || candidate.score < best.score) best = candidate;
    if (candidate.score === 0) break;
  }
  const chosen = best!;
  if (chosen.width > nominal.w * WIDTH_STEPS[WIDTH_STEPS.length - 1]! + 0.5) {
    return fail('sequence actors and their labels are too wide to draw legibly side by side', 'refused');
  }
  const { xs, boxW, actorLines, eventLines, noteLeft } = chosen;

  const headH = 8 + Math.max(...actorLines.map((lines) => lines.length)) * LINE_PITCH;
  const heights = events.map((event, index) => {
    const lines = eventLines[index]!.length;
    if (event.kind === 'note') return lines * LINE_PITCH + 6;
    if (event.from === event.to) return Math.max(LOOP_H, lines * LINE_PITCH) + 2;
    return lines ? lines * LINE_PITCH + 3 : 6;
  });
  const body = heights.reduce((sum, height) => sum + height + ROW_GAP, 0);
  const plain = MARGIN + headH + ROW_GAP + body + MARGIN;
  // Actor boxes repeat under a long diagram, where the header has scrolled away, or when the frame has the room.
  const footer = (events.length >= 3 && plain + headH <= nominal.h) || plain > nominal.h * TALL_FROM;
  let height = plain + (footer ? headH : 0);
  let stretch = 0;
  if (height > nominal.h * SHRINK_FLOOR && height < nominal.h * TALL_FROM) {
    stretch = (nominal.h * TALL_FROM - height) / (events.length + 1);
    height = nominal.h * TALL_FROM;
  }
  if (height > nominal.h * MAX_HEIGHT_FACTOR) return fail('sequence is too long to draw legibly; split it into shorter diagrams', 'refused');

  const b = new SceneBuilder('sequence', chosen.width, Math.max(height, Math.min(nominal.h, 96)));
  const top = (b.height - height) / 2 + MARGIN;
  const lifeTop = top + headH;
  const lifeBottom = b.height - (b.height - height) / 2 - MARGIN - (footer ? headH : 0);

  const lines = (id: string, text: string[], x: number, centerY: number) => {
    const first = centerY - ((text.length - 1) * LINE_PITCH) / 2;
    text.forEach((line, i) => b.label(`${id}${i ? `-${i}` : ''}`, line, x, first + i * LINE_PITCH, { protected: true }));
  };

  const tops: number[] = [];
  let cursor = lifeTop + ROW_GAP + stretch;
  heights.forEach((blockH) => {
    tops.push(cursor);
    cursor += blockH + ROW_GAP + stretch;
  });

  // A message label may span lifelines that lie between its two ends; those lifelines pause behind the text.
  actors.forEach((_, i) => {
    const pauses: Array<[number, number]> = [];
    events.forEach((event, index) => {
      const text = eventLines[index]!;
      const lo = Math.min(event.from, event.to);
      const hi = Math.max(event.from, event.to);
      if (!text.length || i <= lo || i >= hi) return;
      const half = Math.max(...text.map(textWidth)) / 2 + 3;
      if (Math.abs(xs[i]! - (xs[lo]! + xs[hi]!) / 2) < half) pauses.push([tops[index]! - 1, tops[index]! + text.length * LINE_PITCH]);
    });
    let from = lifeTop;
    [...pauses, [lifeBottom, lifeBottom] as [number, number]].forEach(([stop, resume], piece) => {
      if (stop > from) b.line(`lifeline-${i}${piece ? `-${piece}` : ''}`, xs[i]!, from, xs[i]!, stop, { color: 'muted', role: 'guide', width: 1, dash: true });
      from = resume;
    });
  });

  events.forEach((event, index) => {
    const text = eventLines[index]!;
    const x = xs[event.from]!;
    const blockH = heights[index]!;
    const y = tops[index]!;
    if (event.kind === 'note') {
      const w = Math.max(...text.map(textWidth)) + 2 * NOTE_PAD;
      const left = noteLeft[index] ? x - 5 - w : x + 5;
      b.rect(`note-${index}`, left, y, w, blockH, { color: 'muted', role: 'annotation', fill: 'paper', width: 1 });
      lines(`note-label-${index}`, text, left + w / 2, y + blockH / 2);
    } else if (event.from === event.to) {
      const mid = y + blockH / 2;
      b.path(`msg-${index}`, `M ${x} ${mid - LOOP_H / 2} H ${x + LOOP_W} V ${mid + LOOP_H / 2} H ${x}`, { role: 'connector', width: 1.4, dash: event.kind === 'reply', markerEnd: true });
      if (text.length) lines(`msg-label-${index}`, text, x + LOOP_W + 5 + Math.max(...text.map(textWidth)) / 2, mid);
    } else {
      const to = xs[event.to]!;
      b.line(`msg-${index}`, x, y + blockH, to, y + blockH, { role: 'connector', width: 1.4, dash: event.kind === 'reply', markerEnd: true });
      if (text.length) lines(`msg-label-${index}`, text, (x + to) / 2, y + (text.length * LINE_PITCH) / 2);
    }
  });

  const box = (id: string, i: number, y: number) => {
    b.rect(`${id}-${i}`, xs[i]! - boxW[i]! / 2, y, boxW[i]!, headH, { role: 'boundary', fill: 'paper', width: 1.4 });
    lines(`${id}-label-${i}`, actorLines[i]!, xs[i]!, y + headH / 2);
  };
  actors.forEach((_, i) => {
    box('actor', i, top);
    if (footer) box('actor-foot', i, lifeBottom);
  });
  return layoutAndCompile(b.scene());
}
