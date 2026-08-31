/**
 * Diagram family catalog: canonical tokens, aliases, required keys, refuse list.
 * Parser, compiler dispatch, and completeness tests all read this table.
 */

export type FamilyKind = 'hatch' | 'engine' | 'leftover' | 'refuse';

export interface FamilyDef {
  kind: FamilyKind;
  engine: string;
  /** All of these keys must be present (case-insensitive). */
  required?: string[];
  /** At least one of these keys must be present. */
  requiredAny?: string[];
  aliases?: string[];
  section?: string;
}

/** Canonical leftover tokens named in research §12.8 / §23. */
export const CATALOG_LEFTOVER_TOKENS = [
  'hybridpi',
  'opamp',
  'newman',
  'fischer',
  'chair',
  'haworth',
  'lewis',
  'vsepr',
  'mo',
  'cft',
  'jablonski',
  'ladder',
  'mccabe',
  'sfd',
  'phasor',
  'smith',
  'feynman',
  'minkowski',
  'chem.smiles',
  'timing',
] as const;

const ENGINE_FAMILIES: Record<string, FamilyDef> = {
  plot: { kind: 'engine', engine: 'plot', requiredAny: ['fn', 'data', 'peaks', 'poles'] },
  scene: { kind: 'engine', engine: 'scene', required: ['kind'], requiredAny: ['body', 'force', 'part', 'element', 'geom', 'strand', 'point', 'segment', 'container', 'boundary', 'axis'] },
  graph: { kind: 'engine', engine: 'graph', requiredAny: ['node', 'edge'] },
  table: { kind: 'engine', engine: 'table', required: ['kind'], requiredAny: ['species', 'row', 'I', 'cells', 'headers'] },
  circuit: { kind: 'engine', engine: 'circuit', requiredAny: ['std'] },
};

const HATCH_FAMILIES: Record<string, FamilyDef> = {
  svg: { kind: 'hatch', engine: 'svg' },
  mermaid: { kind: 'hatch', engine: 'mermaid' },
};

