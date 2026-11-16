import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, unconsumedDeclarations, type SpecDoc } from '../spec';
import { compileHybridPi, compileMosPi, compileOpamp } from './hybridpi';
import {
  compileNewman,
  compileFischer,
  compileHaworth,
  compileVsepr,
} from './organic';
import { compileLadder, compileCft, compileJablonski } from './ladder';
import { compileMccabe, compilePonchon } from './mccabe';
import { compileSfd } from './sfd';
import {
  compilePhasor,
  compileSmith,
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
  compileWall,
  compileSoil,
  compileFrame,
  compilePfd,
  compileCam,
} from './rest-mech';
import {
  compileTline,
  compileOneline,
  compileTwoport,
  compilePwm,
  compileXfmr,
  compileMotor,
  compileDq,
} from './rest-ee';
import {
  compileMembrane,
  compileOperon,
  compileRama,
  compileCycle,
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
  compileSphere,
  compileKnot,
  compileSplitting,
  compileEchem,
} from './rest-cs';
import { compileGeneric } from './rest-misc';
import { FAMILY_COMPILERS } from '../families/compilers';

type LeftoverFn = (spec: SpecDoc, ctx: CompileCtx) => CompileResult | Promise<CompileResult>;

// D23: these templates drew what their spec does not say (grid-placed geometry, identical waves, a NAND as an
// inverter, circles for Lewis structures, invented event positions). A hidden figure beats a wrong one.
// D32: beam printed its raw load record and floated the deflection curve above the beam; sfd draws loaded beams.
function refuseUnfaithful(spec: SpecDoc): CompileResult {
  return { ok: false, code: 'refused', reason: `unfaithful_family:${spec.type}` };
}

function compileLadderFamily(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (specGet(spec, 'n') !== undefined || specGet(spec, 'e') !== undefined) return refuseUnfaithful({ ...spec, type: 'frost' });
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
  chair: refuseUnfaithful,
  haworth: compileHaworth,
  lewis: refuseUnfaithful,
  vsepr: compileVsepr,
  complex: refuseUnfaithful,
  ladder: compileLadderFamily,
  mo: (s, c) => compileLadder(s, c, 'mo'),
  cft: compileCft,
  jablonski: compileJablonski,
  frost: refuseUnfaithful,
  mccabe: compileMccabe,
  ponchon: compilePonchon,
  sfd: compileSfd,
  beam: refuseUnfaithful,
  phasor: compilePhasor,
  smith: compileSmith,
  feynman: refuseUnfaithful,
  minkowski: refuseUnfaithful,
  ray: compileRay,
  field: compileField,
  bz: compileBz,
  'chem.smiles': compileChemSmiles,
  timing: compileTiming,
  mechanism: refuseUnfaithful,
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
  ecg: refuseUnfaithful,
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
  cell: refuseUnfaithful,
  membrane: compileMembrane,
  operon: compileOperon,
  restriction: refuseUnfaithful,
  rama: compileRama,
  pipeline: compilePipeline,
  datapath: compileDatapath,
  ring: compileRing,
  xfmr: compileXfmr,
  constel: refuseUnfaithful,
  eye: refuseUnfaithful,
  cmos: refuseUnfaithful,
  motor: compileMotor,
  ternary: refuseUnfaithful,
  openchan: refuseUnfaithful,
  sphere: compileSphere,
  isometric: refuseUnfaithful,
  topology: refuseUnfaithful,
  dq: compileDq,
  psych: refuseUnfaithful,
  newick: compileNewick,
  neuron: compileNeuron,
  pcr: compilePcr,
  anatomy: compileAnatomy,
  division: compileDivision,
  wall: compileWall,
  soil: compileSoil,
  column: refuseUnfaithful,
  rc: refuseUnfaithful,
  frame: compileFrame,
  pfd: compilePfd,
  knot: compileKnot,
  linkage: refuseUnfaithful,
  cam: compileCam,
  gear: refuseUnfaithful,
  ...FAMILY_COMPILERS,
};

export function leftoverRegistered(type: string): boolean {
  return Object.prototype.hasOwnProperty.call(TABLE, type);
}

export async function compileLeftover(type: string, spec: SpecDoc, ctx: CompileCtx): Promise<CompileResult> {
  const fn = Object.prototype.hasOwnProperty.call(TABLE, type) ? TABLE[type] : undefined;
  // This internal compatibility helper is not exposed by the catalog dispatcher.
  if (!fn) return compileGeneric(type, spec, ctx);
  // Caption is compatibility metadata; highlights are consumed by SceneBuilder.
  const checked = { ...spec, consumed: new Map([['caption', 1], ['highlight', 1]]) };
  const result = await fn(checked, ctx);
  if (!result.ok) return result;
  const unused = unconsumedDeclarations(checked);
  if (unused.length) return { ok: false, code: 'malformed', reason: `unconsumed declaration: ${unused.join(', ')}` };
  return result;
}

export { TABLE as LEFTOVER_TABLE };
