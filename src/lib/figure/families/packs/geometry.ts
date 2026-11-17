import type { FamilyCompilers } from '../types';
import { compileCoord } from '../geometry/coord';
import { compileCurve } from '../geometry/curve';
import { compileSlopefield } from '../geometry/slopefield';
import { compileTriangle } from '../geometry/triangle';
import { compileUnitCircle } from '../geometry/unitcircle';
import { compileVectors } from '../geometry/vectors';

export const GEOMETRY_COMPILERS: FamilyCompilers = {
  coord: compileCoord,
  curve: compileCurve,
  slopefield: compileSlopefield,
  triangle: compileTriangle,
  unitcircle: compileUnitCircle,
  vectors: compileVectors,
};
