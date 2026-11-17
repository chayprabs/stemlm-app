/**
 * Markdown answer -> study structure (steps + solution), with no model in the loop.
 *
 * A plain chat answer already has a shape: "Step 1" headings, numbered derivations, bold lead-ins,
 * or prose wrapped around display equations. This module reads that shape by evidence, in a fixed
 * order of preference, and never adds content: every step body is the answer's own Markdown, moved
 * but not rewritten. Verification and uncertainty are not claimed, because nothing here checked.
 *
 * Pure, deterministic, dependency-free (it runs in the content script) and bounded at 256 KB.
 */
import type { Capsule, Diagram, Step, Subject } from '@/src/protocol/types';
import { PROTOCOL_VERSION } from '@/src/protocol/protocol';
import { classifySubject } from '@/src/protocol/classifier';

export type IngestStrategy = 'headings' | 'step-markers' | 'ordered-list' | 'bold-leads' | 'paragraphs';

export interface StructuredAnswer {
  capsule: Capsule;
  /** How the steps were found, for honest labelling in the UI and for tests. */
  strategy: IngestStrategy;
  /** 0..1 heuristic confidence that this is a worked, step-like answer. */
  confidence: number;
}

/** Same bound as the capsule parser. */
export const MAX_ANSWER_CHARS = 256_000;
const MAX_STEPS = 20;
const MAX_PARAGRAPH_STEPS = 8;
const TITLE_MAX = 90;
/** Below this an answer is a reply, not something to study step by step. */
const MIN_CONTENT_CHARS = 220;
const SINGLE_STEP_CHARS = 480;
const SHORT_PREAMBLE_CHARS = 280;

interface ListItem {
  number: number;
  /** Item text with the marker removed and continuation lines de-indented. */
  content: string;
}

type Block =
  | { kind: 'heading'; raw: string; level: number; text: string }
  | { kind: 'paragraph'; raw: string }
  | { kind: 'list'; raw: string; ordered: boolean; start: number; items: ListItem[] }
  | { kind: 'math'; raw: string; tex: string }
  | { kind: 'code'; raw: string; lang: string; code: string }
  | { kind: 'table'; raw: string }
  | { kind: 'quote'; raw: string }
  | { kind: 'rule'; raw: string };

type ListBlock = Extract<Block, { kind: 'list' }>;

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/;
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const SETEXT = /^ {0,3}(=+|-{2,})[ \t]*$/;
const LIST_ITEM = /^([ \t]*)(?:([-*+•])|(\d{1,9})([.)]))(?:[ \t]+(.*)|$)/;
const TABLE_DELIMITER = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const MATH_ENVIRONMENT = /^ {0,3}\\begin\{(equation|align|aligned|alignat|gather|gathered|multline|eqnarray|split|cases)\*?\}/;
/** Fences the figure pipeline can draw; anything else is code the student reads. */
const FIGURE_FENCE = /^(?:mermaid|mmd|dot|graphviz|gv|stemlm(?:[-:.][a-z0-9.-]+)?)$/;

function indentOf(line: string): number {
  let n = 0;
  for (const ch of line) {
    if (ch === ' ') n += 1;
    else if (ch === '\t') n += 4;
    else break;
  }
  return n;
}

/** Last line of a display-math block that starts at `i`, or -1 when `i` does not start one. */
function mathBlockEnd(lines: string[], i: number): number {
  const t = lines[i]!.trim();
  const scan = (closes: (line: string) => boolean): number => {
    // An unclosed delimiter must not swallow the rest of the answer.
    for (let j = i + 1; j < lines.length && j <= i + 120; j++) {
      if (closes(lines[j]!)) return j;
    }
    return -1;
  };
  if (t.startsWith('$$')) {
    if (/^\$\$.+\$\$[.,;:]?$/.test(t) && t.split('$$').length === 3) return i;
    return t.split('$$').length === 2 ? scan((line) => line.includes('$$')) : -1;
  }
  if (t.startsWith('\\[')) {
    if (/\\\][.,;:]?$/.test(t)) return i;
    return scan((line) => line.includes('\\]'));
  }
  const env = MATH_ENVIRONMENT.exec(lines[i]!);
  if (env) {
    const close = `\\end{${env[1]}`;
    return t.includes(close) ? i : scan((line) => line.includes(close));
  }
  return -1;
}

function texOf(raw: string): string {
  return raw
    .trim()
    .replace(/^(?:\$\$|\\\[)/, '')
    .replace(/(?:\$\$|\\\])[.,;:]?$/, '')
    .trim();
}

function isTableStart(lines: string[], i: number): boolean {
  const next = lines[i + 1];
  return lines[i]!.includes('|') && next !== undefined && next.includes('-') && next.includes('|') && TABLE_DELIMITER.test(next);
}

function startsBlock(lines: string[], i: number): boolean {
  const line = lines[i]!;
  if (FENCE_OPEN.test(line) || HEADING.test(line) || RULE.test(line) || /^ {0,3}>/.test(line)) return true;
  const item = LIST_ITEM.exec(line);
  if (item && indentOf(line) <= 3 && item[5]) return true;
  return mathBlockEnd(lines, i) >= 0 || isTableStart(lines, i);
}

