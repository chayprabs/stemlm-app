import type { FamilyCompilers } from '../types';
import { compileChart } from '../stats/chart';
import { compileDist } from '../stats/dist';
import { compileNumberline } from '../stats/numberline';
import { compileVenn } from '../stats/venn';

export const STATS_COMPILERS: FamilyCompilers = {
  chart: compileChart,
  dist: compileDist,
  numberline: compileNumberline,
  venn: compileVenn,
};