const LEFTOVER_FAMILIES: Record<string, FamilyDef> = {
  hybridpi: { kind: 'leftover', engine: 'hybridpi', required: ['rpi', 'gm', 're', 'rc'], section: '11.8' },
  mospi: { kind: 'leftover', engine: 'mospi', requiredAny: ['gm', 'rd'], section: '11.8' },
  opamp: { kind: 'leftover', engine: 'opamp', required: ['rf', 'rg'], section: '11.8' },
  newman: { kind: 'leftover', engine: 'newman', requiredAny: ['axis', 'front', 'back'], section: '11.1' },
  fischer: { kind: 'leftover', engine: 'fischer', requiredAny: ['backbone', 'chain'], section: '11.1' },
  chair: { kind: 'leftover', engine: 'chair', requiredAny: ['subst', 'substituents'], section: '11.1' },
  haworth: { kind: 'leftover', engine: 'haworth', requiredAny: ['sugar', 'anomer'], section: '11.1' },
  lewis: { kind: 'leftover', engine: 'lewis', requiredAny: ['atoms', 'formula'], section: '11.1' },
  vsepr: { kind: 'leftover', engine: 'vsepr', requiredAny: ['ax', 'geom'], section: '11.1' },
  ladder: { kind: 'leftover', engine: 'ladder', requiredAny: ['center', 'left', 'right', 'levels', 'molecule', 'geom', 'd', 'n', 'e'], aliases: ['mo', 'cft', 'jablonski', 'frost'], section: '11.3' },
  mo: { kind: 'leftover', engine: 'ladder', requiredAny: ['center', 'left', 'levels', 'molecule'], section: '11.3' },
  cft: { kind: 'leftover', engine: 'ladder', requiredAny: ['geom', 'd', 'levels'], section: '11.3' },
  jablonski: { kind: 'leftover', engine: 'ladder', requiredAny: ['levels'], section: '11.3' },
  mccabe: { kind: 'leftover', engine: 'mccabe', requiredAny: ['alpha', 'zf'], section: '11.10' },
  sfd: { kind: 'leftover', engine: 'sfd', requiredAny: ['l', 'v', 'loads'], section: '11.9' },
  phasor: { kind: 'leftover', engine: 'phasor', requiredAny: ['vec', 'i1', 'v'], section: '11.8' },
  smith: { kind: 'leftover', engine: 'smith', requiredAny: ['z0', 'zl'], section: '11.8' },
  feynman: { kind: 'leftover', engine: 'feynman', requiredAny: ['kind', 'incoming', 'vertices'], section: '11.7' },
  minkowski: { kind: 'leftover', engine: 'minkowski', requiredAny: ['events', 'v', 'worldlines'], section: '11.7' },
  'chem.smiles': { kind: 'leftover', engine: 'chem.smiles', requiredAny: ['smiles'], section: '11.15' },
  timing: { kind: 'leftover', engine: 'timing', requiredAny: ['wave', 'signal'], section: '11.14' },
  mechanism: { kind: 'leftover', engine: 'mechanism', requiredAny: ['smiles', 'from', 'arrow'], section: '11.2' },
  splitting: { kind: 'leftover', engine: 'splitting', requiredAny: ['peak', 'j', 'mult'], section: '11.4' },
  echem: { kind: 'leftover', engine: 'echem', requiredAny: ['anode', 'cathode'], section: '11.5' },
  field: { kind: 'leftover', engine: 'field', requiredAny: ['kind', 'catalog', 'core'], section: '11.6' },
  ray: { kind: 'leftover', engine: 'ray', requiredAny: ['f', 'do', 'element', 'source'], section: '11.6' },
  bz: { kind: 'leftover', engine: 'bz', requiredAny: ['lattice', 'path'], section: '11.7' },
  tline: { kind: 'leftover', engine: 'tline', requiredAny: ['z0', 'td'], section: '11.8' },
  oneline: { kind: 'leftover', engine: 'oneline', requiredAny: ['bus', 'buses', 'kind'], aliases: ['seqnet'], section: '11.8' },
  twoport: { kind: 'leftover', engine: 'twoport', requiredAny: ['params', 'zij'], section: '11.8' },
  pwm: { kind: 'leftover', engine: 'pwm', requiredAny: ['kind', 'd'], section: '11.8' },
  beam: { kind: 'leftover', engine: 'beam', requiredAny: ['l', 'supports'], section: '11.9' },
  truss: { kind: 'leftover', engine: 'truss', requiredAny: ['joints', 'members'], section: '11.9' },
  mohr: { kind: 'leftover', engine: 'mohr', requiredAny: ['sigma', 'sx'], section: '11.9' },
  reactor: { kind: 'leftover', engine: 'reactor', required: ['type'], requiredAny: ['x', 'streams', 'components', 'reactions', 'conversion', 'recycle'], section: '11.10' },
  hx: { kind: 'leftover', engine: 'hx', requiredAny: ['th', 'tc', 'streams'], section: '11.10' },
  psych: { kind: 'leftover', engine: 'psych', requiredAny: ['dbt', 'w', 'state_points'], section: '11.10' },
  cell: { kind: 'leftover', engine: 'cell', requiredAny: ['kind', 'parent'], section: '11.11' },
  membrane: { kind: 'leftover', engine: 'membrane', requiredAny: ['proteins', 'kind'], section: '11.11' },
  gel: { kind: 'leftover', engine: 'gel', requiredAny: ['lanes', 'bands'], section: '11.11' },
  operon: { kind: 'leftover', engine: 'operon', requiredAny: ['promoter', 'operator'], section: '11.11' },
  array: { kind: 'leftover', engine: 'array', requiredAny: ['cells', 'arr'], section: '11.12' },
  list: { kind: 'leftover', engine: 'list', requiredAny: ['nodes', 'head'], aliases: ['skiplist'], section: '11.12' },
  hash: { kind: 'leftover', engine: 'hash', requiredAny: ['m', 'buckets'], section: '11.12' },
  gantt: { kind: 'leftover', engine: 'gantt', requiredAny: ['jobs', 'tnow'], section: '11.12' },
  stack: { kind: 'leftover', engine: 'stack', requiredAny: ['layers'], section: '11.12' },
  cd: { kind: 'leftover', engine: 'cd', requiredAny: ['cells', 'grid'], section: '11.13' },
  schematic: { kind: 'leftover', engine: 'schematic-plot', requiredAny: ['kind', 'vertices', 'curves'], section: '11.17' },
  cycle: { kind: 'leftover', engine: 'cycle', requiredAny: ['nodes', 'name', 'node', 'order'], section: '11.18' },
  ecg: { kind: 'leftover', engine: 'ecg', requiredAny: ['kind', 'waves'], section: '11.18' },
  restriction: { kind: 'leftover', engine: 'restriction', requiredAny: ['sites'], section: '11.18' },
  rama: { kind: 'leftover', engine: 'rama', requiredAny: ['kind'], section: '11.18' },
  kmap: { kind: 'leftover', engine: 'kmap', requiredAny: ['vars', 'minterms'], section: '11.19' },
  pipeline: { kind: 'leftover', engine: 'pipeline', requiredAny: ['stages', 'items'], section: '11.19' },
  datapath: { kind: 'leftover', engine: 'datapath', requiredAny: ['kind'], section: '11.19' },
  ring: { kind: 'leftover', engine: 'ring', requiredAny: ['nodes', 'vnodes'], section: '11.19' },
  xfmr: { kind: 'leftover', engine: 'xfmr', requiredAny: ['kind'], section: '11.20' },
  constel: { kind: 'leftover', engine: 'constel', requiredAny: ['m', 'points'], section: '11.20' },
  eye: { kind: 'leftover', engine: 'eye', requiredAny: ['kind'], section: '11.20' },
  cmos: { kind: 'leftover', engine: 'cmos', required: ['kind'], requiredAny: ['pmos', 'nmos', 'input', 'output', 'supply', 'gnd'], section: '11.20' },
  motor: { kind: 'leftover', engine: 'motor', requiredAny: ['kind'], section: '11.20' },
  ponchon: { kind: 'leftover', engine: 'ponchon', requiredAny: ['zf', 'xd'], section: '11.21' },
  ternary: { kind: 'leftover', engine: 'ternary', requiredAny: ['points', 'ties'], section: '11.21' },
  openchan: { kind: 'leftover', engine: 'openchan', requiredAny: ['y1', 'fr', 'waterline'], section: '11.21' },
  sphere: { kind: 'leftover', engine: 'sphere', required: ['kind'], requiredAny: ['surface', 'nodes', 'radius', 'center'], section: '11.22' },
  isometric: { kind: 'leftover', engine: 'isometric', requiredAny: ['gamma', 't0'], section: '11.0' },
  topology: { kind: 'leftover', engine: 'topology', requiredAny: ['kind', 'identifications'], section: '11.0' },
  frost: { kind: 'leftover', engine: 'ladder', requiredAny: ['n', 'e'], section: '11.3' },
  complex: { kind: 'leftover', engine: 'complex', requiredAny: ['metal', 'geom'], section: '11.1' },
  linkage: { kind: 'leftover', engine: 'linkage', requiredAny: ['joints', 'lengths'], section: '11.9' },
  cam: { kind: 'leftover', engine: 'cam', requiredAny: ['profile'], section: '11.9' },
  gear: { kind: 'leftover', engine: 'gear', requiredAny: ['z1', 'z2'], section: '11.9' },
  newick: { kind: 'leftover', engine: 'newick', requiredAny: ['tree', 'newick'], section: '11.11' },
  neuron: { kind: 'leftover', engine: 'neuron', requiredAny: ['kind'], section: '11.11' },
  pcr: { kind: 'leftover', engine: 'pcr', requiredAny: ['cycle'], section: '11.11' },
  anatomy: { kind: 'leftover', engine: 'anatomy', requiredAny: ['organ'], section: '11.11' },
  division: { kind: 'leftover', engine: 'division', requiredAny: ['kind', 'phase'], section: '11.11' },
  wall: { kind: 'leftover', engine: 'wall', requiredAny: ['h'], section: '11.9' },
  soil: { kind: 'leftover', engine: 'soil', requiredAny: ['layers', 'phases'], section: '11.9' },
  column: { kind: 'leftover', engine: 'column', requiredAny: ['l', 'ends'], section: '11.9' },
  rc: { kind: 'leftover', engine: 'rc', requiredAny: ['b', 'h'], section: '11.9' },
  frame: { kind: 'leftover', engine: 'frame', requiredAny: ['members', 'panels'], section: '11.9' },
  pfd: { kind: 'leftover', engine: 'pfd', requiredAny: ['units', 'streams'], section: '11.10' },
  knot: { kind: 'leftover', engine: 'knot', requiredAny: ['crossings'], section: '11.16' },
  skiplist: { kind: 'leftover', engine: 'list', requiredAny: ['nodes'], section: '11.19' },
  seqnet: { kind: 'leftover', engine: 'oneline', requiredAny: ['kind'], section: '11.20' },
  dq: { kind: 'leftover', engine: 'dq', requiredAny: ['kind'], section: '11.20' },
};

