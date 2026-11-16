/**
 * What each figure family reads: canonical keys, their synonyms, type-token synonyms and
 * enumerated values. The repair layer maps other spellings onto these and nothing else.
 *
 * Canonical keys are never typed here. They come from
 *   - vocabulary.generated.ts: extracted from the compiler sources by scripts/figure-vocabulary.mjs
 *   - SCENE_VARIANTS / TABLE_VARIANTS in catalog.ts for the engines with variants
 *   - FAMILY_MANIFESTS (`keys`) for extension families, read when first asked
 * so a new key or family is picked up without touching this file. Only the synonym tables below are
 * curated; a synonym whose target a family does not read is ignored.
 */
import { FAMILY_CATALOG, canonicalizeDiagramType, type FamilyDef, type FamilyVariant } from '../catalog';
import { FAMILY_MANIFESTS } from '../families/manifest';
import { GENERATED_VOCABULARY, type KeyArity } from './vocabulary.generated';
import { closestTarget, foldKey, foldType } from './fuzzy';

export type { KeyArity };

export interface FamilyVocabulary {
  family: string;
  /** Variant of an engine with variants (`fbd`, `matrix`), when known. */
  kind?: string;
  /** Canonical key (lowercase) -> how the compiler reads it. */
  keys: ReadonlyMap<string, KeyArity>;
  required: readonly string[];
  requiredAny: readonly string[];
  /** Folded spelling -> canonical key: the keys themselves and their curated synonyms. */
  spellings: ReadonlyMap<string, string>;
}

/**
 * Synonyms by scope, canonical key first. Scopes: a family token, `family.variant`, or `*` for
 * metadata keys every family shares. Sources of the canonical keys:
 *   plot      PLOT_DECLARATION_KEYS in engines/plot.ts and the `SCHEMA plot` lines of core-protocol.md
 *   graph     GRAPH_KEYS in engines/graph.ts, `SCHEMA graph`
 *   circuit   CONTROL_KEYS in engines/circuit.ts, `SCHEMA circuit`
 *   table.*   TABLE_VARIANTS in catalog.ts, COMMON_KEYS in engines/table.ts
 *   scene.*   SCENE_VARIANTS in catalog.ts, keysAreKnown() in engines/scene.ts
 *   templates the TEMPLATE FORMS lines of core-protocol.md and each compile function
 */