function parseList(lines: string[], start: number): { block: ListBlock; next: number } {
  const first = LIST_ITEM.exec(lines[start]!)!;
  const base = indentOf(lines[start]!);
  const ordered = first[3] !== undefined;
  const items: Array<{ number: number; lines: string[]; offset: number }> = [];
  const open = (m: RegExpExecArray, line: string): void => {
    const marker = m[2] ?? `${m[3]}${m[4]}`;
    items.push({ number: m[3] ? Number(m[3]) : 0, lines: [m[5] ?? ''], offset: indentOf(line) + marker.length + 1 });
  };
  open(first, lines[start]!);
  let i = start + 1;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      let j = i;
      while (j < lines.length && !lines[j]!.trim()) j++;
      if (j >= lines.length) break;
      const after = lines[j]!;
      const item = LIST_ITEM.exec(after);
      const sibling = item && indentOf(after) <= base + 1 && (item[3] !== undefined) === ordered;
      // Text after a blank line stays in the item only when it is indented under it.
      if (!sibling && indentOf(after) < Math.min(2, base + 2)) break;
      if (!sibling && indentOf(after) <= base) break;
      const current = items[items.length - 1]!;
      for (let k = i; k < j; k++) current.lines.push('');
      i = j;
      continue;
    }
    const item = LIST_ITEM.exec(line);
    const indent = indentOf(line);
    if (item && indent <= base + 1) {
      if ((item[3] !== undefined) !== ordered) break;
      open(item, line);
      i++;
      continue;
    }
    const current = items[items.length - 1]!;
    if (indent > base) {
      current.lines.push(line.slice(Math.min(line.length - line.trimStart().length, current.offset)));
      i++;
      continue;
    }
    if (startsBlock(lines, i)) break;
    current.lines.push(line.trim());
    i++;
  }
  return {
    block: {
      kind: 'list',
      raw: lines.slice(start, i).join('\n').trimEnd(),
      ordered,
      start: items[0]?.number ?? 0,
      items: items.map((item) => ({ number: item.number, content: item.lines.join('\n').trim() })),
    },
    next: i,
  };
}

function tokenize(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = FENCE_OPEN.exec(line);
    if (fence) {
      const marker = fence[1]!;
      const close = new RegExp(`^ {0,3}\\${marker[0]}{${marker.length},}[ \\t]*$`);
      let j = i + 1;
      while (j < lines.length && !close.test(lines[j]!)) j++;
      const last = Math.min(j, lines.length - 1);
      blocks.push({
        kind: 'code',
        raw: lines.slice(i, last + 1).join('\n'),
        lang: (fence[2] ?? '').toLowerCase(),
        code: lines.slice(i + 1, j).join('\n'),
      });
      i = j + 1;
      continue;
    }
    const mathEnd = mathBlockEnd(lines, i);
    if (mathEnd >= 0) {
      const raw = lines.slice(i, mathEnd + 1).join('\n');
      blocks.push({ kind: 'math', raw, tex: texOf(raw) });
      i = mathEnd + 1;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', raw: line, level: heading[1]!.length, text: heading[2] ?? '' });
      i++;
      continue;
    }
    if (RULE.test(line)) {
      blocks.push({ kind: 'rule', raw: line });
      i++;
      continue;
    }
    if (isTableStart(lines, i)) {
      let j = i + 2;
      while (j < lines.length && lines[j]!.trim() && lines[j]!.includes('|')) j++;
      blocks.push({ kind: 'table', raw: lines.slice(i, j).join('\n') });
      i = j;
      continue;
    }
    if (/^ {0,3}>/.test(line)) {
      let j = i + 1;
      while (j < lines.length && /^ {0,3}>/.test(lines[j]!)) j++;
      blocks.push({ kind: 'quote', raw: lines.slice(i, j).join('\n') });
      i = j;
      continue;
    }
    if (LIST_ITEM.test(line) && indentOf(line) <= 3) {
      const list = parseList(lines, i);
      blocks.push(list.block);
      i = list.next;
      continue;
    }
    let j = i + 1;
    while (j < lines.length && lines[j]!.trim() && !SETEXT.test(lines[j]!) && !startsBlock(lines, j)) j++;
    const underline = j < lines.length ? SETEXT.exec(lines[j]!) : null;
    if (underline) {
      const text = lines.slice(i, j).join(' ').trim();
      blocks.push({ kind: 'heading', raw: lines.slice(i, j + 1).join('\n'), level: underline[1]!.startsWith('=') ? 1 : 2, text });
      i = j + 1;
      continue;
    }
    blocks.push({ kind: 'paragraph', raw: lines.slice(i, j).join('\n') });
    i = j;
  }
  return blocks;
}

function paragraph(raw: string): Block {
  return { kind: 'paragraph', raw };
}

function joinBlocks(blocks: Block[]): string {
  return blocks.map((b) => b.raw).join('\n\n').trim();
}

