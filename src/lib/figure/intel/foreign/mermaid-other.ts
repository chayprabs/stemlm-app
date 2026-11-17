/**
 * The smaller Mermaid diagram types: pie -> `chart`, numeric gantt -> `gantt`, member-less class
 * diagrams and mind maps -> `graph`. Each refuses whatever its native target cannot say.
 */
import { GraphDraft, type Notes, applyDirection, labelText, refuse, specText } from './native';
import { mermaidLabel } from './text';

const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** `pie [showData] [title …]` then `"Label" : value` rows -> `kind: pie` with parallel label and value lists. */
export function translatePie(rest: string, lines: string[], frontTitle: string | undefined, notes: Notes): string {
  let title = frontTitle;
  const labels: string[] = [];
  const values: string[] = [];
  for (const raw of [rest, ...lines]) {
    let line = raw.trim();
    if (/^showData\b/i.test(line)) {
      notes.add('showData (values in the legend) ignored');
      line = line.slice(8).trim();
    }
    if (!line) continue;
    const titled = /^title\s+(.*)$/i.exec(line);
    const slice = /^(?:"([^"]*)"|'([^']*)'|([^:"']+))\s*:\s*(\S+)$/.exec(line);
    if (titled) title = mermaidLabel(titled[1]!) || title;
    else if (/^(accTitle|accDescr)\b/.test(line)) notes.add('accessibility text ignored');
    else if (slice) {
      const label = mermaidLabel(slice[1] ?? slice[2] ?? slice[3]!);
      const value = slice[4]!;
      if (!label || /[,;]/.test(label)) refuse('a pie label cannot be written in a comma-separated list');
      if (!NUMBER.test(value) || Number(value) < 0) refuse('a pie value is not a non-negative number');
      labels.push(label);
      values.push(value.replace(/^\+/, ''));
    } else refuse('a pie statement cannot be read');
  }
  if (!labels.length) refuse('the pie has no slices');
  return specText(['kind: pie', ...(title ? [`title: ${title}`] : []), `labels: ${labels.join(', ')}`, `values: ${values.join(', ')}`]);
}

/**
 * Mermaid gantt charts are calendars; the native gantt is a numeric timeline. Only a chart on
 * plain numbers (`dateFormat X`) with one-word task names maps without changing what is shown.
 */
export function translateGantt(lines: string[], frontTitle: string | undefined, notes: Notes): string {
  let title = frontTitle;
  let numeric = false;
  let sections = 0;
  let previousEnd: number | undefined;
  const ends = new Map<string, number>();
  const jobs: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const titled = /^title\s+(.*)$/i.exec(line);
    const colon = line.indexOf(':');
    if (titled) title = mermaidLabel(titled[1]!) || title;
    else if (/^dateFormat\s/i.test(line)) numeric = line.slice(10).trim() === 'X';
    else if (/^(axisFormat|tickInterval|todayMarker|weekday|accTitle|accDescr)\b/i.test(line)) notes.add('axis formatting ignored');
    else if (/^(excludes|includes)\b/i.test(line)) refuse('calendar exclusions have no native form');
    else if (/^section\s/i.test(line)) {
      if (++sections > 1) refuse('gantt sections have no native form');
      notes.add(`section "${mermaidLabel(line.slice(8))}" heading dropped`);
    } else if (colon > 0) {
      const name = line.slice(0, colon).trim();
      if (!/^[^\s,;|]+$/.test(name)) refuse('a gantt task name must be one word natively');
      const fields = line.slice(colon + 1).split(',').map((field) => field.trim());
      if (fields.some((field) => /^(done|active|crit|milestone)$/i.test(field))) refuse('task status tags have no native form');
      if (fields.length > 3 || fields.some((field) => !field)) refuse('a gantt task cannot be read');
      const id = fields.length === 3 ? fields[0]! : undefined;
      const startText = fields.length === 1 ? undefined : fields[fields.length - 2]!;
      const after = startText === undefined ? null : /^after\s+(\S+)$/i.exec(startText);
      const start = startText === undefined ? previousEnd : after ? ends.get(after[1]!) : NUMBER.test(startText) ? Number(startText) : undefined;
      if (start === undefined) refuse('a gantt task start cannot be read');
      const endText = fields[fields.length - 1]!;
      const seconds = /^(\d+(?:\.\d+)?)s$/.exec(endText);
      const duration = seconds ? Number(seconds[1]) : NUMBER.test(endText) ? Number(endText) - start : NaN;
      if (!(duration > 0)) refuse('a gantt task needs a positive duration');
      previousEnd = start + duration;
      ends.set(id ?? name, previousEnd);
      jobs.push(`${name} ${start} ${Number(duration.toFixed(6))}`);
    } else refuse('a gantt statement cannot be read');
  }
  if (!numeric) refuse('calendar gantt charts have no native form; only dateFormat X (plain numbers) maps');
  if (!jobs.length) refuse('the gantt chart has no tasks');
  return specText([`jobs: ${jobs.join('; ')}`, ...(title ? [`label: ${title}`] : [])]);
}

interface Relation {
  /** True when the arrow reads from the right-hand class to the left-hand one. */
  reversed: boolean;
  word: string;
}