const KEY_SYNONYMS: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  '*': {
    caption: ['title', 'description', 'desc', 'heading', 'figure_title', 'chart_title', 'plot_title', 'graph_title'],
    highlight: ['highlights', 'highlighted', 'emphasize', 'emphasis'],
  },
  plot: {
    fn: ['function', 'func', 'f', 'y', 'expr', 'expression', 'equation', 'curve', 'formula', 'fx', 'f1', 'function1'],
    fn2: ['function2', 'f2'],
    domain: ['range', 'xrange', 'x_range', 'interval', 'xlim', 'xlimits', 'x_limits', 'xdomain', 'x_domain', 'x_interval', 'bounds', 'limits', 'window'],
    var: ['variable', 'independent', 'independent_variable', 'indep', 'argument'],
    xlabel: ['x_axis', 'x_axis_label', 'x_axis_title', 'x_title', 'xlab', 'x_name', 'horizontal_axis'],
    ylabel: ['y_axis', 'y_axis_label', 'y_axis_title', 'y_title', 'ylab', 'y_name', 'vertical_axis'],
    data: ['dataset', 'samples', 'datapoints', 'series', 'scatter', 'values', 'coordinates', 'xy'],
    point: ['pt'],
    eq: ['eqn', 'eq_label', 'equation_label', 'latex', 'tex'],
    eq_slot: ['eq_position', 'eq_pos', 'equation_position'],
    kind: ['plot_type', 'plot_kind', 'mode'],
    poles: ['pole'],
    zeros: ['zero', 'roots', 'root'],
    peaks: ['peak'],
    asymptote: ['asym'],
    shade: ['shaded', 'fill_between', 'shade_region'],
  },
  graph: {
    node: ['vertex', 'vertices', 'state', 'states'],
    edge: ['link', 'arrow', 'connection', 'transition', 'arc'],
    rankdir: ['direction', 'dir', 'layout', 'orientation', 'flow', 'rank'],
    start: ['initial', 'initial_state', 'start_state', 'starting_state', 'entry', 'init'],
    accept: ['accepting', 'accept_state', 'accept_states', 'accepting_states', 'final', 'finals', 'final_state', 'final_states'],
    decision: ['decisions', 'diamond', 'diamonds'],
    terminal: ['terminals', 'terminator', 'terminators'],
  },
  circuit: {
    std: ['standard', 'convention', 'symbols', 'symbol_standard'],
    probe: ['measure', 'measurement'],
    wire: ['connect'],
  },
  table: {
    highlight_row: ['row_highlight'],
  },
  'table.matrix': {
    headers: ['columns', 'cols', 'column_names', 'heading', 'headings', 'fields', 'head'],
    rows: ['data', 'body', 'values', 'cells', 'entries'],
  },
  'table.ice': {
    species: ['compounds', 'substances', 'molecules', 'headers', 'columns'],
    i: ['initial', 'init', 'start'],
    c: ['change', 'delta'],
    e: ['equilibrium', 'equil', 'eq', 'final', 'end'],
  },
  'table.punnett': {
    cols: ['top'],
    rows: ['side', 'left'],
    cells: ['grid', 'offspring', 'squares', 'boxes', 'genotypes'],
  },
  'scene.fbd': {
    body: ['object', 'mass', 'block', 'box'],
    incline_deg: ['incline', 'incline_angle', 'incline_degrees', 'slope', 'slope_deg', 'slope_angle', 'ramp_angle', 'inclination', 'theta'],
    force: ['vector', 'arrow'],
  },
  'scene.geom': {
    point: ['vertex', 'vertices', 'pt'],
    segment: ['line', 'side', 'edge'],
  },
  'scene.ray': {
    f: ['focal_length', 'focal', 'focus'],
    do: ['object_distance', 'obj_distance', 'd_o', 'u'],
    ho: ['object_height', 'obj_height', 'h_o'],
  },
  'scene.thermodynamic': {
    axis: ['axes'],
    path: ['process', 'processes'],
  },
  'scene.apparatus': {
    part: ['component'],
  },
  'chem.smiles': {
    smiles: ['smile', 'smi', 'smiles_string', 'structure', 'molecule'],
    annotate: ['annotation', 'note'],
  },
  timing: { signal: ['sig'] },
  kmap: {
    vars: ['variables', 'inputs'],
    minterms: ['minterm', 'ones', 'min_terms'],
    dontcares: ['dont_cares', 'dont_care', 'dontcare', 'dc'],
  },
  sfd: { l: ['length', 'span'], v: ['shear'], m: ['moment'], supports: ['support'], loads: ['load'] },
  truss: { joints: ['joint', 'nodes'], members: ['member', 'bars'], supports: ['support'], loads: ['load'] },
  gel: { lanes: ['lane'] },
  phasor: { vec: ['vector', 'phasor'] },
  mohr: { sx: ['sigma_x'], sy: ['sigma_y'], txy: ['tau_xy'] },
  stack: { layers: ['elements', 'stack'] },
  list: { nodes: ['values', 'elements'] },
  array: { cells: ['values', 'elements', 'array'] },
  hash: { m: ['size'] },
  newman: { deg: ['dihedral', 'angle'] },
  vsepr: { geom: ['geometry', 'shape'], center: ['central', 'central_atom'], ligands: ['atoms', 'substituents'] },
  gantt: { jobs: ['tasks', 'processes'], tnow: ['now'] },
  splitting: { mult: ['multiplicity', 'pattern'], j: ['coupling', 'couplings'] },
};