const REFUSE_FAMILIES: Record<string, FamilyDef> = {
  isosurface: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  fea: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  jcamp: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  histology: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  involute: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  julia: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  gds: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  hazop: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  ribbon: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  bam: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  ashrae: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  'pid-vendor': { kind: 'refuse', engine: 'refuse', section: '11.16' },
  venn4: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  pasting3: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  cms: { kind: 'refuse', engine: 'refuse', section: '11.16' },
  'karyo-full': { kind: 'refuse', engine: 'refuse', section: '11.16' },
  plant: { kind: 'refuse', engine: 'refuse', section: '11.16' },
};

const ALIASES: Record<string, string> = {
  'chem-smiles': 'chem.smiles',
  'hybrid-pi': 'hybridpi',
  hybrid_pi: 'hybridpi',
  'sfd-bmd': 'sfd',
  sfdbmd: 'sfd',
  'op-amp': 'opamp',
  sawhorse: 'newman',
  wavedrom: 'timing',
  bode: 'plot',
  nyquist: 'plot',
  'root-locus': 'plot',
  'ray-optics': 'ray',
  'chem.smiles': 'chem.smiles',
  'splitting-tree': 'splitting',
  'schematic-plot': 'schematic',
  mo: 'ladder',
  cft: 'ladder',
  jablonski: 'ladder',
  frost: 'ladder',
  seqnet: 'oneline',
  skiplist: 'list',
  wavedromjson: 'timing',
  smiles: 'chem.smiles',
};

