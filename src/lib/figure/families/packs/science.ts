import type { FamilyCompilers } from '../types';
import { compileBohr } from '../science/bohr';
import { compileEconfig } from '../science/econfig';
import { compileEnergy } from '../science/energy';
import { compilePedigree } from '../science/pedigree';
import { compileProbtree } from '../science/probtree';
import { compileProjectile } from '../science/projectile';

export const SCIENCE_COMPILERS: FamilyCompilers = {
  bohr: compileBohr,
  econfig: compileEconfig,
  energy: compileEnergy,
  pedigree: compilePedigree,
  probtree: compileProbtree,
  projectile: compileProjectile,
};
