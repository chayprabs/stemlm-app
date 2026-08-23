/**
 * Subject registry (not essays). stemlm-protocol.txt ships EVERY row so a
 * classifier miss cannot starve the model. The model sets @meta subject: from
 * the problem and applies that row plus the archetype/diagram registries.
 */
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

export const SUBJECT_REGISTRY: Record<Subject, SubjectRow> = {
  Physics: {
    marker: 'PHYSICS',
    archetypes: 'numeric,symbolic,conceptual,lab,estimation',
    diagrams:
      'scene(fbd,ray,geom,field),plot,circuit,ray,field,phasor,minkowski,feynman,mo',
    verify: 'dimensional,units,limit,oom,conservation,backsub',
    nodraw: 'pure algebra after the system is drawn; unit conversion; definition-only',
    notation: 'SI; g from problem else 9.81 listed in @uncertainty; radians unless stated',
    traps: 'rms vs peak; dropped friction sign; mixing g=10/9.8; I=current vs intensity vs inertia; NEVER mermaid for FBD/plots',
  },
  Chemistry: {
    marker: 'CHEMISTRY',
    archetypes: 'numeric,conceptual,design,lab,comparison',
    diagrams:
      'chem.smiles,newman,fischer,chair,haworth,lewis,vsepr,mo,cft,jablonski,mechanism,splitting,echem,table(ice),plot(peaks),complex,frost',
    verify: 'units,conservation,backsub,limit',
    nodraw: 'mole arithmetic with no structure/mechanism/cell; unit conversion',
    notation: 'mhchem $\\ce{...}$; R/S E/Z; NEVER SMILES-as-Newman/Fischer/chair',
    traps: 'limiting reagent; ICE x domain; electrochem MUST be type=echem not circuit or bio cell; NEVER SMILES-as-Newman; frost≠Latimer',
  },
  Math: {
    marker: 'MATH',
    archetypes: 'numeric,symbolic,proof,estimation,comparison',
    diagrams: 'plot,scene,table,graph,cd,topology,isometric,mermaid(CS-style automata only)',
    verify: 'alt,backsub,limit,dimensional',
    nodraw: 'purely symbolic algebra or a formal proof with no geometric/graph content',
    notation: 'radians; KaTeX aligned/cases/bmatrix not align; decimal matches the problem',
    traps: 'degrees vs radians; dropped domain; two algebra moves in one step; proof that "plugs in"',
  },
  Biology: {
    marker: 'BIOLOGY',
    archetypes: 'conceptual,numeric,comparison,lab,design',
    diagrams:
      'table(punnett),graph,plot,cell,membrane,gel,operon,newick,anatomy,division,cycle,restriction,ecg,pcr,neuron',
    verify: 'conservation,oom,units,alt',
    nodraw: 'definition-only vocab; naming a pathway already drawn',
    notation: 'gene vs protein italics/caps as in the problem; Punnett alleles exact',
    traps: 'Punnett is table kind=punnett (never a punnett family token); pedigree≠flowchart; blunt vs pointed regulation; mermaid NEVER for Krebs',
  },
  CS: {
    marker: 'CS',
    archetypes: 'code,numeric,proof,design,comparison',
    diagrams:
      'mermaid(flow|sequence|state),graph,table(dp),array,list,hash,gantt,stack,kmap,pipeline,datapath,timing,skiplist,ring',
    verify: 'alt,backsub,oom',
    nodraw: 'complexity-only with no state; a one-line identity',
    notation: 'inline `code` NEVER a fence; quote mermaid labels; 0-index unless the problem is 1-index',
    traps: 'off-by-one; mutating the input in the trace; mermaid for non-CS figures',
  },
  Electrical: {
    marker: 'ELECTRICAL',
    archetypes: 'numeric,symbolic,design,lab,comparison',
    diagrams:
      'circuit,hybridpi,opamp,phasor,plot,smith,tline,oneline,twoport,pwm,timing,xfmr,constel,eye,cmos,motor',
    verify: 'conservation,units,limit,alt,dimensional,backsub',
    nodraw: 'unit conversion only; NEVER skip the circuit when components exist',
    notation: 'std: ieee or iec from locale; passive sign; rms vs peak stated once',
    traps: 'omit RC on hybridpi; peak/rms mix; IEEE/IEC mix; Thevenin polarity; virtual short misuse',
  },
  Mechanical: {
    marker: 'MECHANICAL',
    archetypes: 'numeric,design,lab,estimation,comparison',
    diagrams: 'scene(fbd),plot,sfd,mohr,linkage,cam,gear,motor,beam',
    verify: 'units,dimensional,conservation,limit,oom',
    nodraw: 'unit conversion; algebra after the FBD is complete and unchanged',
    notation: 'SI unless USCS in the problem; FoS stated; sagging+ if using sfd',
    traps: 'internal vs external forces on FBD; NEVER civil sfd on a shaft; never invent a shaft family; mixing gauge/absolute pressure',
  },
  Civil: {
    marker: 'CIVIL',
    archetypes: 'numeric,design,lab,comparison',
    diagrams: 'beam,truss,sfd,wall,soil,column,rc,frame,scene,plot',
    verify: 'conservation,units,limit,alt',
    nodraw: 'unit conversion; a numeric line that does not change the section',
    notation: 'sagging positive on sfd; pin=triangle roller=circle fixed=hatch; SI/USCS from problem',
    traps: 'wrong support glyph; hogging/sagging sign; section cut not shown; omitting a reaction',
  },
  Chemical: {
    marker: 'CHEMICAL',
    archetypes: 'numeric,design,lab,comparison,estimation',
    diagrams: 'pfd,mccabe,reactor,hx,psych,ponchon,ternary,table,plot,openchan',
    verify: 'conservation,units,backsub,limit',
    nodraw: 'arithmetic on an already-complete stream table with no process change; NEVER list McCabe stair corners',
    notation: 'numbered streams; mole vs mass fraction stated; basis stated in step 1',
    traps: 'forgotten recycle; wet vs dry basis; listing staircase corners; Chemical≠Chemistry (no SMILES on PFDs); missing DOF',
  },
  General: {
    marker: 'GENERAL',
    archetypes: 'numeric,conceptual,comparison,estimation',
    diagrams: 'adopt the dominant subject row; mermaid for linear flows',
    verify: 'units,oom,alt',
    nodraw: 'non-visual definition; refuse families',
    notation: 'match the problem language and unit system',
    traps: 'inventing a subject name; mixing two subjects\' diagram families in one step',
  },
};

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
  return [
    UNIVERSAL_PLAYBOOK_HEADER,
    'subject\tarchetypes\tdiagrams\tverify\tnodraw\tnotation\ttraps',
    ...SUBJECTS.map((s) => {
      const r = SUBJECT_REGISTRY[s];
      return `${r.marker}\t${r.archetypes}\t${r.diagrams}\t${r.verify}\t${r.nodraw}\t${r.notation}\t${r.traps}`;
    }),
  ].join('\n');
}