/** UML relation glyphs as words; the edge always runs from the class that holds the relation. */
const RELATIONS: Record<string, Relation> = {
  '<|--': { reversed: true, word: 'extends' },
  '--|>': { reversed: false, word: 'extends' },
  '<|..': { reversed: true, word: 'implements' },
  '..|>': { reversed: false, word: 'implements' },
  '*--': { reversed: false, word: 'composed of' },
  '--*': { reversed: true, word: 'composed of' },
  'o--': { reversed: false, word: 'aggregates' },
  '--o': { reversed: true, word: 'aggregates' },
  '-->': { reversed: false, word: '' },
  '<--': { reversed: true, word: '' },
  '..>': { reversed: false, word: 'depends on' },
  '<..': { reversed: true, word: 'depends on' },
};
const CLASS_NAME = String.raw`[\p{L}\p{N}_~]+`;
const RELATION_LINE = new RegExp(String.raw`^(${CLASS_NAME})\s*("[^"]*")?\s*([<|*o.>-]{2,5})\s*("[^"]*")?\s*(${CLASS_NAME})\s*(?::(.*))?$`, 'u');
const CLASS_LINE = new RegExp(String.raw`^class\s+(${CLASS_NAME})\s*(?:\["([^"]*)"\])?\s*(?::::[\w-]+)?\s*(<<[^<>]+>>)?\s*(\{.*)?$`, 'u');

/**
 * Class diagrams as a labelled graph, for diagrams that are only classes and relations. A class
 * with members is refused: a graph node has no compartments, so its attributes would be lost.
 */
export function translateClass(lines: string[], notes: Notes): string {
  const draft = new GraphDraft();
  draft.rankdir = 'LR';
  const stereotypes = new Map<string, string>();
  const classNode = (name: string) => {
    const node = draft.node(name.replace(/~[^~]*~/g, ''));
    if (name.includes('~')) node.label = name.replace(/~([^~]*)~/g, '<$1>');
    return node;
  };
  let inBody: string | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const annotation = /^<<([^<>]+)>>\s*(\S*)$/.exec(line);
    if (inBody !== null) {
      if (line === '}') inBody = null;
      else if (annotation && !annotation[2]) stereotypes.set(inBody, annotation[1]!.trim());
      else refuse('class members have no native form');
      continue;
    }
    const declared = CLASS_LINE.exec(line);
    const relation = declared ? null : RELATION_LINE.exec(line);
    if (/^direction\s/.test(line)) applyDirection(draft, line.slice(9).trim(), notes);
    else if (/^(click|link|callback|style|classDef|cssClass|accTitle|accDescr)\b/.test(line)) notes.add('styling ignored');
    else if (declared) {
      const node = classNode(declared[1]!);
      if (declared[2] !== undefined) node.label = mermaidLabel(declared[2]);
      if (declared[3]) stereotypes.set(node.key, declared[3].slice(2, -2).trim());
      const body = declared[4]?.slice(1).trim();
      if (body === undefined) continue;
      if (body === '') inBody = node.key;
      else if (body !== '}') refuse('class members have no native form');
    } else if (annotation && annotation[2]) {
      stereotypes.set(classNode(annotation[2]).key, annotation[1]!.trim());
    } else if (relation) {
      const kind = Object.prototype.hasOwnProperty.call(RELATIONS, relation[3]!) ? RELATIONS[relation[3]!]! : null;
      if (!kind) refuse(relation[3] === '--' || relation[3] === '..' ? 'undirected links cannot be drawn without inventing a direction' : 'a class relation cannot be read');
      if (relation[2] || relation[4]) refuse('relation multiplicities have no native form');
      const label = relation[6] === undefined ? '' : mermaidLabel(relation[6]);
      if (label && kind.word) refuse('a typed relation with its own label has no native form');
      const left = classNode(relation[1]!).key;
      const right = classNode(relation[5]!).key;
      if (kind.word) notes.add(`UML ${relation[3]!} arrow written as "${kind.word}"`);
      draft.edge(kind.reversed ? right : left, kind.reversed ? left : right, label || kind.word);
    } else refuse(line.includes(':') ? 'class members have no native form' : 'a class statement cannot be read');
  }
  if (inBody !== null) refuse('a class body is not closed');
  for (const [key, stereotype] of stereotypes) {
    const node = draft.node(key);
    node.label = `«${stereotype}» ${node.label ?? key}`;
  }
  return draft.toSpec(notes);
}

const MINDMAP_SHAPES: Array<[string, string]> = [['((', '))'], ['))', '(('], ['{{', '}}'], ['(', ')'], [')', '('], ['[', ']']];

/** Indentation is the tree: each node hangs from the nearest line above it that is indented less. */
export function translateMindmap(lines: string[], notes: Notes): string {
  const draft = new GraphDraft();
  const stack: Array<{ indent: number; key: string }> = [];
  let count = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^::icon\(/.test(line) || /^:::/.test(line)) {
      notes.add('icons and styling ignored');
      continue;
    }
    const indent = raw.length - raw.trimStart().length;
    const shaped = /^([^\s()[\]{}]*)(.*)$/.exec(line)!;
    const pair = MINDMAP_SHAPES.find(([open, close]) => shaped[2]!.startsWith(open) && shaped[2]!.endsWith(close) && shaped[2]!.length >= open.length + close.length);
    const text = mermaidLabel(pair ? shaped[2]!.slice(pair[0].length, shaped[2]!.length - pair[1].length) : line);
    if (!text) refuse('a mind-map node has no text');
    while (stack.length && stack[stack.length - 1]!.indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (!parent && count) refuse('a mind map has one root');
    // Texts may repeat across branches, so the source name is the line's position, never its text.
    const key = `\u0001${count++}`;
    draft.node(key).label = labelText(text);
    if (parent) draft.edge(parent.key, key);
    stack.push({ indent, key });
  }
  if (!count) refuse('the mind map is empty');
  notes.add('mind map drawn as a tree: each branch is an arrow from parent to child');
  return draft.toSpec(notes);
}
