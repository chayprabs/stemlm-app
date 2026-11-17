/**
 * Arrow lists (`A -> B`, `A -> B: label`, `A --5--> B`, `A → B → C`, `A <-> B`) -> `type=graph`.
 *
 * Only when every non-blank line is an arrow line. Anything a line could mean two ways (a colon in
 * a source name, a run of dashes inside a name) refuses the whole list.
 */
import { GraphDraft, Notes, labelText, refuse, type Translation } from './native';

const MAX_LINES = 200;
const WORD = String.raw`[^\s<>=-]`;
/**
 * One arrow. Labelled forms first (`-- text -->`, `-5->`, `== text ==>`); they must follow a space,
 * so the hyphen of `well-known` never opens one.
 */
const ARROW = new RegExp(
  [
    String.raw`(?<=\s)--\s*(${WORD}(?:[^<>=-]{0,58}${WORD})?)\s*--?>`,
    String.raw`(?<=\s)-(${WORD}{1,20})->`,
    String.raw`(?<=\s)==\s*(${WORD}(?:[^<>=-]{0,58}${WORD})?)\s*==?>`,
    String.raw`(?<=\s)=(${WORD}{1,20})=>`,
    String.raw`(<-{1,3}>|<={1,2}>|[↔⇔⟷])`,
    String.raw`(-{1,3}>|={1,2}>|[→⟶⇒⟹➜➔])`,
    String.raw`(<-{1,3}(?!-)|[←⟵⇐])`,
  ].join('|'),
  'gu',
);
const ANY_ARROW = /->|=>|<-|[→⟶⇒⟹➜➔←⟵⇐↔⇔⟷]/u;

/** Cheap shape check: every non-blank line holds an arrow. Never throws. */
export function looksLikeArrows(source: string): boolean {
  if (typeof source !== 'string' || !ANY_ARROW.test(source)) return false;
  const lines = source.split('\n').filter((line) => line.trim());
  return lines.length > 0 && lines.length <= MAX_LINES && lines.every((line) => ANY_ARROW.test(line));
}

function nodeName(raw: string, strict: boolean): string {
  const name = labelText(raw.replace(/^\s*(["'])(.*)\1\s*$/, '$2'));
  if (!name) refuse('an arrow has no node on one side');
  if (/--|==|[<>|]/.test(name)) refuse('a node name holds arrow characters');
  // In an unlabelled fence the same shapes are code (`p->next = q`, `x => x + 1`).
  if (strict && /[=;{}]/.test(name)) refuse('the lines read as code, not as a diagram');
  return name;
}

/**
 * Translate an arrow list. `strict` is for text nobody declared to be a diagram: ASCII arrows must
 * stand between spaces, and the edges must share a node, as a diagram's do. Throws `Refusal`.
 */
export function translateArrows(source: string, strict: boolean): Translation {
  const lines = source.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > MAX_LINES) refuse('not an arrow list of a drawable size');
  const draft = new GraphDraft();
  draft.rankdir = 'LR';
  const notes = new Notes();
  for (const full of lines) {
    const line = full.replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '');
    const parts: string[] = [];
    const arrows: Array<{ label: string; forward: boolean; backward: boolean }> = [];
    let last = 0;
    for (const match of line.matchAll(ARROW)) {
      const ascii = /^[-=<]/.test(match[0]);
      if (strict && ascii && !(/\s/.test(line[match.index - 1] ?? '') && /\s/.test(line[match.index + match[0].length] ?? ''))) {
        refuse('an arrow is not set off by spaces');
      }
      parts.push(line.slice(last, match.index));
      arrows.push({
        label: match[1] ?? match[2] ?? match[3] ?? match[4] ?? '',
        forward: match[7] === undefined,
        backward: match[5] !== undefined || match[7] !== undefined,
      });
      last = match.index + match[0].length;
    }
    if (!arrows.length) refuse('a line is not an arrow');
    let tail = line.slice(last);
    // `A -> B: label` labels the one arrow of its line; a colon anywhere else has two readings.
    if (parts.some((part) => part.includes(':'))) refuse('a colon in a source name is ambiguous');
    const colon = tail.indexOf(':');
    if (colon >= 0) {
      if (arrows.length > 1 || arrows[0]!.label) refuse('a trailing label on a chain is ambiguous');
      arrows[0]!.label = tail.slice(colon + 1);
      tail = tail.slice(0, colon);
    }
    const names = [...parts, tail].map((part) => nodeName(part, strict));
    arrows.forEach((arrow, index) => {
      const label = labelText(arrow.label);
      if (arrow.forward) draft.edge(names[index]!, names[index + 1]!, label);
      if (arrow.backward) draft.edge(names[index + 1]!, names[index]!, label);
      if (arrow.forward && arrow.backward) notes.add('two-way arrow drawn as two arrows');
    });
  }
  if (strict && (draft.edgeCount < 2 || ![...draft.degrees().values()].some((degree) => degree >= 2))) {
    refuse('unconnected arrows are not a diagram');
  }
  return { type: 'graph', content: draft.toSpec(notes), notes: notes.list() };
}
