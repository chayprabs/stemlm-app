/** Every extension family's compiler. Loaded with the study panel, never on a bare chat page. */
import type { FamilyCompilers } from './types';
import { STATS_COMPILERS } from './packs/stats';
import { GEOMETRY_COMPILERS } from './packs/geometry';
import { CS_COMPILERS } from './packs/cs';
import { SCIENCE_COMPILERS } from './packs/science';

export const FAMILY_COMPILERS: FamilyCompilers = {
  ...STATS_COMPILERS,
  ...GEOMETRY_COMPILERS,
  ...CS_COMPILERS,
  ...SCIENCE_COMPILERS,
};