/** Spellings of an enumerated value, canonical value first, by `family.key` (or `family.variant.key`). */
const VALUE_SYNONYMS: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  // ensureSupportedKind() in engines/plot.ts
  'plot.kind': {
    function: ['func', 'line', 'curve', 'continuous', 'cartesian', 'line-graph', 'line-plot', 'function-plot'],
    discrete: ['scatter', 'scatter-plot', 'points', 'dots'],
    step: ['steps', 'staircase', 'stairs'],
    waveform: ['wave'],
    comparison: ['compare'],
    bode: ['bode-plot'],
  },
  // EQ_SLOTS in engines/plot.ts
  'plot.eq_slot': {
    N: ['top', 'north', 'above'], S: ['bottom', 'south', 'below'], E: ['right', 'east'], W: ['left', 'west'],
    NE: ['top-right', 'upper-right', 'northeast'], NW: ['top-left', 'upper-left', 'northwest'],
    SE: ['bottom-right', 'lower-right', 'southeast'], SW: ['bottom-left', 'lower-left', 'southwest'],
    auto: ['automatic'],
  },
  'plot.drop': { both: ['xy'], x: [], y: [] },
  // parseGraph() in engines/graph.ts; RL and BT have no counterpart and are left alone.
  'graph.rankdir': {
    LR: ['left-to-right', 'left-right', 'lefttoright', 'horizontal', 'l2r', 'l-r', 'left-to-right-layout'],
    TB: ['top-to-bottom', 'top-bottom', 'toptobottom', 'top-down', 'topdown', 'vertical', 't2b', 't-b'],
    TD: [],
  },
  // parseCircuit() in engines/circuit.ts
  'circuit.std': {
    ieee: ['us', 'usa', 'ansi', 'american'],
    iec: ['eu', 'european', 'din', 'international'],
  },
};

/** Spellings of a variant name beyond the aliases catalog.ts already admits. */
const VARIANT_SYNONYMS: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  scene: {
    fbd: ['free-body-diagram', 'free-body', 'freebody', 'force-diagram', 'forces', 'fbd-diagram'],
    geom: ['geometric', 'construction'],
    ray: ['lens', 'mirror', 'ray-diagram'],
    thermodynamic: ['pv', 'pv-diagram', 'p-v', 'p-v-diagram'],
    apparatus: ['setup', 'experiment'],
  },
  table: {
    matrix: ['grid', 'table', 'data', 'tabular', 'data-table'],
    ice: ['ice-table'],
    punnett: ['punnett-square', 'punnet', 'punnet-square', 'cross'],
  },
};

/**
 * Type tokens models write for a family, as `family` or `family#variant`. A target the catalog does
 * not hold (an extension family that is not registered) is skipped at lookup.
 */
const TYPE_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  'scene#fbd': ['free-body-diagram', 'free-body', 'freebody', 'fbd', 'force-diagram', 'forces'],
  'scene#geom': ['geometry', 'geom', 'geometric', 'construction'],
  'scene#thermodynamic': ['pv-diagram', 'p-v-diagram', 'thermodynamic', 'thermo'],
  'scene#apparatus': ['apparatus'],
  'scene#molecular': ['molecular'],
  'scene#gas': ['gas'],
  graph: ['flowchart', 'flow', 'flow-chart', 'flow-diagram', 'state-machine', 'state-diagram', 'fsm', 'dfa', 'nfa', 'automaton', 'automata', 'digraph', 'directed-graph', 'network', 'dag', 'node-graph', 'dependency-graph', 'concept-map'],
  plot: ['function', 'function-plot', 'function-graph', 'line-graph', 'graph-of-function', 'xy-plot', 'xy', 'cartesian', 'curve', 'math-plot', '2d-plot', 'plot2d'],
  'plot#discrete': ['scatter', 'scatter-plot'],
  'plot#waveform': ['waveform'],
  truth: ['truth-table', 'truthtable'],
  'chem.smiles': ['molecule', 'structure', 'skeletal', 'skeletal-structure', 'structural-formula', 'chemical-structure', 'compound'],
  'table#ice': ['ice-table', 'ice'],
  'table#punnett': ['punnett-square', 'punnett', 'punnet-square', 'punnet'],
  'table#matrix': ['matrix', 'grid', 'data-table', 'dp-table', 'dp', 'tabular'],
  circuit: ['netlist', 'electrical-circuit', 'electric-circuit', 'circuit-schematic'],
  timing: ['waveform-diagram', 'digital-timing', 'timing-waveform'],
  kmap: ['karnaugh', 'karnaugh-map', 'k-map'],
  sfd: ['shear-moment', 'shear-force', 'shear-force-diagram', 'bending-moment', 'shear-and-moment'],
  list: ['linked-list', 'linkedlist'],
  hash: ['hash-table', 'hashtable', 'hash-map', 'hashmap'],
  mohr: ['mohrs-circle', 'mohr-circle'],
  gel: ['gel-electrophoresis', 'electrophoresis'],
  cft: ['crystal-field', 'crystal-field-splitting'],
  mo: ['mo-diagram', 'molecular-orbital', 'molecular-orbitals'],
};

