import type { FamilyCompilers } from '../types';
import { compileLogic } from '../cs/logic';
import { compileSequence } from '../cs/sequence';
import { compileTree } from '../cs/tree';
import { compileTruth } from '../cs/truth';

export const CS_COMPILERS: FamilyCompilers = {
  logic: compileLogic,
  sequence: compileSequence,
  tree: compileTree,
  truth: compileTruth,
};
