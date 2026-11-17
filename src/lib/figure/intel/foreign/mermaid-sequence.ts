/**
 * Mermaid `sequenceDiagram` -> `type=sequence` (actor / msg / reply / note lines).
 *
 * Solid arrows are messages and dashed arrows are replies. Frames (loop, alt, opt, par…) are
 * flattened: their messages stay in source order and the frame is recorded in the notes.
 */
import { type Notes, nativeIds, oneLine, refuse, specText } from './native';
import { mermaidLabel } from './text';

type Line = 'msg' | 'reply';

/** Longest first. Arrowless and async heads are still one message from the first actor to the second. */
const ARROWS: Array<{ token: string; line: Line; head: string }> = [
  { token: '<<-->>', line: 'reply', head: 'both' },
  { token: '<<->>', line: 'msg', head: 'both' },
  { token: '-->>', line: 'reply', head: '' },
  { token: '--x', line: 'reply', head: 'async' },
  { token: '--)', line: 'reply', head: 'async' },
  { token: '-->', line: 'reply', head: 'open' },
  { token: '->>', line: 'msg', head: '' },
  { token: '-x', line: 'msg', head: 'async' },
  { token: '-)', line: 'msg', head: 'async' },
  { token: '->', line: 'msg', head: 'open' },
];
const FRAMES = /^(loop|alt|opt|par|critical|break|rect|box)(?:\s+(.*))?$/i;
const BRANCHES = /^(else|and|option)(?:\s+(.*))?$/i;
const IGNORED = /^(activate|deactivate|autonumber|links?|properties|details|accTitle|accDescr)\b/i;

interface SequenceEvent {
  kind: Line | 'note';
  from: string;
  to?: string;
  text: string;
}

function actorName(text: string): string {
  const name = text.trim();
  if (!name || /[<>:,;+"]|-[>x)]/.test(name)) refuse('a participant name cannot be read');
  return mermaidLabel(name);
}

export function translateSequence(lines: string[], notes: Notes): { content: string; caption?: string } {
  const actors = new Map<string, string | undefined>();
  const events: SequenceEvent[] = [];
  let caption: string | undefined;
  let depth = 0;
  const actor = (name: string): string => {
    const key = actorName(name);
    if (!actors.has(key)) actors.set(key, undefined);
    return key;
  };
  for (const raw of lines) {
    const line = oneLine(raw).replace(/;$/, '').trim();
    if (!line) continue;
    const declared = /^(participant|actor)\s+(.+)$/i.exec(line);
    const frame = FRAMES.exec(line);
    const note = /^note\s+(right\s+of|left\s+of|over)\s+([^:]+):(.*)$/i.exec(line);
    const title = /^title\s*:?\s+(.+)$/i.exec(line);
    if (declared) {
      if (declared[2]!.includes('@{')) refuse('typed participants have no native form');
      const alias = /^(.*?)\s+as\s+(.+)$/.exec(declared[2]!);
      const key = actor(alias ? alias[1]! : declared[2]!);
      if (alias) actors.set(key, mermaidLabel(alias[2]!));
      if (declared[1]!.toLowerCase() === 'actor') notes.add('stick-figure actor drawn as a participant');
    } else if (/^(create|destroy)\b/i.test(line)) {
      refuse('participant creation and destruction have no native form');
    } else if (title) {
      caption = mermaidLabel(title[1]!) || undefined;
    } else if (note) {
      const over = note[2]!.split(',').map(actor);
      const text = mermaidLabel(note[3]!);
      if (!text) refuse('a note has no text');
      if (over.length > 1) notes.add(`note over ${over.join(', ')} attached to ${over[0]!}`);
      events.push({ kind: 'note', from: over[0]!, text });
    } else if (/^note\b/i.test(line)) {
      refuse('a note cannot be read');
    } else if (frame && !ARROWS.some((arrow) => line.includes(arrow.token))) {
      depth++;
      const label = frame[2] && !/^(rect|box)$/i.test(frame[1]!) ? ` "${mermaidLabel(frame[2])}"` : '';
      notes.add(`${frame[1]!.toLowerCase()}${label} frame dropped: its messages are kept in order`);
    } else if (BRANCHES.test(line) && depth && !ARROWS.some((arrow) => line.includes(arrow.token))) {
      const branch = BRANCHES.exec(line)!;
      notes.add(`${branch[1]!.toLowerCase()}${branch[2] ? ` "${mermaidLabel(branch[2])}"` : ''} branch dropped: its messages are kept in order`);
    } else if (/^end$/i.test(line)) {
      if (!depth) refuse('end without a frame');
      depth--;
    } else if (IGNORED.test(line)) {
      notes.add(/^(activate|deactivate)/i.test(line) ? 'activation bars dropped' : /^autonumber/i.test(line) ? 'message numbering dropped' : 'participant metadata ignored');
    } else {
      events.push(message(line, actor, notes));
    }
  }
  if (depth) refuse('a frame is not closed');
  if (!events.some((event) => event.kind !== 'note')) refuse('the sequence has no messages');
  const ids = nativeIds([...actors.keys()], 'p');
  const out: string[] = [];
  for (const [key, label] of actors) {
    const id = ids.get(key)!;
    const shown = label ?? key;
    out.push(shown === id ? `actor: ${id}` : `actor: ${id} ${shown}`);
  }
  for (const event of events) {
    out.push(event.kind === 'note'
      ? `note: ${ids.get(event.from)!} ${event.text}`
      : `${event.kind}: ${ids.get(event.from)!} ${ids.get(event.to!)!} ${event.text}`);
  }
  return { content: specText(out), caption };
}

function message(line: string, actor: (name: string) => string, notes: Notes): SequenceEvent {
  for (let at = 0; at < line.length; at++) {
    if (line[at] !== '-' && line[at] !== '<') continue;
    const arrow = ARROWS.find((candidate) => line.startsWith(candidate.token, at));
    if (!arrow) continue;
    if (arrow.head === 'both') refuse('two-way messages have no native form');
    const rest = line.slice(at + arrow.token.length);
    const colon = rest.indexOf(':');
    if (colon < 0) refuse('a message has no text');
    const target = rest.slice(0, colon).trim();
    if (/^[+-]/.test(target)) notes.add('activation bars dropped');
    const text = mermaidLabel(rest.slice(colon + 1));
    if (!text) refuse('a message has no text');
    if (arrow.head === 'async') notes.add('async arrowhead drawn as a regular arrowhead');
    if (arrow.head === 'open') notes.add('arrowless message line drawn with an arrowhead');
    return { kind: arrow.line, from: actor(line.slice(0, at)), to: actor(target.replace(/^[+-]/, '')), text };
  }
  return refuse('a sequence statement cannot be read');
}
