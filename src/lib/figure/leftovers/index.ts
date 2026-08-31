import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { compileHybridPi, compileMosPi, compileOpamp } from './hybridpi';
import {
  compileNewman,
  compileFischer,
  compileChair,
  compileHaworth,
  compileLewis,
  compileVsepr,
  compileComplex,
} from './organic';
import { compileLadder, compileCft, compileJablonski } from './ladder';
import { compileMccabe, compilePonchon } from './mccabe';
import { compileSfd, compileBeam } from './sfd';
import {
  compilePhasor,
  compileSmith,
  compileFeynman,
  compileMinkowski,
  compileRay,
  compileField,
  compileBz,
} from './physics';
import { compileChemSmiles } from './chem-smiles';
import { compileTiming } from './timing';
import {
  compileTruss,
  compileMohr,
  compileReactor,
  compileHx,
  compileTernary,
  compileOpenchan,
  compileWall,
  compileSoil,
  compileColumn,
  compileRc,
  compileFrame,
  compilePfd,
  compileLinkage,
  compileCam,
  compileGear,
  compilePsych,
} from './rest-mech';
import {
  compileTline,
  compileOneline,
  compileTwoport,
  compilePwm,
  compileXfmr,
  compileConstel,
  compileEye,
  compileCmos,
  compileMotor,
  compileDq,
} from './rest-ee';
import {
  compileCellBio,
  compileMembrane,
  compileOperon,
  compileRestriction,
  compileRama,
  compileCycle,
  compileEcg,
  compileGel,
  compileNewick,
  compileNeuron,
  compilePcr,
  compileAnatomy,
  compileDivision,
} from './rest-bio';
import {
  compileArray,
  compileList,
  compileHash,
  compileGantt,
  compileStack,
  compileCd,
  compileSchematicPlot,
  compileKmap,
  compilePipeline,
  compileDatapath,
  compileRing,
  compileTopology,
  compileSphere,
  compileIsometric,
  compileKnot,
  compileMechanism,
  compileSplitting,
  compileEchem,
} from './rest-cs';
import { compileGeneric, compileFrost } from './rest-misc';

type LeftoverFn = (spec: SpecDoc, ctx: CompileCtx) => CompileResult | Promise<CompileResult>;

function compileLadderFamily(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (specGet(spec, 'n') !== undefined || specGet(spec, 'e') !== undefined) return compileFrost(spec, ctx);
  if (specGet(spec, 'd') !== undefined || specGet(spec, 'geom') !== undefined) return compileCft(spec, ctx);
  if (specGet(spec, 'left') !== undefined || specGet(spec, 'right') !== undefined || specGet(spec, 'center') !== undefined || specGet(spec, 'molecule') !== undefined) {
    return compileLadder(spec, ctx, 'mo');
  }
  return compileJablonski(spec, ctx);
}

function compileOnelineFamily(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (specGetAll(spec, 'state').length || specGetAll(spec, 'transition').length) {
    return compileOneline({ ...spec, type: 'seqnet' }, ctx);
  }
  return compileOneline(spec, ctx);
}

const TABLE: Record<string, LeftoverFn> = {
  hybridpi: compileHybridPi,
  mospi: compileMosPi,
  opamp: compileOpamp,
  newman: compileNewman,
  fischer: compileFischer,
  chair: compileChair,
  haworth: compileHaworth,
  lewis: compileLewis,
  vsepr: compileVsepr,
  complex: compileComplex,
  ladder: compileLadderFamily,
  mo: (s, c) => compileLadder(s, c, 'mo'),
  cft: compileCft,
  jablonski: compileJablonski,
  frost: compileFrost,
  mccabe: compileMccabe,
  ponchon: compilePonchon,
  sfd: compileSfd,
  beam: compileBeam,
  phasor: compilePhasor,
  smith: compileSmith,
  feynman: compileFeynman,
  minkowski: compileMinkowski,
  ray: compileRay,
  field: compileField,
  bz: compileBz,
  'chem.smiles': compileChemSmiles,
  timing: compileTiming,
  mechanism: compileMechanism,
  splitting: compileSplitting,
  echem: compileEchem,
  array: compileArray,
  list: compileList,
  skiplist: compileList,
  hash: compileHash,
  gantt: compileGantt,
  stack: compileStack,
  cd: compileCd,
  schematic: compileSchematicPlot,
  cycle: compileCycle,
  ecg: compileEcg,
  gel: compileGel,
  kmap: compileKmap,
  truss: compileTruss,
  mohr: compileMohr,
  tline: compileTline,
  oneline: compileOnelineFamily,
  seqnet: compileOneline,
  twoport: compileTwoport,
  pwm: compilePwm,
  reactor: compileReactor,
  hx: compileHx,
  cell: compileCellBio,
  membrane: compileMembrane,
  operon: compileOperon,
  restriction: compileRestriction,
  rama: compileRama,
  pipeline: compilePipeline,
  datapath: compileDatapath,
  ring: compileRing,
  xfmr: compileXfmr,
  constel: compileConstel,
  eye: compileEye,
  cmos: compileCmos,
  motor: compileMotor,
  ternary: compileTernary,
  openchan: compileOpenchan,
  sphere: compileSphere,
  isometric: compileIsometric,
  topology: compileTopology,
  dq: compileDq,
  psych: compilePsych,
  newick: compileNewick,
  neuron: compileNeuron,
  pcr: compilePcr,
  anatomy: compileAnatomy,
  division: compileDivision,
  wall: compileWall,
  soil: compileSoil,
  column: compileColumn,
  rc: compileRc,
  frame: compileFrame,
  pfd: compilePfd,
  knot: compileKnot,
  linkage: compileLinkage,
  cam: compileCam,
  gear: compileGear,
};

export function leftoverRegistered(type: string): boolean {
  return type in TABLE;
}

export async function compileLeftover(type: string, spec: SpecDoc, ctx: CompileCtx): Promise<CompileResult> {
  const fn = TABLE[type];
  if (!fn) return compileGeneric(type, spec, ctx);
  return fn(spec, ctx);
}

export { TABLE as LEFTOVER_TABLE };
