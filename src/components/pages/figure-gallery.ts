/**
 * The figures the welcome page draws to show range. Each is a real spec, compiled on the page by
 * the same compiler the study panel uses; a test holds every one of them to compiling.
 */
import type { Diagram } from '@/src/protocol/types';

export interface GalleryFigure {
  id: string;
  /** What the figure is, in the reader's words. */
  label: string;
  /** The field it comes from. */
  field: string;
  diagram: Diagram;
}

export const GALLERY_FIGURES: readonly GalleryFigure[] = [
  {
    id: 'plot',
    label: 'Function plot',
    field: 'Math',
    diagram: {
      type: 'plot',
      content: 'fn: x^3 - 3*x\ndomain: -2.2 2.2\nxlabel: x\nylabel: y\neq: y=x^3-3x\npoint: -1,2\npoint: 1,-2',
    },
  },
  {
    id: 'circuit',
    label: 'Circuit schematic',
    field: 'Electrical',
    diagram: {
      type: 'circuit',
      content: 'std: ieee\nV1: n1 0 DC 12\nR1: n1 n2 2k\nR2: n2 0 4k\nRL: n2 0 4k\nprobe: V_out=n2\nhighlight: RL',
    },
  },
  {
    id: 'truss',
    label: 'Loaded truss',
    field: 'Mechanics',
    diagram: {
      type: 'truss',
      content: 'joints: A 0 0; B 4 0; C 2 3\nmembers: A-B, B-C, C-A\nsupports: pin@A, roller@B\nloads: F down@C',
    },
  },
  {
    id: 'graph',
    label: 'Weighted graph',
    field: 'Computer science',
    diagram: {
      type: 'graph',
      content:
        'node: A A\nnode: B B\nnode: C C\nnode: D D\nnode: E E\nedge: A B 4\nedge: A C 2\nedge: C B 1\nedge: B D 5\nedge: C D 8\nedge: D E 3\nrankdir: LR\nhighlight: A',
    },
  },
  {
    id: 'kmap',
    label: 'Karnaugh map',
    field: 'Digital logic',
    diagram: { type: 'kmap', content: 'vars: AB,CD\nminterms: 0,2,8,10' },
  },
  {
    id: 'newman',
    label: 'Newman projection',
    field: 'Chemistry',
    diagram: { type: 'newman', content: 'front: CH3,H,H\nback: CH3,H,H\ndeg: 60' },
  },
];
