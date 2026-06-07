import {
  membraneFluidMosaicDiagram,
  membraneTransportDiagram,
  rbcOsmosisDiagram,
} from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q02: BiologyQuestionDef = {
  id: 'q02',
  number: 2,
  topic: 'Membrane Fluid Mosaic and Osmosis in RBCs',
  question:
    'Explain the fluid mosaic model of membranes, classify membrane transport mechanisms, and predict red blood cell behavior in 0.2% and 2% NaCl solutions relative to isotonic conditions.',
  steps: [
    {
      title: 'Describe the fluid mosaic membrane architecture',
      body: 'The plasma membrane is a phospholipid bilayer with embedded proteins, cholesterol, and external glycoconjugates. Lateral diffusion supports membrane fluidity, while cholesterol buffers fluidity across temperature changes.',
      diagram: membraneFluidMosaicDiagram(),
    },
    {
      title: 'Separate passive and active transport modes',
      body: 'Simple diffusion and facilitated diffusion are passive (down electrochemical gradients), while active transport moves solutes uphill using ATP or ion gradients. Example: GLUT transporters are passive, Na+/K+ ATPase is primary active transport.',
      diagram: membraneTransportDiagram(),
    },
    {
      title: 'Convert NaCl percentages into molarity and osmolarity',
      formula:
        '$$0.2\\%\\,\\text{NaCl}=2\\,\\text{g/L}\\Rightarrow M=\\frac{2}{58.5}=0.034\\,\\text{M},\\;\\text{osm}\\approx 2M=0.068\\,\\text{Osm}$$\n$$2\\%\\,\\text{NaCl}=20\\,\\text{g/L}\\Rightarrow M=\\frac{20}{58.5}=0.342\\,\\text{M},\\;\\text{osm}\\approx 0.684\\,\\text{Osm}$$',
      body: 'For reference, 0.9% NaCl is 9 g/L, so M=9/58.5=0.154 M and osmolarity about 0.308 Osm (near isotonic plasma). Therefore 0.2% is strongly hypotonic, while 2% is strongly hypertonic to RBC cytosol.',
    },
    {
      title: 'Apply water potential logic to RBC outcomes',
      formula:
        '$$\\pi=iCRT\\quad (i\\approx 2\\;\\text{for NaCl})$$',
      body: 'At the same T and R, osmotic pressure is proportional to osmolarity. Since 0.068 Osm < 0.308 Osm, water enters RBCs in 0.2% NaCl causing swelling and possible hemolysis. Since 0.684 Osm > 0.308 Osm, water leaves RBCs in 2% NaCl causing crenation.',
      diagram: rbcOsmosisDiagram(),
    },
    {
      title: 'Connect membrane permeability to tonicity',
      body: 'Tonicity depends on effectively nonpenetrating solutes over biologically relevant timescales. Na+ and Cl- are effectively restricted in RBC membranes unless channels/transporters are active, so extracellular NaCl concentration dominates net osmosis.',
    },
    {
      title: 'State final predictions with correct terminology',
      body: 'RBC in 0.2% NaCl: hypotonic medium -> cell swells, may lyse. RBC in 2% NaCl: hypertonic medium -> cell shrinks/crenates. In 0.9% NaCl: isotonic -> biconcave shape maintained with no net long-term water flux.',
      takeaway:
        'Exam keyword pairing: hypotonic-swelling/hemolysis and hypertonic-crenation; always benchmark against about 0.9% NaCl for RBC isotonicity.',
    },
  ],
  solution:
    'Fluid mosaic membranes are dynamic phospholipid bilayers containing proteins and cholesterol. Passive transport includes simple/facilitated diffusion; active transport requires energy input. Using NaCl conversions: 0.2% = 2 g/L = 0.034 M (about 0.068 Osm), 0.9% = 0.154 M (about 0.308 Osm), and 2% = 20 g/L = 0.342 M (about 0.684 Osm). Thus 0.2% is hypotonic to RBCs (water influx, swelling/hemolysis), while 2% is hypertonic (water efflux, crenation).',
  verifiedPatterns: ['0.034', '0.342', '0.308', 'hypotonic', 'crenation', 'hemolysis'],
  minDiagramSteps: 3,
};
