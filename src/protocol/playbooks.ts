/**
 * Subject registry (not essays). stemlm-protocol.txt ships EVERY row so a
 * classifier miss cannot starve the model. The model sets @meta subject: from
 * the problem and applies that row plus the archetype/diagram registries.
 */
import { FAMILY_MANIFESTS } from '@/src/lib/figure/families/manifest';
import { SUBJECTS, type Subject } from './types';

export interface SubjectRow {
  marker: string;
  archetypes: string;
  diagrams: string;
  verify: string;
  nodraw: string;
  notation: string;
  traps: string;
}

const BASE_ROWS: Record<Subject, SubjectRow> = {
  Physics: {
    marker: 'PHYSICS',
    archetypes: 'numeric,symbolic,conceptual,lab,estimation',
    diagrams:
      'scene(fbd,ray,geom,gas,thermodynamic,apparatus),plot,circuit,field,phasor',
    verify: 'dimensional,units,limit,oom,conservation,backsub',
    nodraw: 'pure algebra after the system is drawn; unit conversion; definition-only',
    notation: 'SI; g from problem else 9.81 listed in @uncertainty; radians unless stated',
    traps: 'rms vs peak; dropped friction sign; mixing g=10/9.8; I=current vs intensity vs inertia',
  },
  Chemistry: {
    marker: 'CHEMISTRY',
    archetypes: 'numeric,conceptual,design,lab,comparison',
    diagrams:
      'chem.smiles,fischer,table(ice),plot(peaks|titration),graph(reaction pathway),vsepr,newman,mo,cft,splitting',
    verify: 'units,conservation,backsub,limit',
    nodraw: 'mole arithmetic with no structure; unit conversion',
    notation: 'mhchem $\\ce{...}$; R/S E/Z; NEVER SMILES for a conformation or projection',
    traps: 'limiting reagent; ICE x domain; an electrochemical cell is not a type=circuit; NMR δ increases right-to-left; Fischer D/L ≠ R/S; Oh CFT t2g below eg',
  },
  Math: {
    marker: 'MATH',
    archetypes: 'numeric,symbolic,proof,estimation,comparison',
    diagrams: 'plot,scene(geom),table,graph(automata: start/accept)',
    verify: 'alt,backsub,limit,dimensional',
    nodraw: 'purely symbolic algebra or a formal proof with no geometric/graph content',
    notation: 'radians; KaTeX aligned/cases/bmatrix not align; decimal matches the problem',
    traps: 'degrees vs radians; dropped domain; fragmented line-by-line algebra; proof that "plugs in"',
  },
  Biology: {
    marker: 'BIOLOGY',
    archetypes: 'conceptual,numeric,comparison,lab,design',
    diagrams:
      'table(punnett),graph,plot,gel,cycle,scene(molecular|apparatus)',
    verify: 'conservation,oom,units,alt',
    nodraw: 'definition-only vocab; naming a pathway already drawn',
    notation: 'gene vs protein italics/caps as in the problem; Punnett alleles exact',
    traps: 'Punnett→table kind=punnett; pedigree≠flowchart; regulation: pointed activate, blunt inhibit; ecology energy flow: quantified source→trophic bands→loss/decomposer flows+legend, not only a web.',
  },
  CS: {
    marker: 'CS',
    archetypes: 'code,numeric,proof,design,comparison',
    diagrams:
      'graph(flowchart: decision/terminal; state machine: start/accept),table(dp|message sequence),array,list,hash,stack,timing,kmap,gantt',
    verify: 'alt,backsub,oom',
    nodraw: 'complexity-only with no state; a one-line identity',
    notation: 'inline `code` NEVER a fence; 0-index unless the problem is 1-index',
    traps: 'off-by-one; mutating the input in the trace; a flowchart test without decision:; a state machine without start:',
  },
  Electrical: {
    marker: 'ELECTRICAL',
    archetypes: 'numeric,symbolic,design,lab,comparison',
    diagrams:
      'circuit,plot(bode|waveform),phasor,timing,kmap',
    verify: 'conservation,units,limit,alt,dimensional,backsub',
    nodraw: 'unit conversion; pure algebra after a complete circuit is already shown and unchanged',
    notation: 'std: ieee or iec from locale; passive sign; rms vs peak stated once',
    traps: 'topology copied from appearance instead of node connectivity; missing/duplicate device; invented ground/port; peak/rms mix; IEEE/IEC mix; Thevenin polarity; virtual short misuse',
  },
  Mechanical: {
    marker: 'MECHANICAL',
    archetypes: 'numeric,design,lab,estimation,comparison',
    diagrams: 'scene(fbd|thermodynamic),plot,sfd,table,truss,mohr',
    verify: 'units,dimensional,conservation,limit,oom',
    nodraw: 'unit conversion; algebra after the FBD is complete and unchanged',
    notation: 'SI unless USCS in the problem; FoS stated; sagging+ on sfd',
    traps: 'internal vs external forces on FBD; torque on a shaft is not an sfd; never invent a shaft family; mixing gauge/absolute pressure',
  },
  Civil: {
    marker: 'CIVIL',
    archetypes: 'numeric,design,lab,comparison',
    diagrams: 'sfd,scene(fbd),plot,table,truss,mohr',
    verify: 'conservation,units,limit,alt',
    nodraw: 'unit conversion; a numeric line that does not change the section',
    notation: 'sagging positive on sfd; pin=triangle roller=circle fixed=hatch; SI/USCS from problem',
    traps: 'wrong support glyph; hogging/sagging sign; section cut not shown; omitting a reaction',
  },
  Chemical: {
    marker: 'CHEMICAL',
    archetypes: 'numeric,design,lab,comparison,estimation',
    diagrams: 'graph(process flow: units as nodes, numbered streams as edges),table(stream table),plot',
    verify: 'conservation,units,backsub,limit',
    nodraw: 'arithmetic on an already-complete stream table with no process change',
    notation: 'numbered streams; mole vs mass fraction stated; basis stated in step 1',
    traps: 'forgotten recycle; wet vs dry basis; Chemical≠Chemistry (no SMILES on flowsheets); missing DOF',
  },
  General: {
    marker: 'GENERAL',
    archetypes: 'numeric,conceptual,comparison,estimation',
    diagrams: 'adopt the dominant subject row; graph for linear flows',
    verify: 'units,oom,alt',
    nodraw: 'non-visual definition; refuse families',
    notation: 'match the problem language and unit system',
    traps: 'inventing a subject name; mixing two subjects\' diagram families in one step',
  },
};

