/**
 * The stemLM guide: what the chat model is told.
 *
 * core-protocol.md is the whole text. Its opening part goes with every question. Its `# figures`
 * part holds one section per built-in figure form; a question is sent an example of each form its
 * subject uses, and one line of keys for every other form. Pack families
 * (src/lib/figure/families) bring their forms from their own manifests, so the guide cannot
 * describe a form the compiler rejects.
 */
import guideSource from './core-protocol.md?raw';
import { FAMILY_MANIFESTS } from '@/src/lib/figure/families/manifest';
import { STUDY_GUIDE_END } from '@/src/lib/study-guide';
import { classifySubject } from './classifier';
import type { Subject } from './types';

export const CAPSULE_FENCE_TAG = 'stemlm';
export const CAPSULE_END_TOKEN = '@end';
/** Version written into answers structured from plain text. Capsules without one read as version 1. */
export const PROTOCOL_VERSION = 2;

/** Hard parser bounds — simple problems may have 3 meaningful steps. */
export const STEP_COUNT_MIN = 3;
export const STEP_COUNT_MAX = 20;

/**
 * The most characters of guide any one question is sent (roughly 6,500 tokens). An example that
 * would pass it is left out; its form keeps its line of keys.
 */
export const GUIDE_MAX_CHARS = 24_000;

/**
 * The most characters of guide pasted into a message, where the host takes no upload. Chat boxes
 * turn a long paste into an attachment of their own or cut it, and the student's question must
 * stay readable above it, so this version holds the answer shape and a few figure forms only.
 */
export const GUIDE_INLINE_MAX_CHARS = 3_500;

export interface FigureForm {
  /** The `type=` token; a scene or table variant carries its kind after a dot (`scene.fbd`). */
  id: string;
  /** Subjects whose questions are sent this form. */
  subjects: readonly string[];
  /** What it draws and the keys it reads, on one line. */
  grammar: string;
  /** A spec body that compiles as written. */
  specimen: string;
  /** Terms that select the form when the question uses one, whatever its subject. */
  cues: readonly string[];
}

const [CORE = '', COMPACT = '', FIGURES = '', NOTES = ''] = guideSource
  .replace(/\r\n/g, '\n')
  .split(/^# (?:inline|figures|subjects)$/m)
  .map((part) => part.trim());

const BUILT_IN_FORMS: FigureForm[] = FIGURES.split(/^## /m).slice(1).map((section) => {
  const [head = '', ...lines] = section.trim().split('\n');
  // `## id | subjects | cue words`: the cue words are optional.
  const [id = '', subjects = '', cues = ''] = head.split('|').map((part) => part.trim());
  const list = (text: string) => text.split(',').map((item) => item.trim()).filter(Boolean);
  const open = lines.findIndex((line) => line.startsWith('@diagram'));
  return {
    id,
    subjects: list(subjects),
    grammar: lines.slice(0, open).join(' '),
    specimen: lines.slice(open + 1, lines.indexOf('@enddiagram')).join('\n'),
    cues: list(cues),
  };
});

/**
 * Pack families a question with no recognisable subject is still sent: everyday maths and
 * statistics, whose questions ("draw a histogram of these marks") rarely name a subject.
 */
const GENERAL_PACKS = new Set(['chart', 'dist', 'numberline', 'venn', 'triangle', 'coord', 'vectors', 'probtree']);

const PACK_FORMS: FigureForm[] = FAMILY_MANIFESTS.map((manifest) => ({
  id: manifest.token,
  subjects: GENERAL_PACKS.has(manifest.token) ? [...manifest.subjects, 'General'] : manifest.subjects,
  // The manifest writes its grammar as `token: …`; the guide names the type itself.
  grammar: manifest.grammar.slice(manifest.token.length + 2),
  specimen: manifest.specimen,
  // Short everyday words ("bar", "normal", "energy") would select a form for half the questions asked.
  cues: [manifest.token, ...(manifest.aliases ?? [])].filter((cue) => cue.includes('-') || cue.length >= 7),
}));

/** Every figure form the guide can teach, built-in forms first. */
export const FIGURE_FORMS: readonly FigureForm[] = [...BUILT_IN_FORMS, ...PACK_FORMS];

const SUBJECT_NOTES = new Map(
  NOTES.split('\n').filter(Boolean).map((line) => {
    const colon = line.indexOf(':');
    return [line.slice(0, colon), line.slice(colon + 1).trim()] as const;
  }),
);

/** `scene.fbd` is `type=scene` with `kind: fbd`; every other id is its own type token. */
const VARIANT = /^(scene|table)\.(.+)$/;
export const figureType = (id: string): string => VARIANT.exec(id)?.[1] ?? id;

function renderForm(form: FigureForm): string {
  return `type=${figureType(form.id)}: ${form.grammar}\n@diagram type=${figureType(form.id)}\n${form.specimen}\n@enddiagram`;
}

/**
 * The file gives every form: an example for the ones in `forms`, the keys alone for the rest.
 * Tried against a file that only named the rest, on eight questions whose figure lay outside
 * their subject: with the keys a light model drew the right figure in six, with names in none.
 */
function compose(subject: Subject, forms: readonly FigureForm[], compact: boolean): string {
  if (compact) return [COMPACT, ...forms.map(renderForm), STUDY_GUIDE_END].join('\n\n');
  const left = FIGURE_FORMS.filter((form) => !forms.includes(form));
  const note = SUBJECT_NOTES.get(subject);
  return [
    CORE,
    ...forms.map(renderForm),
    left.length
      ? [
          'The panel draws these types too. Each line gives the keys of one type, without an example. Use any of them when the question calls for it.',
          ...left.map((form) => `type=${figureType(form.id)}: ${form.grammar}`),
        ].join('\n')
      : '',
    note ? `COMMON MISTAKES IN ${subject.toUpperCase()}\n${note}` : '',
    STUDY_GUIDE_END,
  ].filter(Boolean).join('\n\n');
}

export interface Guide {
  /** The text of the attached file, or of the guide pasted into the message. */
  text: string;
  /** Ids of the figure forms it shows with an example. A pasted guide describes no others. */
  forms: string[];
}

/** Ids of the figure forms the question names with a cue term ("bar chart", "free-body"), whatever its subject. */
export function figureFormsNamed(question: string): string[] {
  const named = (cue: string) => new RegExp(`\\b${cue.replace(/-/g, '[- ]?')}\\b`, 'i').test(question);
  return FIGURE_FORMS.filter((form) => form.cues.some(named)).map((form) => form.id);
}

/**
 * The guide for one question: the answer format, then the figure forms the question names and
 * the ones its subject uses, in that order, each with an example for as long as they fit.
 * `compact` is the version pasted into a message: the answer shape and the first few forms,
 * within GUIDE_INLINE_MAX_CHARS.
 */
export function assembleGuide(
  question = '',
  subject: Subject = classifySubject(question),
  compact = false,
): Guide {
  const limit = compact ? GUIDE_INLINE_MAX_CHARS : GUIDE_MAX_CHARS;
  const named = figureFormsNamed(question);
  const wanted = [
    ...FIGURE_FORMS.filter((form) => named.includes(form.id)),
    ...FIGURE_FORMS.filter((form) => form.subjects.includes(subject) && !named.includes(form.id)),
  ];
  const forms: FigureForm[] = [];
  for (const form of wanted) {
    if (compose(subject, [...forms, form], compact).length <= limit) forms.push(form);
  }
  return { text: compose(subject, forms, compact), forms: forms.map((form) => form.id) };
}
