/**
 * Mermaid `stateDiagram` / `stateDiagram-v2` -> `type=graph`.
 *
 * `[*] --> S` is the native entry arrow and `S --> [*]` the native accepting outline. Composite
 * states are flattened (their substates are drawn at the top level); a composite with its own
 * `[*]` is refused, because a scoped initial state drawn flat would read as the machine's start.
 */
import { GraphDraft, type Notes, applyDirection, oneLine, refuse } from './native';
import { mermaidLabel } from './text';

const PSEUDO = '[*]';
const SKIPPED = /^(classDef|class|style|scale|hide|accTitle|accDescr)(\s|:|$)/;

function stateId(text: string): string {
  const id = text.trim().replace(/:::[\w-]+$/, '').trim();
  if (id === PSEUDO) return id;
  if (!id || /[\s[\]{}"<>:]/.test(id)) refuse('a state name cannot be read');
  return id;
}

export function translateState(lines: string[], notes: Notes): string {
  const draft = new GraphDraft();
  const descriptions = new Map<string, string[]>();
  let depth = 0;
  for (const raw of lines) {
    let line = oneLine(raw).replace(/;$/, '').trim();
    while (line.startsWith('}')) {
      if (!depth) refuse('a composite state closes without opening');
      depth--;
      line = line.slice(1).trim();
    }
    if (!line) continue;
    if (/^direction\s/.test(line)) {
      if (depth) notes.add('composite-state direction ignored');
      else applyDirection(draft, line.slice(9).trim(), notes);
    } else if (SKIPPED.test(line) && !line.includes('-->')) {
      notes.add(/^(accTitle|accDescr)/.test(line) ? 'accessibility text ignored' : 'styling ignored');
    } else if (/^(end\s+)?note\b/i.test(line)) {
      refuse('state notes have no native form');
    } else if (line === '--') {
      refuse('concurrent regions have no native form');
    } else if (/^state\s/.test(line)) {
      depth += declare(line.slice(6).trim(), draft, notes);
    } else if (line.includes('-->')) {
      transition(line, depth, draft);
    } else {
      const colon = line.indexOf(':');
      const id = stateId(colon < 0 ? line : line.slice(0, colon));
      if (id === PSEUDO) refuse('a lone [*] states nothing');
      draft.node(id);
      if (colon >= 0 && !line.startsWith(':::', colon)) descriptions.set(id, [...(descriptions.get(id) ?? []), mermaidLabel(line.slice(colon + 1))]);
    }
  }
  if (depth) refuse('a composite state is not closed');
  for (const [id, texts] of descriptions) {
    const node = draft.node(id);
    const text = texts.filter(Boolean).join(' ');
    if (!text) continue;
    if (node.label !== undefined && node.label !== text) refuse('a state has both an alias and a description');
    node.label = text;
  }
  return draft.toSpec(notes);
}

/** `state "Long name" as S`, `state S <<choice>>`, `state S {`. Returns 1 when the line opens a composite. */
function declare(rest: string, draft: GraphDraft, notes: Notes): number {
  const opens = rest.endsWith('{');
  const body = opens ? rest.slice(0, -1).trim() : rest;
  const aliased = /^"([^"]*)"\s+as\s+(\S+)\s*(<<\w+>>)?$/.exec(body);
  const plain = aliased ? null : /^(\S+)\s*(<<\w+>>)?$/.exec(body);
  if (!aliased && !plain) refuse('a state declaration cannot be read');
  const id = stateId(aliased ? aliased[2]! : plain![1]!);
  if (id === PSEUDO) refuse('[*] cannot be declared');
  const stereotype = (aliased ? aliased[3] : plain![2])?.toLowerCase();
  if (stereotype && stereotype !== '<<choice>>') refuse('fork and join bars have no native form');
  // A composite that nothing refers to is only a container: flattening leaves no node for it.
  if (!opens || aliased || stereotype) {
    const node = draft.node(id);
    if (aliased) node.label = mermaidLabel(aliased[1]!);
    if (stereotype) node.shape = 'decision';
  }
  if (opens) notes.add(`composite state ${id} flattened: its substates are drawn at the top level`);
  return opens ? 1 : 0;
}

function transition(line: string, depth: number, draft: GraphDraft): void {
  const arrow = line.indexOf('-->');
  const tail = line.slice(arrow + 3);
  const colon = tail.indexOf(':');
  const classed = colon >= 0 && tail.startsWith(':::', colon);
  const labelAt = classed ? tail.indexOf(':', colon + 3) : colon;
  const from = stateId(line.slice(0, arrow));
  const to = stateId(labelAt < 0 ? tail : tail.slice(0, labelAt));
  const label = labelAt < 0 ? '' : mermaidLabel(tail.slice(labelAt + 1));
  if (from !== PSEUDO && to !== PSEUDO) {
    draft.edge(from, to, label);
    return;
  }
  if (from === to) refuse('a transition from [*] to [*] states nothing');
  if (depth) refuse('a composite state with its own start or end cannot be flattened faithfully');
  // The entry arrow and the accepting outline have no place for text.
  if (label) refuse('a labelled start or end transition has no native form');
  if (from === PSEUDO) draft.node(to).start = true;
  else draft.node(from).accept = true;
}