/** Generic words a type token carries besides the family name (`phasor-diagram`, `gantt-chart`). */
const TYPE_SUFFIX = /-(?:diagram|chart|plot|figure|graph|map|table|projection|drawing|sketch|view|circle|spec)$/;

/** Keys that only style the drawing. The compiler owns colour, fonts and canvas, so these say nothing. */
const DECORATION_KEYS = new Set([
  'color', 'colour', 'colors', 'colours', 'linecolor', 'linecolour', 'stroke', 'strokecolor', 'strokewidth', 'fill',
  'fillcolor', 'linewidth', 'lw', 'font', 'fontsize', 'fontfamily', 'fontweight', 'textsize', 'theme', 'background',
  'backgroundcolor', 'bg', 'bgcolor', 'grid', 'gridlines', 'showgrid', 'opacity', 'transparency', 'margin', 'padding',
  'dpi', 'resolution',
]);
/** Canvas keys: presentation only for the five engines, and only with a bare or pixel size. */
const CANVAS_KEYS = new Set(['width', 'height', 'size', 'figsize', 'canvas', 'aspect', 'aspectratio']);
const ENGINES = new Set(['plot', 'scene', 'graph', 'table', 'circuit']);

/**
 * Ordinary words that are keys in their own right somewhere. A key that is a real word is never
 * treated as a misspelling of another (`note` is not `node`); only non-words are fuzzy-matched.
 */
const COMMON_WORDS = [
  'note', 'notes', 'title', 'name', 'label', 'labels', 'type', 'kind', 'mode', 'code', 'date', 'data', 'text', 'size',
  'style', 'scale', 'range', 'value', 'values', 'unit', 'units', 'axis', 'axes', 'legend', 'source', 'target', 'order',
  'id', 'info', 'meta', 'tag', 'tags', 'weight', 'weights', 'comment', 'comments', 'time', 'step', 'steps', 'shape',
  'line', 'lines', 'path', 'level', 'levels', 'from', 'to', 'at', 'mass', 'charge', 'angle', 'length', 'area', 'view',
  'side', 'top', 'left', 'right', 'base', 'head', 'tail', 'state', 'states', 'rate', 'ratio', 'total', 'count', 'index',
  'key', 'keys', 'item', 'items', 'list', 'set', 'map', 'row', 'rows', 'col', 'cols', 'cell', 'cells', 'part', 'parts',
  'point', 'points', 'plot', 'graph', 'table', 'chart', 'figure', 'image', 'version', 'author', 'subject', 'topic',
  'model', 'mole', 'moles', 'node', 'nodes', 'edge', 'edges', 'form', 'force', 'forces', 'field', 'fields', 'wave',
  'slope', 'speed', 'start', 'end', 'stop', 'result', 'answer', 'given', 'find', 'show', 'draw', 'direction', 'body',
];

const hasOwn = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);

function catalogDef(family: string): FamilyDef | undefined {
  return hasOwn(FAMILY_CATALOG, family) ? FAMILY_CATALOG[family] : undefined;
}

export function variantsOf(family: string): Readonly<Record<string, FamilyVariant>> | undefined {
  return catalogDef(family)?.variants;
}