/** Markdown with emphasis markers, links and escapes removed: for matching words, never for output. */
function plain(md: string): string {
  return md
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]+/g, '')
    .replace(/\\([^A-Za-z0-9\s])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Emoji, arrows and bullets models put in front of a heading. */
function stripDecoration(text: string): string {
  return text.replace(/^(?:[^\p{L}\p{N}\s$\\(（[`*_"'“‘¿¡<|~#-]|️)+\s*/u, '').trim();
}

function unwrapEmphasis(text: string): string {
  let t = text.trim();
  for (let pass = 0; pass < 3; pass++) {
    const m = /^(\*\*|__|\*|_)([\s\S]+)\1$/.exec(t);
    if (!m || m[2]!.includes(m[1]!)) break;
    t = m[2]!.trim();
  }
  return t;
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const CJK_DIGITS = '一二三四五六七八九';

function ordinalOf(token: string): number | null {
  const t = token.toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  if (NUMBER_WORDS[t] !== undefined) return NUMBER_WORDS[t]!;
  if (/^[०-९]+$/.test(t)) return Number([...t].map((c) => c.charCodeAt(0) - 0x0966).join(''));
  if (/^[٠-٩]+$/.test(t)) return Number([...t].map((c) => c.charCodeAt(0) - 0x0660).join(''));
  if (/^[一二三四五六七八九十]+$/.test(t)) {
    if (t === '十') return 10;
    const tens = t.indexOf('十');
    if (tens === -1) return CJK_DIGITS.indexOf(t[0]!) + 1;
    return (tens === 0 ? 1 : CJK_DIGITS.indexOf(t[0]!) + 1) * 10 + (t[tens + 1] ? CJK_DIGITS.indexOf(t[tens + 1]!) + 1 : 0);
  }
  if (/^[ivxlc]+$/.test(t)) {
    const values: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };
    let total = 0;
    for (let k = 0; k < t.length; k++) {
      const v = values[t[k]!]!;
      total += v < (values[t[k + 1] ?? ''] ?? 0) ? -v : v;
    }
    return total;
  }
  return null;
}

type MarkerFamily = 'step' | 'part' | 'number';

interface Marker {
  family: MarkerFamily;
  /** Normalized label: "3" for a step, "a" for a part. */
  key: string;
  ordinal: number | null;
  title: string;
}

/** Small table of "Step" in the languages students actually ask in; extend here, nowhere else. */
const STEP_WORD =
  '(?:step|stage|phase|paso|etapa|fase|étape|etape|schritt|passo|stap|krok|шаг|этап|adım|langkah|bước|चरण|ধাপ|الخطوة|خطوة|ステップ|手順|步骤|步驟)';
const COUNT = '(\\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|[ivxlc]{1,6}|[一二三四五六七八九十]{1,3}|[\\u0966-\\u096f]{1,2}|[\\u0660-\\u0669]{1,2})';
const SEPARATOR = '[:：.)\\]\\-\\u2013\\u2014、]';
const STEP_MARKER = new RegExp(`^${STEP_WORD}\\s*[#№]?\\s*${COUNT}(?![\\p{L}\\p{N}])\\s*(${SEPARATOR})?\\s*(.*)$`, 'iu');
const CJK_STEP_MARKER = /^第\s*([一二三四五六七八九十\d]{1,3})\s*[步部]\s*([:：、.．]?)\s*(.*)$/u;
const KOREAN_STEP_MARKER = /^(\d{1,2})\s*단계\s*([:：.]?)\s*(.*)$/u;
const PART_MARKER = new RegExp(`^(?:part|parte|partie|teil|часть|भाग)\\s*\\(?([a-z]|\\d{1,2}|[ivx]{1,4})\\)?(?![\\p{L}\\p{N}])\\s*(${SEPARATOR})?\\s*(.*)$`, 'iu');
const PAREN_MARKER = /^\(([a-z]|[ivx]{1,4}|\d{1,2})\)\s*([:：.\-–—]?)\s*(.*)$/i;
const LETTER_MARKER = /^([a-z])\)\s+(.*)$/;
const NUMBER_MARKER = /^(\d{1,2})\s*[.)](?:\s+(.*))?$/;

/** A title that follows a marker with no separator must look like a title, not the rest of a sentence. */
function titleLike(rest: string): boolean {
  return rest === '' || !/^\p{Ll}/u.test(rest);
}

/**
 * Explicit step marker at the start of a lead. `strict` is for bare paragraph text, where
 * "Step 1 is easy" is a sentence: the marker then needs a separator or the whole line.
 */
function parseMarker(lead: string, strict: boolean): Marker | null {
  const text = stripDecoration(unwrapEmphasis(lead.replace(/(\d)\\([.)])/g, '$1$2'))).trim();
  const accept = (separator: string | undefined, rest: string): boolean => (strict ? Boolean(separator) || rest === '' : Boolean(separator) || titleLike(rest));
  let m = STEP_MARKER.exec(text);
  if (m && accept(m[2], m[3] ?? '')) {
    const ordinal = ordinalOf(m[1]!);
    return { family: 'step', key: String(ordinal ?? m[1]!.toLowerCase()), ordinal, title: (m[3] ?? '').trim() };
  }
  m = CJK_STEP_MARKER.exec(text) ?? KOREAN_STEP_MARKER.exec(text);
  if (m) {
    const ordinal = ordinalOf(m[1]!);
    return { family: 'step', key: String(ordinal ?? m[1]), ordinal, title: (m[3] ?? '').trim() };
  }
  m = PART_MARKER.exec(text);
  if (m && accept(m[2], m[3] ?? '')) return { family: 'part', key: m[1]!.toLowerCase(), ordinal: null, title: (m[3] ?? '').trim() };
  m = PAREN_MARKER.exec(text);
  if (m) return { family: 'part', key: m[1]!.toLowerCase(), ordinal: null, title: (m[3] ?? '').trim() };
  m = LETTER_MARKER.exec(text);
  if (m) return { family: 'part', key: m[1]!, ordinal: null, title: (m[2] ?? '').trim() };
  if (!strict) {
    m = NUMBER_MARKER.exec(text);
    if (m) return { family: 'number', key: m[1]!, ordinal: Number(m[1]), title: (m[2] ?? '').trim() };
  }
  return null;
}

const FINAL_WORDS =
  '(?:the\\s+)?final\\s+(?:answers?|results?|solution|value)|answers?|conclusions?|summary|results?|in\\s+summary|in\\s+conclusion|to\\s+summari[sz]e|therefore|thus|hence|tl;?dr|bottom\\s+line|' +
  'respuesta(?:\\s+final)?|conclusi[oó]n|resultado(?:\\s+final)?|resumen|r[eé]ponse(?:\\s+finale)?|r[eé]sultat(?:\\s+final)?|endergebnis|antwort|ergebnis|fazit|zusammenfassung|' +
  'resposta(?:\\s+final)?|conclus[aã]o|risposta(?:\\s+finale)?|conclusione|ответ|итог|вывод|अंतिम\\s+उत्तर|उत्तर|निष्कर्ष|最终答案|最終答案|答案|结论|結論|总结|總結|答え|정답|결론';
const FINAL_LABEL = new RegExp(`^(?:${FINAL_WORDS})\\s*[:：.!]?$`, 'iu');
const FINAL_INLINE = new RegExp(`^(?:${FINAL_WORDS})\\s*[:：]\\s*(\\S[\\s\\S]*)$`, 'iu');
const THEREFORE_LEAD =
  /^(?:(?:therefore|thus|hence|so(?!\s+far)|consequently|as a result|in conclusion|in summary|por (?:lo )?tanto|así que|en conclusión|donc|ainsi|par conséquent|en conclusion|daher|somit|folglich|portanto|logo|quindi|dunque|следовательно|итак|таким образом|अतः|इसलिए|इस प्रकार)(?=[\s,，:：])|∴|因此|所以|综上|綜上|よって|したがって|따라서)/iu;
const MINOR_LABEL = /^(?:note|notes|tip|tips|remark|hint|caution|warning|important|reminder|aside|recall|nota|remarque|hinweis|注意|提示)$/i;
const GENERIC_TITLE = /^(?:(?:step[- ]by[- ]step\s+)?(?:solution|answer|explanation|response|overview|introduction|working|work|approach)s?|soluci[oó]n|solução|lösung|解答|解)$/i;
const CLOSER =
  /^(?:let me know|if you(?:'d| would) like|if you want|if you have any|would you like|do you want|want me to|feel free|i hope this helps|hope (?:this|that) helps|happy to help|shall i|should i|i can also|need anything|¿quieres|¿te gustaría|avísame|si quieres|n'hésitez|souhaitez-vous|voulez-vous|möchtest du|möchten sie|soll ich|需要我|如果你|如果需要|क्या आप चाहेंगे)/iu;
const REFUSAL =
  /^(?:i['’]m sorry,? but|sorry,? (?:but )?i|i can(?:'|’)?t (?:help|assist|provide|do)|i cannot (?:help|assist|provide|do)|i['’]m (?:not able|unable) to|i am (?:not able|unable) to|i won['’]t be able to|as an ai\b)/i;
const ABBREVIATION = /(?:\b(?:e\.g|i\.e|vs|etc|eq|eqs|fig|figs|approx|no|resp|dr|mr|mrs|ms|prof|st|cf|al)|\b[A-Z])$/;

/** Math and code spans replaced by filler of the same length, so sentence scans cannot split inside them. */
function maskSpans(text: string): string {
  return text.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$|`[^`\n]*`|\\\([\s\S]*?\\\)/g, (span) => 'x'.repeat(span.length));
}

function firstSentence(text: string): { head: string; rest: string; terminator: string } {
  const masked = maskSpans(text);
  const stop = /[.!?:](?=\s|$)|[。！？：]/g;
  for (let m = stop.exec(masked); m; m = stop.exec(masked)) {
    if (m[0] === '.' && ABBREVIATION.test(masked.slice(0, m.index))) continue;
    return { head: text.slice(0, m.index).trim(), rest: text.slice(m.index + 1).trim(), terminator: m[0] };
  }
  return { head: text.trim(), rest: '', terminator: '' };
}

function balanced(text: string): boolean {
  const masked = text.replace(/\\[$`]/g, '');
  return (masked.match(/\$/g)?.length ?? 0) % 2 === 0 && (masked.match(/`/g)?.length ?? 0) % 2 === 0;
}

/** Cut a title at a clause or word boundary; never through a math or code span. */
function capTitle(title: string): { title: string; cut: boolean } {
  if (title.length <= TITLE_MAX) return { title, cut: false };
  const head = title.slice(0, TITLE_MAX);
  const clause = Math.max(head.lastIndexOf(', '), head.lastIndexOf('; '), head.lastIndexOf(' — '), head.lastIndexOf(' – '), head.lastIndexOf(' ('));
  let cut = clause >= 30 ? clause : head.lastIndexOf(' ');
  if (cut < 20) cut = TITLE_MAX;
  let out = head.slice(0, cut);
  while (out && !balanced(out)) {
    const at = Math.max(out.lastIndexOf('$'), out.lastIndexOf('`'));
    out = out.slice(0, at);
  }
  out = out.replace(/[\s,;:.\-–—(]+$/, '');
  return { title: out ? `${out}…` : 'Step', cut: true };
}

function cleanTitle(md: string): { title: string; cut: boolean } {
  let t = md.replace(/\\\n/g, ' ').replace(/\s*\n\s*/g, ' ').trim().replace(/^#{1,6}\s+/, '');
  t = unwrapEmphasis(stripDecoration(unwrapEmphasis(t)));
  const marker = parseMarker(t, false);
  if (marker) t = marker.family === 'part' ? `(${marker.key}) ${marker.title}`.trim() : marker.title;
  t = unwrapEmphasis(t.replace(/\s*[:：]\s*$/, '').replace(/[\s–—-]+$/, '').trim());
  // One closing full stop is punctuation of the lead-in, not part of the title.
  if (/[^.]\.$/.test(t) && !/[.!?]\s/.test(maskSpans(t))) t = t.slice(0, -1);
  return capTitle(t.trim());
}

interface Lead {
  kind: 'heading' | 'bold' | 'plain';
  level: number;
  /** Lead text as Markdown, without the bold wrapper or the closing separator. */
  label: string;
  /** What follows the lead inside the same block. */
  rest: string;
  /** The bold lead ends in punctuation or fills its block, i.e. it is a caption, not emphasis. */
  caption: boolean;
}

function leadOf(block: Block): Lead | null {
  if (block.kind === 'heading') return { kind: 'heading', level: block.level, label: block.text, rest: '', caption: true };
  if (block.kind !== 'paragraph') return null;
  const lines = block.raw.split('\n');
  const first = lines[0]!.trim();
  const tail = lines.slice(1).join('\n');
  const bold = /^(\*\*|__)(?=\S)(.+?)\1(.*)$/.exec(first);
  if (bold && bold[2]!.length <= 140) {
    let label = bold[2]!.trim();
    let after = (bold[3] ?? '').trim();
    let caption = false;
    if (/[:：.]$/.test(label)) {
      label = label.replace(/\s*[:：.]$/, '');
      caption = true;
    }
    const separator = /^[:：–—-]\s*/.exec(after);
    if (separator) {
      after = after.slice(separator[0].length);
      caption = true;
    }
    const rest = [after, tail].filter((part) => part.trim()).join('\n');
    return { kind: 'bold', level: 0, label, rest, caption: caption || !rest.trim() };
  }
  return { kind: 'plain', level: 0, label: first, rest: tail, caption: false };
}

function finalOf(label: string): { inline: string } | null {
  const text = stripDecoration(plain(label));
  if (FINAL_LABEL.test(text)) return { inline: '' };
  const inline = FINAL_INLINE.exec(stripDecoration(unwrapEmphasis(label.trim())));
  return inline ? { inline: inline[1]!.trim() } : null;
}

/** A block that opens with a final-answer label: the text that follows the label, in the same block. */
function finalLead(block: Block): { text: string } | null {
  const lead = leadOf(block);
  if (!lead) return null;
  const final = finalOf(lead.label);
  return final ? { text: [final.inline, lead.rest].filter((part) => part.trim()).join('\n') } : null;
}

interface Segment {
  /** Explicit title (heading, lead, marker) as Markdown; null when it must be read off the body. */
  title: string | null;
  body: Block[];
  /** The first sentence of the body is the title and may be lifted out of it (list items). */
  liftTitle?: boolean;
  /** Headed "Final answer" / "Conclusion": the solution when it closes the answer. */
  final?: boolean;
}

interface Plan {
  strategy: IngestStrategy;
  preamble: Block[];
  segments: Segment[];
}

function leadSegment(lead: Lead, title: string | null, following: Block[]): Segment {
  const body = lead.rest.trim() ? [paragraph(lead.rest.trim()), ...following] : following;
  return { title, body };
}

interface MarkerHit {
  index: number;
  lead: Lead;
  marker: Marker;
}

function restarts(hits: MarkerHit[]): boolean {
  for (let k = 1; k < hits.length; k++) {
    const a = hits[k - 1]!.marker.ordinal;
    const b = hits[k]!.marker.ordinal;
    if (a !== null && b !== null && b <= a) return true;
  }
  return false;
}

/** Every hit of `inner` sits inside one segment of `outer`: inner numbering is local to a part. */
function nestedIn(inner: MarkerHit[], outer: MarkerHit[]): boolean {
  const first = inner[0]!.index;
  const last = inner[inner.length - 1]!.index;
  if (outer[0]!.index > first) return false;
  for (let k = 0; k < outer.length; k++) {
    const from = outer[k]!.index;
    const to = outer[k + 1]?.index ?? Infinity;
    if (first > from && last < to) return true;
  }
  return false;
}

function byStepMarkers(blocks: Block[]): Plan | null {
  const groups = new Map<string, MarkerHit[]>();
  blocks.forEach((block, index) => {
    const lead = leadOf(block);
    if (!lead) return;
    const marker = parseMarker(lead.label, lead.kind === 'plain');
    if (!marker) return;
    const key = `${lead.kind}:${lead.level}:${marker.family}`;
    const hits = groups.get(key) ?? [];
    hits.push({ index, lead, marker });
    groups.set(key, hits);
  });
  let candidates = [...groups.values()].filter((hits) => new Set(hits.map((h) => h.marker.key)).size >= 2);
  if (!candidates.length) return null;
  // A numbering that restarts ("Step 1" under every part) is the inner structure whenever an outer one exists.
  const steady = candidates.filter((hits) => !restarts(hits));
  if (steady.length) candidates = steady;
  const outermost = candidates.filter((hits) => !candidates.some((other) => other !== hits && nestedIn(hits, other)));
  if (outermost.length) candidates = outermost;
  candidates.sort((a, b) => b.length - a.length || a[0]!.index - b[0]!.index);
  const chosen = candidates[0]!;
  const segments = chosen.map((hit, k) => {
    const following = blocks.slice(hit.index + 1, chosen[k + 1]?.index ?? blocks.length);
    const { marker, lead } = hit;
    const title = marker.family === 'part' ? `(${marker.key}) ${marker.title}`.trim() : marker.title;
    if (lead.kind === 'plain') {
      // "Step 1: Find the slope. Then ..." keeps its sentence in the body when the title is only part of it.
      const sentence = firstSentence(marker.title);
      const body = [sentence.rest, lead.rest].filter((part) => part.trim()).join('\n');
      const head = marker.family === 'part' ? `(${marker.key}) ${sentence.head}`.trim() : sentence.head;
      return { title: head || null, body: body ? [paragraph(body), ...following] : following };
    }
    return { ...leadSegment(lead, title || null, following), liftTitle: !title };
  });
  return { strategy: 'step-markers', preamble: blocks.slice(0, chosen[0]!.index), segments };
}

function byHeadings(blocks: Block[]): Plan | null {
  const counts = new Map<number, number>();
  for (const block of blocks) {
    if (block.kind === 'heading') counts.set(block.level, (counts.get(block.level) ?? 0) + 1);
  }
  const level = [...counts.entries()].filter(([, n]) => n >= 2).map(([l]) => l).sort((a, b) => a - b)[0];
  if (level === undefined) return null;
  const starts: number[] = [];
  blocks.forEach((block, index) => {
    if (block.kind === 'heading' && block.level <= level) starts.push(index);
  });
  const segments = starts.map((start, k): Segment => {
    const heading = blocks[start] as Extract<Block, { kind: 'heading' }>;
    const final = finalOf(heading.text);
    const body = blocks.slice(start + 1, starts[k + 1] ?? blocks.length);
    return { title: heading.text, body: final?.inline ? [paragraph(final.inline), ...body] : body, final: final !== null };
  });
  return { strategy: 'headings', preamble: blocks.slice(0, starts[0]), segments };
}

function byOrderedList(blocks: Block[]): Plan | null {
  type Run = { parts: number[]; next: number; chars: number; items: number };
  const runs: Run[] = [];
  let open: Run | null = null;
  blocks.forEach((block, index) => {
    if (block.kind === 'heading') {
      open = null;
      return;
    }
    if (block.kind !== 'list' || !block.ordered) return;
    const last = block.items[block.items.length - 1]?.number ?? block.start;
    // Display math at column 0 splits a Markdown list; "3." after "1. 2." continues the same derivation.
    if (open && block.start === open.next && index - open.parts[open.parts.length - 1]! <= 5) {
      open.parts.push(index);
      open.next = last + 1;
      open.items += block.items.length;
      return;
    }
    open = { parts: [index], next: block.start + block.items.length, chars: 0, items: block.items.length };
    runs.push(open);
  });
  const total = blocks.reduce((n, b) => n + b.raw.length, 0);
  let best: Run | null = null;
  for (const run of runs) {
    const from = run.parts[0]!;
    const to = run.parts[run.parts.length - 1]!;
    run.chars = blocks.slice(from, to + 1).reduce((n, b) => n + b.raw.length, 0);
    if (run.items >= 2 && (!best || run.chars > best.chars)) best = run;
  }
  if (!best) return null;
  // A short list of givens inside a prose answer is content, not the answer's skeleton.
  const substantial = best.chars / best.items >= 40 && best.chars >= total * 0.35;
  if (!substantial) return null;
  const segments: Segment[] = [];
  best.parts.forEach((partIndex, k) => {
    const list = blocks[partIndex] as ListBlock;
    for (const item of list.items) segments.push({ title: null, body: tokenize(item.content), liftTitle: true });
    const until = best.parts[k + 1] ?? blocks.length;
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) lastSegment.body.push(...blocks.slice(partIndex + 1, until));
  });
  return { strategy: 'ordered-list', preamble: blocks.slice(0, best.parts[0]), segments };
}

function byBoldLeads(blocks: Block[]): Plan | null {
  const hits: Array<{ index: number; lead: Lead }> = [];
  blocks.forEach((block, index) => {
    const lead = leadOf(block);
    if (!lead || lead.kind !== 'bold' || !lead.caption) return;
    const text = plain(lead.label);
    if (text.length < 2 || text.length > 100 || MINOR_LABEL.test(text)) return;
    hits.push({ index, lead });
  });
  if (hits.length < 2) return null;
  const segments = hits.map((hit, k): Segment => {
    const following = blocks.slice(hit.index + 1, hits[k + 1]?.index ?? blocks.length);
    return { ...leadSegment(hit.lead, hit.lead.label, following), final: finalOf(hit.lead.label) !== null };
  });
  return { strategy: 'bold-leads', preamble: blocks.slice(0, hits[0]!.index), segments };
}

function isAnchor(block: Block | undefined): boolean {
  return block !== undefined && (block.kind === 'math' || block.kind === 'code' || block.kind === 'table');
}

/**
 * No explicit structure: a step is the prose that introduces a display equation, the equation, and
 * what follows until the next introducing sentence. Prose with no equations splits by length.
 */
function byParagraphs(blocks: Block[]): Plan | null {
  let groups: Block[][] = [];
  let current: Block[] = [];
  let anchored = false;
  let chars = 0;
  blocks.forEach((block, index) => {
    const introduces = block.kind === 'paragraph' && isAnchor(blocks[index + 1]);
    const split =
      current.length > 0 &&
      (block.kind === 'heading' || (introduces && anchored) || (block.kind === 'paragraph' && !anchored && chars >= 600));
    if (split) {
      groups.push(current);
      current = [];
      anchored = false;
      chars = 0;
    }
    current.push(block);
    chars += block.raw.length;
    if (isAnchor(block)) anchored = true;
  });
  if (current.length) groups.push(current);
  groups = mergeSmallest(groups, MAX_PARAGRAPH_STEPS, (group) => group.reduce((n, b) => n + b.raw.length, 0), (a, b) => [...a, ...b]);
  if (groups.length < 2) return null;
  return { strategy: 'paragraphs', preamble: [], segments: groups.map((body) => ({ title: null, body })) };
}

/** Merge the smallest adjacent pair until at most `max` remain. */
function mergeSmallest<T>(items: T[], max: number, size: (item: T) => number, merge: (a: T, b: T) => T): T[] {
  const out = items.slice();
  while (out.length > max && out.length > 1) {
    let at = 0;
    let least = Infinity;
    for (let k = 0; k + 1 < out.length; k++) {
      const combined = size(out[k]!) + size(out[k + 1]!);
      if (combined < least) {
        least = combined;
        at = k;
      }
    }
    out.splice(at, 2, merge(out[at]!, out[at + 1]!));
  }
  return out;
}

function isResultBlock(block: Block): boolean {
  if (block.raw.includes('\\boxed{')) return true;
  if (block.kind !== 'paragraph' || block.raw.length > 400) return false;
  return THEREFORE_LEAD.test(stripDecoration(plain(block.raw.split('\n')[0]!)));
}

/**
 * The answer's conclusion, lifted out of the last step: a labelled "Answer:" block, or failing
 * that a closing boxed / "Therefore" result. The step always keeps something of its own.
 */
function carveSolution(body: Block[]): { body: Block[]; solution: Block[] } | null {
  for (let k = body.length - 1; k >= 1 && k >= body.length - 4; k--) {
    const final = finalLead(body[k]!);
    if (!final) continue;
    const solution = [...(final.text ? [paragraph(final.text)] : []), ...body.slice(k + 1)];
    if (solution.length) return { body: body.slice(0, k), solution };
  }
  const last = body[body.length - 1];
  if (body.length < 2 || !last || !isResultBlock(last)) return null;
  let from = body.length - 1;
  const intro = body[from - 1]!;
  // "The final answer is:" belongs with the boxed line it introduces.
  if (from - 1 >= 1 && last.kind === 'math' && intro.kind === 'paragraph' && intro.raw.length < 160 && /[:：]\s*$/.test(intro.raw)) from -= 1;
  return { body: body.slice(0, from), solution: body.slice(from) };
}

/** The segment is the answer's conclusion: headed as one, or nothing but a labelled result. */
function labelledResult(segment: Segment): boolean {
  if (segment.final) return true;
  if (segment.title !== null) return finalOf(segment.title) !== null;
  return segment.body.length >= 1 && finalLead(segment.body[0]!) !== null;
}

function bareResult(segment: Segment): boolean {
  return segment.title === null && segment.body.length === 1 && isResultBlock(segment.body[0]!);
}

function segmentSolution(segment: Segment): Block[] {
  if (segment.title !== null) return finalOf(segment.title) ? segment.body : [paragraph(segment.title), ...segment.body];
  const first = segment.body[0];
  const final = first ? finalLead(first) : null;
  if (!final) return segment.body;
  return [...(final.text ? [paragraph(final.text)] : []), ...segment.body.slice(1)];
}

/** A display equation the surrounding prose runs into cannot leave the body without breaking the sentence. */
function flowsThrough(body: Block[], at: number): boolean {
  const before = body[at - 1];
  const after = body[at + 1];
  if (before?.kind === 'paragraph' && !/[.!?。！？]["')\]]?\s*$/.test(before.raw.trim())) return true;
  if (after?.kind === 'paragraph' && /^(?:\p{Ll}|[,;)])/u.test(after.raw.trim())) return true;
  return false;
}

/**
 * The step's key formula: its boxed equation, else its last display equation that states a
 * relation. It stays in the body whenever the prose reads through it.
 */
function pickFormula(body: Block[]): { formula?: string; body: Block[] } {
  const hasProse = body.some((b) => b.kind === 'paragraph' || b.kind === 'list' || b.kind === 'quote');
  if (!hasProse) return { body };
  let at = -1;
  body.forEach((block, index) => {
    if (block.kind !== 'math' || !block.tex) return;
    const current = at >= 0 ? (body[at] as Extract<Block, { kind: 'math' }>) : null;
    const boxed = block.tex.includes('\\boxed{');
    const relation = /=|\\(?:approx|le|ge|leq|geq|neq|to|rightarrow|Rightarrow|implies|iff|propto|equiv|sim)\b|[<>≈≤≥→⇒]/.test(block.tex);
    if (!current) at = index;
    else if (boxed) at = index;
    else if (relation && !current.tex.includes('\\boxed{')) at = index;
  });
  if (at < 0) return { body };
  const formula = (body[at] as Extract<Block, { kind: 'math' }>).tex;
  return flowsThrough(body, at) ? { formula, body } : { formula, body: body.filter((_, index) => index !== at) };
}

function pickDiagram(body: Block[]): { diagram?: Diagram; body: Block[] } {
  const at = body.findIndex((b) => b.kind === 'code' && FIGURE_FENCE.test(b.lang) && b.code.trim() !== '' && !/^\s*@meta\b/m.test(b.code));
  if (at < 0) return { body };
  const block = body[at] as Extract<Block, { kind: 'code' }>;
  return { diagram: { type: block.lang, content: block.code.trim() }, body: body.filter((_, index) => index !== at) };
}

/** Title for a segment that has none: its own bold lead, else its first sentence. */
function deriveTitle(segment: Segment, index: number): { title: string; body: Block[] } {
  const body = segment.body;
  const first = body[0];
  const fallback = `Step ${index}`;
  if (!first) return { title: fallback, body };
  if (first.kind === 'heading') {
    const { title } = cleanTitle(first.text);
    return title ? { title, body: body.length > 1 ? body.slice(1) : body } : { title: fallback, body };
  }
  let source = '';
  if (first.kind === 'paragraph') {
    const lead = leadOf(first)!;
    if (lead.kind === 'bold' && lead.caption) {
      const cleaned = cleanTitle(lead.label);
      const rest = lead.rest.trim() ? [paragraph(lead.rest.trim()), ...body.slice(1)] : body.slice(1);
      if (cleaned.title && !cleaned.cut && rest.length) return { title: cleaned.title, body: rest };
      if (cleaned.title) return { title: cleaned.title, body };
    }
    source = first.raw;
  } else if (first.kind === 'list') {
    source = first.items[0]?.content ?? '';
  } else if (first.kind === 'quote') {
    source = first.raw.replace(/^ {0,3}>\s?/gm, '');
  }
  const sentence = firstSentence(source.replace(/\\\n/g, ' ').replace(/\s*\n\s*/g, ' '));
  const cleaned = cleanTitle(sentence.head);
  if (!cleaned.title) return { title: fallback, body };
  const complete = sentence.terminator === ':' || sentence.terminator === '：' || sentence.terminator === '.' || sentence.terminator === '。';
  if (segment.liftTitle && first.kind === 'paragraph' && complete && !cleaned.cut && !first.raw.includes('\n')) {
    const rest = sentence.rest ? [paragraph(sentence.rest), ...body.slice(1)] : body.slice(1);
    if (rest.length) return { title: cleaned.title, body: rest };
  }
  return { title: cleaned.title, body };
}

function buildStep(segment: Segment, index: number): Step {
  let title = segment.title !== null ? cleanTitle(segment.title).title : '';
  let body = segment.body;
  if (!title) ({ title, body } = deriveTitle(segment, index));
  const figure = pickDiagram(body);
  const formula = pickFormula(figure.body);
  const text = joinBlocks(formula.body) || joinBlocks(figure.body) || title;
  return {
    id: `s${index}`,
    index,
    title: title || `Step ${index}`,
    body: text,
    ...(formula.formula ? { formula: formula.formula } : {}),
    ...(figure.diagram ? { diagram: figure.diagram } : {}),
  };
}

interface Outcome {
  steps: Step[];
  solution: string;
}

function finalize(plan: Plan): Outcome {
  let segments = plan.segments.slice();
  let solution: Block[] = [];

  // A labelled conclusion is never a step. An unlabelled closing result ("Therefore x = 2" as the
  // last numbered item) is one only while two real steps remain.
  const last = segments[segments.length - 1];
  if (last && segments.length >= 2 && (labelledResult(last) || (segments.length >= 3 && bareResult(last)))) {
    const taken = segmentSolution(last);
    if (taken.length) {
      solution = taken;
      segments = segments.slice(0, -1);
    }
  }

  if (plan.preamble.length) {
    const size = plan.preamble.reduce((n, b) => n + b.raw.length, 0);
    const short = size <= SHORT_PREAMBLE_CHARS && plan.preamble.length <= 2 && plan.preamble.every((b) => b.kind === 'paragraph');
    const first = segments[0];
    if (short && first) segments[0] = { ...first, body: [...plan.preamble, ...first.body] };
    else segments.unshift({ title: null, body: plan.preamble });
  }

  // A heading with nothing under it is the caption of what follows, not a step.
  for (let k = segments.length - 1; k >= 0; k--) {
    const segment = segments[k]!;
    if (segment.body.length || segment.title === null) continue;
    const neighbour = segments[k + 1] ?? segments[k - 1];
    if (!neighbour) continue;
    const caption = paragraph(`**${cleanTitle(segment.title).title}**`);
    neighbour.body = segments[k + 1] ? [caption, ...neighbour.body] : [...neighbour.body, caption];
    segments.splice(k, 1);
  }

  if (!solution.length && segments.length) {
    const tail = segments[segments.length - 1]!;
    const carved = carveSolution(tail.body);
    if (carved) {
      segments[segments.length - 1] = { ...tail, body: carved.body };
      solution = carved.solution;
    }
  }

  segments = mergeSmallest(
    segments.filter((segment) => segment.body.length > 0 || segment.title !== null),
    MAX_STEPS,
    (segment) => segment.body.reduce((n, b) => n + b.raw.length, 0),
    (a, b) => ({ ...a, body: [...a.body, ...(b.title !== null ? [paragraph(`**${cleanTitle(b.title).title}**`)] : []), ...b.body] }),
  );
  return { steps: segments.map((segment, k) => buildStep(segment, k + 1)), solution: joinBlocks(solution) };
}

/** A lone top heading is the answer's title, not a step. */
function takeTitle(blocks: Block[]): { topic: string; blocks: Block[] } {
  const first = blocks[0];
  if (first?.kind !== 'heading') return { topic: '', blocks };
  const others = blocks.slice(1).filter((b): b is Extract<Block, { kind: 'heading' }> => b.kind === 'heading');
  if (others.some((h) => h.level <= first.level)) return { topic: '', blocks };
  if (parseMarker(first.text, false) || finalOf(first.text)) return { topic: '', blocks };
  const { title } = cleanTitle(first.text);
  return { topic: GENERIC_TITLE.test(plain(title)) ? '' : title, blocks: blocks.slice(1) };
}

function compactTopic(text: string): string {
  const line = text.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  const words = line.replace(/\s+/g, ' ').split(' ');
  if (words.length <= 8) return line.replace(/\s+/g, ' ').replace(/[\s,;:]+$/, '');
  let head = words.slice(0, 8).join(' ');
  while (head && !balanced(head)) head = head.slice(0, Math.max(head.lastIndexOf('$'), head.lastIndexOf('`')));
  return `${head.replace(/[\s,;:.]+$/, '')}…`;
}

/**
 * The question names the subject best. Without one, the answer's opening and its notation decide;
 * the whole answer is too noisy for keyword scoring ("product rule", "base case").
 */
function inferSubject(question: string, blocks: Block[], topic: string): Subject {
  const fromQuestion = question.trim() ? classifySubject(question) : 'General';
  if (fromQuestion !== 'General') return fromQuestion;
  const text = joinBlocks(blocks.filter((b) => b.kind !== 'code'));
  if (/\\ce\{/.test(text)) return 'Chemistry';
  const opening = classifySubject(`${topic}\n${plain(text.slice(0, 1500))}`);
  if (opening !== 'General') return opening;
  if (blocks.some((b) => b.kind === 'code' && b.lang !== '' && !FIGURE_FENCE.test(b.lang))) return 'CS';
  return 'General';
}

function dropClosers(blocks: Block[]): Block[] {
  const out = blocks.slice();
  for (let pass = 0; pass < 2; pass++) {
    const last = out[out.length - 1];
    if (last?.kind !== 'paragraph' || last.raw.length > 320) break;
    if (!CLOSER.test(stripDecoration(plain(last.raw)))) break;
    out.pop();
  }
  return out;
}

const BASE_CONFIDENCE: Record<IngestStrategy, number> = {
  'step-markers': 0.9,
  headings: 0.75,
  'ordered-list': 0.7,
  'bold-leads': 0.6,
  paragraphs: 0.35,
};

function structure(markdown: string, question: string): StructuredAnswer | null {
  let md = markdown.replace(/\r\n?/g, '\n').replace(/[​⁠﻿]/g, '');
  if (md.length > MAX_ANSWER_CHARS) md = md.slice(0, md.lastIndexOf('\n', MAX_ANSWER_CHARS) > 0 ? md.lastIndexOf('\n', MAX_ANSWER_CHARS) : MAX_ANSWER_CHARS);
  const all = dropClosers(tokenize(md).filter((b) => b.kind !== 'rule'));
  if (!all.length) return null;

  const code = all.filter((b) => b.kind === 'code' && !FIGURE_FENCE.test(b.lang)).reduce((n, b) => n + b.raw.length, 0);
  const content = all.reduce((n, b) => n + b.raw.length, 0);
  const prose = content - code;
  if (content < MIN_CONTENT_CHARS) return null;
  // Code with a sentence around it is a snippet to copy, not a solution to study.
  if (code > 0 && prose < 160) return null;
  const opening = all[0]!.kind === 'paragraph' ? stripDecoration(plain(all[0]!.raw)) : '';
  if (REFUSAL.test(opening) && prose < 700 && !all.some((b) => b.kind === 'math')) return null;

  const titled = takeTitle(all);
  const blocks = titled.blocks;
  if (!blocks.length) return null;

  let strategy: IngestStrategy = 'paragraphs';
  let outcome: Outcome | null = null;
  for (const attempt of [byStepMarkers, byHeadings, byOrderedList, byBoldLeads, byParagraphs]) {
    const plan = attempt(blocks);
    if (!plan) continue;
    const result = finalize(plan);
    if (result.steps.length >= 2) {
      strategy = plan.strategy;
      outcome = result;
      break;
    }
  }
  let confidence: number;
  if (outcome) {
    confidence = BASE_CONFIDENCE[strategy];
    if (outcome.solution) confidence += 0.05;
    if (blocks.some((b) => b.kind === 'math')) confidence += 0.03;
    if (outcome.steps.length === 2) confidence -= 0.1;
  } else {
    const rich = blocks.some((b) => b.kind === 'math' || b.kind === 'table' || b.kind === 'list');
    if (content < SINGLE_STEP_CHARS && !(rich && content >= 300)) return null;
    outcome = finalize({ strategy: 'paragraphs', preamble: [], segments: [{ title: null, body: blocks }] });
    confidence = 0.2;
  }

  const topic =
    titled.topic ||
    (question.trim() ? compactTopic(question) : '') ||
    compactTopic(outcome.steps[0]?.title ?? '') ||
    'Worked answer';
  const capsule: Capsule = {
    meta: {
      version: PROTOCOL_VERSION,
      subject: inferSubject(question, all, titled.topic),
      topic,
      ...(question.trim() ? { question: question.trim() } : {}),
    },
    steps: outcome.steps,
    solution: outcome.solution,
    solutionDiagrams: [],
  };
  return { capsule, strategy, confidence: Math.round(Math.min(0.98, Math.max(0.05, confidence)) * 100) / 100 };
}

/**
 * Markdown answer -> study structure, or null when there is nothing worth structuring (too short,
 * a refusal, a greeting, pure code). Pure, deterministic, bounded; never throws.
 */
export function structureAnswer(markdown: string, opt?: { question?: string }): StructuredAnswer | null {
  if (typeof markdown !== 'string' || !markdown.trim()) return null;
  try {
    return structure(markdown, typeof opt?.question === 'string' ? opt.question : '');
  } catch {
    return null;
  }
}