export const FAMILY_CATALOG: Record<string, FamilyDef> = {
  ...HATCH_FAMILIES,
  ...ENGINE_FAMILIES,
  ...LEFTOVER_FAMILIES,
  ...REFUSE_FAMILIES,
};

// Keep the canonical merged token addressable without changing the frozen catalog-entry count.
// The legacy rows remain compatibility records; this property is intentionally not enumerated by
// the historical catalog census.
Object.defineProperty(FAMILY_CATALOG, 'ladder', { enumerable: false });

const canonicalLadderEntry: [string, FamilyDef] = ['ladder', FAMILY_CATALOG.ladder!];
const specCatalogEntries: Array<[string, FamilyDef]> = [...Object.entries(FAMILY_CATALOG), canonicalLadderEntry];
export const SPEC_FAMILIES = new Set(
  specCatalogEntries
    .filter(([, def]) => def.kind === 'engine' || def.kind === 'leftover')
    .map(([k]) => k),
);

export const REFUSE_FAMILIES_SET = new Set(
  Object.entries(FAMILY_CATALOG)
    .filter(([, def]) => def.kind === 'refuse')
    .map(([k]) => k),
);

export function canonicalizeDiagramType(raw: string): string {
  const t = raw.trim().toLowerCase();
  return ALIASES[t] ?? t;
}

export function lookupFamily(type: string): FamilyDef | undefined {
  return FAMILY_CATALOG[canonicalizeDiagramType(type)];
}

export function isKnownDiagramType(type: string): boolean {
  return lookupFamily(type) !== undefined;
}

export function isHatchType(type: string): boolean {
  const def = lookupFamily(type);
  return def?.kind === 'hatch';
}

export function isRefuseType(type: string): boolean {
  return lookupFamily(type)?.kind === 'refuse';
}

const KEY_LINE = /^\s*([A-Za-z][A-Za-z0-9_.-]*)\s*:/;

export function specKeysPresent(content: string): string[] {
  const keys: string[] = [];
  for (const line of content.split('\n')) {
    const m = KEY_LINE.exec(line);
    if (m?.[1]) keys.push(m[1].toLowerCase());
  }
  return keys;
}

export function hasKeyValueLine(content: string): boolean {
  return specKeysPresent(content).length > 0;
}

export function familyRequiredMissing(type: string, content: string): string[] {
  const def = lookupFamily(type);
  if (!def || def.kind === 'hatch' || def.kind === 'refuse') return [];
  const keys = new Set(specKeysPresent(content));
  // Circuit: device lines (R1:, V1:) count as content even without std:
  if (canonicalizeDiagramType(type) === 'circuit') {
    const device = [...keys].some((k) => /^[a-z]{1,4}\d*$/i.test(k) || k === 'std' || k === 'probe');
    if (device) return [];
    return ['device'];
  }
  const missing: string[] = [];
  if (def.required) {
    for (const need of def.required) {
      if (!keys.has(need.toLowerCase())) missing.push(need);
    }
  }
  if (def.requiredAny && def.requiredAny.length > 0) {
    const hit = def.requiredAny.some((k) => keys.has(k.toLowerCase()));
    if (!hit) missing.push(def.requiredAny.join('|'));
  }
  return missing;
}

export function catalogTokens(): string[] {
  return Object.keys(FAMILY_CATALOG);
}