/** The variant a `kind` value names: a variant, a catalog alias, a curated synonym, or one unambiguous misspelling. */
export function resolveVariant(family: string, written: string): { kind: string; exact: boolean } | undefined {
  const variants = variantsOf(family);
  if (!variants) return undefined;
  const token = foldType(written);
  const spellings = new Map<string, string>();
  for (const [name, variant] of Object.entries(variants)) {
    spellings.set(name, name);
    for (const alias of variant.aliases ?? []) spellings.set(alias, name);
  }
  // The engines read variant names and catalog aliases as written.
  if (spellings.has(token)) return { kind: spellings.get(token)!, exact: token === written.trim().toLowerCase().replace(/_/g, '-') };
  for (const [name, synonyms] of Object.entries(VARIANT_SYNONYMS[family] ?? {})) {
    if (hasOwn(variants, name)) for (const synonym of synonyms) spellings.set(synonym, name);
  }
  const stripped = token.replace(TYPE_SUFFIX, '');
  const kind = spellings.get(token) ?? spellings.get(stripped) ?? closestTarget(token, spellings);
  return kind ? { kind, exact: false } : undefined;
}

function generatedKeys(family: string): Map<string, KeyArity> {
  return new Map(Object.entries(hasOwn(GENERATED_VOCABULARY, family) ? GENERATED_VOCABULARY[family]! : {}));
}

const vocabularyCache = new Map<string, FamilyVocabulary | undefined>();

function buildVocabulary(family: string, kind: string | undefined): FamilyVocabulary | undefined {
  const def = catalogDef(family);
  if (!def || (def.kind !== 'engine' && def.kind !== 'leftover')) return undefined;
  const generated = generatedKeys(family);
  const keys = new Map<string, KeyArity>();
  let required = [...(def.required ?? [])];
  let requiredAny = [...(def.requiredAny ?? [])];
  const manifest = FAMILY_MANIFESTS.find((entry) => entry.token === family);
  if (def.variants) {
    const all = new Set(Object.values(def.variants).flatMap((variant) => variant.allowed));
    // Keys the engine reads for every variant: whatever it reads that no variant lists.
    for (const [key, arity] of generated) if (!all.has(key)) keys.set(key, arity);
    const variant = kind ? def.variants[kind] : undefined;
    for (const key of variant ? variant.allowed : all) keys.set(key, generated.get(key) ?? 'any');
    if (variant) {
      required = [...required, ...(variant.required ?? [])];
      requiredAny = [...variant.requiredAny];
    }
  } else if (manifest) {
    for (const key of manifest.keys) keys.set(key.toLowerCase(), 'any');
  } else {
    for (const [key, arity] of generated) keys.set(key, arity);
  }
  // A family nothing reads is one the dispatcher refuses: there is no spelling to repair toward.
  if (!keys.size) return undefined;
  // compileLeftover() pre-consumes caption and highlight for every template family.
  if (def.kind === 'leftover') for (const key of ['caption', 'highlight']) if (!keys.has(key)) keys.set(key, 'any');

  const spellings = new Map<string, string>();
  for (const key of keys.keys()) spellings.set(foldKey(key), key);
  for (const scope of ['*', family, kind ? `${family}.${kind}` : '']) {
    for (const [canonical, synonyms] of Object.entries(KEY_SYNONYMS[scope] ?? {})) {
      if (!keys.has(canonical)) continue;
      for (const synonym of synonyms) {
        const folded = foldKey(synonym);
        if (!spellings.has(folded)) spellings.set(folded, canonical);
      }
    }
  }
  return { family, kind, keys, required, requiredAny, spellings };
}

/** The vocabulary of a compilable family (and variant), or undefined for a hatch, refused or unknown family. */
export function vocabularyOf(family: string, kind?: string): FamilyVocabulary | undefined {
  const id = `${family}\u0000${kind ?? ''}`;
  if (!vocabularyCache.has(id)) vocabularyCache.set(id, buildVocabulary(family, kind));
  return vocabularyCache.get(id);
}

let compilable: string[] | undefined;

/** Every family token the repair layer may resolve to. */
export function compilableFamilies(): readonly string[] {
  compilable ??= Object.keys(FAMILY_CATALOG).concat('ladder').filter((family, index, all) => all.indexOf(family) === index && vocabularyOf(family) !== undefined);
  return compilable;
}

export interface TypeCandidate {
  family: string;
  kind?: string;
  /** `alias`: a known spelling; `fuzzy`: one unambiguous misspelling. */
  via: 'alias' | 'fuzzy';
}

let typeSpellings: Map<string, string[]> | undefined;