/**
 * A pack family (src/lib/figure/families) names the subjects it serves in its own manifest, so a
 * new pack reaches the guide without anyone editing the rows above.
 */
function packFamilies(subject: Subject): string {
  return FAMILY_MANIFESTS.filter((manifest) => (manifest.subjects as Subject[]).includes(subject))
    .map((manifest) => `,${manifest.token}`)
    .join('');
}

export const SUBJECT_REGISTRY: Record<Subject, SubjectRow> = Object.fromEntries(
  SUBJECTS.map((subject) => [subject, { ...BASE_ROWS[subject], diagrams: BASE_ROWS[subject].diagrams + packFamilies(subject) }]),
) as Record<Subject, SubjectRow>;

export const PLAYBOOKS: Record<Subject, string> = Object.fromEntries(
  SUBJECTS.map((s) => [s, formatSubjectRow(s, SUBJECT_REGISTRY[s])]),
) as Record<Subject, string>;

function formatSubjectRow(subject: Subject, row: SubjectRow): string {
  return [
    `${row.marker}: subject=${subject}`,
    `archetypes: ${row.archetypes}`,
    `diagrams: ${row.diagrams}`,
    `verify: ${row.verify}`,
    `nodraw: ${row.nodraw}`,
    `notation: ${row.notation}`,
    `traps: ${row.traps}`,
  ].join('\n');
}

export function getPlaybook(subject: Subject): string {
  return PLAYBOOKS[subject] ?? PLAYBOOKS.General;
}

export const UNIVERSAL_PLAYBOOK_HEADER = `SUBJECT REGISTRY: from the problem (text/image/PDF/file), set @meta subject: to exactly one of ${SUBJECTS.join('|')}. Apply that row. Mixed problems → the dominant subject. NEVER invent a subject name.`;

export function getUniversalPlaybook(): string {
  // ponytail: keep every subject row; traps are paid-for regression rules, not prose duplication.
  return [
    UNIVERSAL_PLAYBOOK_HEADER,
    'subject\tarchetypes\tdiagrams\tverify\tnodraw\tnotation\ttraps',
    ...SUBJECTS.map((s) => {
      const r = SUBJECT_REGISTRY[s];
      return `${r.marker}\t${r.archetypes}\t${r.diagrams}\t${r.verify}\t${r.nodraw}\t${r.notation}\t${r.traps}`;
    }),
  ].join('\n');
}
