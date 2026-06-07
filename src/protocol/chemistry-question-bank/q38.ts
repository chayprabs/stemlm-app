import { chemGraph } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q38: ChemistryQuestionDef = {
  id: 'q38',
  number: 38,
  topic: 'Green Chemistry: Heck, Ring-Closing Metathesis, and Suzuki Coupling',
  question:
    'Green chemistry in modern synthesis: (a) Evaluate Heck reaction metrics and catalyst productivity. (b) Quantify ring-closing metathesis (RCM) efficiency. (c) Compare sustainability performance of Suzuki coupling under improved solvent/base systems.',
  steps: [
    {
      title: 'Heck reaction atom economy and isolated yield',
      formula:
        '$$AE=\\frac{M_{product}}{M_{aryl\\ halide}+M_{alkene}}\\times100=\\frac{208}{157+56}\\times100=97.7\\%$$',
      body: 'This Heck reaction uses aryl halide $157\\ \\text{g mol}^{-1}$ and alkene $56\\ \\text{g mol}^{-1}$ to form a $208\\ \\text{g mol}^{-1}$ coupled product with atom economy $97.7\\%$ (ignoring base/byproduct details in this simplified comparison). At $79\\%$ isolated yield, effective material capture is $0.977\\times0.79=0.772$ or $77.2\\%$.',
      diagram: chemGraph({
        xLabel: 'Heck metric',
        yLabel: 'percent',
        points: [
          { x: 110, y: 52, label: 'AE 97.7', fill: '#16a34a' },
          { x: 220, y: 92, label: 'effective 77.2', fill: '#1d4ed8' },
        ],
        annotations:
          '<text x="54" y="30" font-size="9">Pd-catalyzed Heck coupling benchmark</text>',
      }),
    },
    {
      title: 'Heck catalyst turnover number and turnover frequency',
      formula:
        '$$TON=\\frac{n_P}{n_{Pd}}=\\frac{3.6\\,mmol}{0.012\\,mmol}=300,\\quad TOF=\\frac{300}{2.5\\,h}=120\\,h^{-1}$$',
      body: 'For $3.6\\ \\text{mmol}$ product from $0.012\\ \\text{mmol}$ Pd catalyst, $TON=300$. If reaction time is $2.5\\ \\text{h}$, then $TOF=120\\ \\text{h}^{-1}$, indicating efficient catalyst utilization suitable for scale-up.',
      diagram: chemGraph({
        xLabel: 'catalyst metric',
        yLabel: 'value',
        points: [
          { x: 120, y: 76, label: 'TON 300', fill: '#1d4ed8' },
          { x: 220, y: 92, label: 'TOF 120 h^-1', fill: '#dc2626' },
        ],
        annotations:
          '<text x="54" y="32" font-size="9">catalyst productivity in Heck chemistry</text>',
      }),
    },
    {
      title: 'Ring-closing metathesis conversion and E-factor estimate',
      formula:
        '$$\\text{conversion}=\\frac{1.52}{1.80}\\times100=84.4\\%,\\quad E=\\frac{0.68}{1.52}=0.45$$',
      body: 'With $1.80\\ \\text{mmol}$ diene feed and $1.52\\ \\text{mmol}$ cyclized product, conversion is $\\text{conversion}=84.4\\%$. If process waste is $0.68\\ \\text{g}$ per $1.52\\ \\text{g}$ product, RCM E-factor is $E=0.45$, which is favorable for an organic ring-construction step.',
      diagram: chemGraph({
        xLabel: 'RCM metric',
        yLabel: 'value',
        points: [
          { x: 120, y: 84, label: 'conversion 84.4', fill: '#16a34a' },
          { x: 220, y: 112, label: 'E 0.45', fill: '#1d4ed8' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">ring-closing metathesis sustainability</text>',
      }),
    },
    {
      title: 'RCM selectivity and ring-size preference',
      formula:
        '$$S=\\frac{major}{minor}=\\frac{91}{9}=10.1,\\quad \\%major=\\frac{91}{100}\\times100=91\\%$$',
      body: 'If RCM gives a $91:9$ major/minor ring ratio, selectivity is $S=10.1:1$ and major product is $\\%major=91\\%$. Such high selectivity reduces separation burden and contributes directly to greener downstream processing.',
      diagram: chemGraph({
        xLabel: 'RCM product',
        yLabel: 'percent',
        points: [
          { x: 120, y: 52, label: 'major 91', fill: '#16a34a' },
          { x: 220, y: 126, label: 'minor 9', fill: '#dc2626' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">ring-size / alkene geometry control</text>',
      }),
    },
    {
      title: 'Suzuki coupling in aqueous solvent: PMI and base efficiency',
      formula:
        '$$PMI=\\frac{m_{input}}{m_{product}}=\\frac{5.4}{2.0}=2.70,\\quad \\eta_{base}=\\frac{2.0}{2.4}\\times100=83.3\\%$$',
      body: 'For Suzuki coupling conditions using total input mass $5.4\\ \\text{g}$ and product $2.0\\ \\text{g}$, PMI is $PMI=2.70$. If $2.4\\ \\text{mmol}$ base gives $2.0\\ \\text{mmol}$ product, base efficiency is $\\eta_{base}=83.3\\%$, showing improved utilization under aqueous or alcohol-water media.',
      diagram: chemGraph({
        xLabel: 'Suzuki metric',
        yLabel: 'value',
        points: [
          { x: 120, y: 95, label: 'PMI 2.70', fill: '#1d4ed8' },
          { x: 220, y: 84, label: 'base eff 83.3%', fill: '#16a34a' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">boronic acid coupling with greener media</text>',
      }),
    },
    {
      title: 'Cross-reaction green score comparison',
      formula:
        '$$G_{Heck}=77.2,\\quad G_{Suzuki}=82.9$$',
      body: 'Heck case with $(AE,yield,E,PMI)=(97.7,79,1.2,3.1)$ gives $G=0.35(97.7)+0.25(79)+0.20(83.3)+0.20(32.3)=77.2$. Suzuki case $(92,85,0.9,2.7)$ gives $G=0.35(92)+0.25(85)+0.20(111.1)+0.20(37.0)=82.9$, ranking Suzuki higher in this weighted framework.',
      diagram: chemGraph({
        xLabel: 'reaction class',
        yLabel: 'green score',
        points: [
          { x: 120, y: 84, label: 'Heck 77.2', fill: '#dc2626' },
          { x: 220, y: 72, label: 'Suzuki 82.9', fill: '#16a34a' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">Heck vs RCM vs Suzuki benchmark logic</text>',
      }),
      takeaway:
        'Green synthesis choices should combine catalyst productivity with atom economy, E-factor, PMI, and selectivity outcomes.',
    },
  ],
  solution:
    'Heck reaction, RCM, and Suzuki coupling can each be benchmarked with shared green chemistry metrics. Catalyst TON/TOF, selectivity, and mass-intensity metrics reveal practical sustainability differences, and weighted scoring often favors high-yield, low-waste Suzuki or optimized metathesis routes depending on process constraints.',
  verifiedPatterns: [
    'Heck reaction',
    'RCM',
    'Suzuki coupling',
    'atom economy',
    'TON',
    'E-factor',
    'PMI',
    'green chemistry',
  ],
  minDiagramSteps: 5,
};
