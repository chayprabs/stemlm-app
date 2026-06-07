import { irSpectrum, jablonskiDiagram, uvVisCurves } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q14: ChemistryQuestionDef = {
  id: 'q14',
  number: 14,
  topic: 'Spectroscopy UV-Vis IR',
  question:
    'Chemical spectroscopy using IR spectrum and UV-Vis methods: (a) assign functional-group bands for ethanol, acetone, acetic acid, and benzene. (b) quantify UV-Vis conjugation shifts with Beer-Lambert law. (c) explain Franck-Condon vibronic intensity and Stokes shift using a Jablonski picture.',
  steps: [
    {
      title: 'IR spectrum of ethanol: O-H and C-O signatures',
      formula: '$$E=h c \\tilde{\\nu}$$',
      body: 'In ethanol IR spectrum analysis, the broad O-H stretch appears near $3300\\,\\text{cm}^{-1}$ and C-O stretch near $1050\\,\\text{cm}^{-1}$. Using $\\tilde{\\nu}=3300\\,\\text{cm}^{-1}$, photon energy is $E=(6.626\\times10^{-34})(2.998\\times10^{10})(3300)=6.56\\times10^{-20}\\,\\text{J}$. Multiplying by $N_A$ gives molar vibration energy $6.56\\times10^{-20}\\times6.022\\times10^{23}=39.5\\,\\text{kJ mol}^{-1}$.',
      diagram: irSpectrum({
        title: 'Ethanol IR spectrum',
        peaks: [
          { x: 72, label: '3300 broad O-H' },
          { x: 176, label: '1050 C-O' },
        ],
      }),
    },
    {
      title: 'IR spectrum of acetone: strong carbonyl band',
      formula: '$$\\tilde{\\nu}=\\frac{1}{2\\pi c}\\sqrt{\\frac{k}{\\mu}}$$',
      body: 'For acetone, the C=O stretch is the diagnostic IR spectrum feature around $1715\\,\\text{cm}^{-1}$. Taking $k=1220\\,\\text{N m}^{-1}$ and reduced mass $\\mu=1.14\\times10^{-26}\\,\\text{kg}$ gives $\\tilde{\\nu}=\\frac{1}{2\\pi(2.998\\times10^{10})}\\sqrt{1220/(1.14\\times10^{-26})}=1.74\\times10^3\\,\\text{cm}^{-1}$, close to the observed carbonyl band.',
      diagram: irSpectrum({
        title: 'Acetone IR spectrum',
        peaks: [
          { x: 118, label: '1715 C=O' },
          { x: 198, label: '1360 CH3 bend' },
        ],
      }),
    },
    {
      title: 'IR spectrum of acetic acid: hydrogen-bonded carboxylic acid',
      formula: '$$\\Delta\\tilde{\\nu}=\\tilde{\\nu}_{\\text{free}}-\\tilde{\\nu}_{\\text{H-bonded}}$$',
      body: 'Acetic acid shows a very broad O-H envelope ($2500$-$3300\\,\\text{cm}^{-1}$) and a C=O near $1710\\,\\text{cm}^{-1}$. If free carbonyl appears at $1760\\,\\text{cm}^{-1}$ and hydrogen-bonded at $1710\\,\\text{cm}^{-1}$, then $\\Delta\\tilde{\\nu}=1760-1710=50\\,\\text{cm}^{-1}$. The red shift reflects hydrogen-bond weakening of the C=O bond force constant.',
      diagram: irSpectrum({
        title: 'Acetic acid IR spectrum',
        peaks: [
          { x: 70, label: '2500-3300 broad O-H' },
          { x: 120, label: '1710 C=O' },
        ],
      }),
    },
    {
      title: 'IR spectrum of benzene: aromatic ring fingerprint',
      formula: '$$\\mathrm{IHD}=\\frac{2C+2-H}{2}$$',
      body: 'For benzene, aromatic C-H stretch appears near $3030\\,\\text{cm}^{-1}$ and ring C=C bands near $1600\\,\\text{cm}^{-1}$ with out-of-plane modes around $700$-$900\\,\\text{cm}^{-1}$. Unsaturation count confirms aromaticity: with $C=6$ and $H=6$, $\\mathrm{IHD}=(2\\times6+2-6)/2=8/2=4$. That matches one ring plus three pi bonds.',
      diagram: irSpectrum({
        title: 'Benzene IR spectrum',
        peaks: [
          { x: 88, label: '3030 aromatic C-H' },
          { x: 132, label: '1600 C=C' },
          { x: 212, label: '750 oop bend' },
        ],
      }),
    },
    {
      title: 'UV-Vis conjugation trend and Beer-Lambert quantification',
      formula: '$$A=\\varepsilon l c$$',
      body: 'In UV-Vis, increased conjugation causes a bathochromic shift to longer wavelength. For a conjugated sample with absorbance $A=0.78$, path length $l=1.00\\,\\text{cm}$, and molar absorptivity $\\varepsilon=2.6\\times10^4\\,\\text{L mol}^{-1}\\text{cm}^{-1}$, concentration is $c=A/(\\varepsilon l)=0.78/(2.6\\times10^4\\times1.00)=3.0\\times10^{-5}\\,\\text{M}$.',
      diagram: uvVisCurves(),
    },
    {
      title: 'Franck-Condon principle and Stokes shift from spectra',
      formula:
        '$$\\Delta\\tilde{\\nu}=\\frac{1}{\\lambda_{\\text{abs}}}-\\frac{1}{\\lambda_{\\text{em}}}$$',
      body: 'Franck-Condon factors control vibronic intensity because electronic transitions are vertical on the nuclear timescale. With $\\lambda_{\\text{abs}}=350\\,\\text{nm}=3.50\\times10^{-5}\\,\\text{cm}$ and $\\lambda_{\\text{em}}=420\\,\\text{nm}=4.20\\times10^{-5}\\,\\text{cm}$, $\\Delta\\tilde{\\nu}=1/(3.50\\times10^{-5})-1/(4.20\\times10^{-5})=28571-23810=4761\\,\\text{cm}^{-1}$. This positive Stokes shift indicates relaxation before fluorescence.',
      diagram: jablonskiDiagram(),
      takeaway:
        'IR identifies functional groups, UV-Vis tracks conjugation and concentration, and Franck-Condon analysis explains vibronic envelopes and Stokes shifts.',
    },
  ],
  solution:
    'The IR spectrum assignments are: ethanol (broad O-H and C-O), acetone (strong C=O near $1715\\,\\text{cm}^{-1}$), acetic acid (broad carboxylic O-H plus shifted carbonyl), and benzene (aromatic C-H/C=C/fingerprint bands with $\\mathrm{IHD}=4$). UV-Vis data follow bathochromic shift with conjugation and Beer-Lambert gives $c=3.0\\times10^{-5}\\,\\text{M}$ for the given absorbance. Franck-Condon analysis with $350\\to420\\,\\text{nm}$ gives a Stokes shift of $4761\\,\\text{cm}^{-1}$.',
  verifiedPatterns: [
    'ethanol',
    'acetone',
    'acetic acid',
    'benzene',
    'IR spectrum',
    'UV-Vis',
    'bathochromic shift',
    'Franck-Condon',
    'Stokes shift',
  ],
  minDiagramSteps: 5,
};