function typeTable(): Map<string, string[]> {
  if (typeSpellings) return typeSpellings;
  const table = new Map<string, string[]>();
  const add = (spelling: string, target: string) => {
    const family = target.split('#')[0]!;
    if (!vocabularyOf(family)) return;
    const list = table.get(spelling) ?? [];
    if (!list.includes(target)) list.push(target);
    table.set(spelling, list);
  };
  for (const family of compilableFamilies()) add(family, family);
  for (const manifest of FAMILY_MANIFESTS) for (const alias of manifest.aliases ?? []) add(foldType(alias), manifest.token);
  for (const [target, synonyms] of Object.entries(TYPE_SYNONYMS)) for (const synonym of synonyms) add(synonym, target);
  typeSpellings = table;
  return table;
}

function toCandidates(targets: readonly string[], via: TypeCandidate['via']): TypeCandidate[] {
  return targets.map((target) => {
    const [family, kind] = target.split('#') as [string, string | undefined];
    return { family, kind, via };
  });
}

/**
 * Families a written type token may mean, best evidence first: the catalog's own aliases, curated
 * synonyms, the token without separators or a generic suffix, then one unambiguous misspelling.
 * Several candidates are returned when the token is shared; the caller scores them by the declared keys.
 */
export function typeCandidates(written: string): TypeCandidate[] {
  const token = foldType(written);
  if (!token) return [];
  const canonical = canonicalizeDiagramType(token);
  if (vocabularyOf(canonical)) return [{ family: canonical, via: 'alias' }];
  const table = typeTable();
  const squash = (text: string) => text.replace(/[-.]/g, '');
  for (const form of [token, token.replace(TYPE_SUFFIX, '')]) {
    const viaCatalog = canonicalizeDiagramType(form);
    if (vocabularyOf(viaCatalog)) return [{ family: viaCatalog, via: 'alias' }];
    if (table.has(form)) return toCandidates(table.get(form)!, 'alias');
    const squashed = [...table.entries()].filter(([spelling]) => squash(spelling) === squash(form)).flatMap(([, targets]) => targets);
    if (squashed.length) return toCandidates([...new Set(squashed)], 'alias');
  }
  const single = new Map<string, string>();
  for (const [spelling, targets] of table) single.set(spelling, targets.join('|'));
  const fuzzy = closestTarget(token, single);
  return fuzzy ? toCandidates(fuzzy.split('|'), 'fuzzy') : [];
}

let lexicon: Set<string> | undefined;

/** `folded` is a real key or common word somewhere, so it is not a typo of anything. */
export function isKnownWord(folded: string): boolean {
  if (!lexicon) {
    lexicon = new Set(COMMON_WORDS);
    for (const word of [...DECORATION_KEYS, ...CANVAS_KEYS]) lexicon.add(word);
    for (const family of compilableFamilies()) for (const key of vocabularyOf(family)!.keys.keys()) lexicon.add(foldKey(key));
    for (const scope of Object.values(KEY_SYNONYMS)) for (const synonyms of Object.values(scope)) for (const synonym of synonyms) lexicon.add(foldKey(synonym));
  }
  return lexicon.has(folded);
}

/** A key that only styles the figure, for a family that does not read it. */
export function isDecoration(vocabulary: FamilyVocabulary, key: string, value: string): boolean {
  const folded = foldKey(key);
  if (vocabulary.spellings.has(folded)) return false;
  if (DECORATION_KEYS.has(folded)) return true;
  return CANVAS_KEYS.has(folded) && ENGINES.has(vocabulary.family) && /^[\d\s.,x×:()[\]]+(?:px|pt|em|%)?$/i.test(value.trim());
}

/** The canonical spelling of an enumerated value, or undefined when the value is not a known synonym. */
export function canonicalEnum(scope: string, written: string): string | undefined {
  const table = VALUE_SYNONYMS[scope];
  if (!table) return undefined;
  const token = foldType(written);
  for (const [canonical, synonyms] of Object.entries(table)) {
    if (canonical.toLowerCase() === token || synonyms.includes(token)) return canonical;
  }
  return undefined;
}

export function isEnumScope(scope: string): boolean {
  return hasOwn(VALUE_SYNONYMS, scope);
}
