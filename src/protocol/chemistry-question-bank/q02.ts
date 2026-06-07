import { chemGraph, moEnergyDiagram } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q02: ChemistryQuestionDef = {
  id: 'q02',
  number: 2,
  topic: 'Chemical Bonding MO Theory',
  question:
    'Molecular orbital theory for diatomic species: (a) Construct MO energy diagrams for N₂, O₂, F₂, NO, and CO with bond orders and magnetic properties. (b) Draw AO overlap diagrams for σ and π MOs. (c) Explain the σ₂p/π₂p crossover between N₂ and O₂ via 2s–2p mixing. (d) Sketch photoelectron spectra of N₂ and O₂.',
  steps: [
    {
      title: 'MO diagram for N₂ (σ₂p below π₂p)',
      formula: '$$\\text{BO} = \\frac{1}{2}(N_b - N_a) = \\frac{1}{2}(10-4)=3$$',
      body: 'N₂ has 10 valence electrons filling σ₂s, σ*₂s, π₂p (4e), σ₂p. Bond order = 3, **diamagnetic** (all paired). The N≡N bond length is 110 pm, consistent with a triple bond.',
      diagram: moEnergyDiagram({ species: 'N₂', bondOrder: 3, paramagnetic: false, n2Ordering: true }),
    },
    {
      title: 'MO diagram for O₂ (π₂p below σ₂p)',
      formula: '$$\\text{BO} = \\frac{1}{2}(10-6)=2$$',
      body: 'O₂ has 12 valence electrons; the last 2 occupy **degenerate π*₂p** orbitals unpaired. Bond order = 2, **paramagnetic** (2 unpaired e⁻). This explains why liquid O₂ is attracted to a magnet.',
      diagram: moEnergyDiagram({ species: 'O₂', bondOrder: 2, paramagnetic: true, n2Ordering: false }),
    },
    {
      title: 'MO diagrams for F₂, NO, and CO',
      body: '**F₂**: 14 e⁻, BO = 1, diamagnetic. **NO**: 11 e⁻, BO = 2.5, paramagnetic (1 unpaired in π*₂p). **CO**: 10 e⁻, BO = 3, diamagnetic (isoelectronic with N₂). For NO, BO = ½(8−3) = 2.5.',
      diagram: moEnergyDiagram({ species: 'NO', bondOrder: 2.5, paramagnetic: true, n2Ordering: false }),
    },
    {
      title: 'AO overlap diagrams for σ and π molecular orbitals',
      body: 'σ₂s forms from head-on 2s overlap (constructive → bonding, destructive → σ*₂s). π₂p forms from sideways p-orbital overlap. σ₂p is head-on p_z overlap. **Constructive** interference builds electron density between nuclei; **destructive** forms nodes (antibonding).',
      diagram: chemGraph({
        xLabel: 'overlap',
        yLabel: 'ψ',
        annotations:
          '<text x="50" y="30" font-size="10" font-weight="bold">σ: head-on (+/−)</text>' +
          '<ellipse cx="100" cy="90" rx="20" ry="12" fill="#dbeafe" stroke="#1d4ed8"/>' +
          '<ellipse cx="130" cy="90" rx="20" ry="12" fill="#dbeafe" stroke="#1d4ed8"/>' +
          '<text x="200" y="30" font-size="10" font-weight="bold">π: sideways</text>' +
          '<ellipse cx="220" cy="80" rx="8" ry="25" fill="#fecaca" stroke="#dc2626"/>' +
          '<ellipse cx="250" cy="80" rx="8" ry="25" fill="#fecaca" stroke="#dc2626"/>',
      }),
    },
    {
      title: '2s–2p mixing crossover (N₂ vs O₂)',
      formula: '$$\\text{Mixing raises } \\sigma_{2p}, \\text{ lowers } \\pi_{2p} \\text{ relative energy}$$',
      body: 'In **N₂** (small Z), 2s–2p mixing is strong: σ₂p drops below π₂p. In **O₂** and heavier homonuclear diatomics, mixing is weaker and π₂p lies above σ₂p. With O atomic number Z=8, the larger 2s–2p gap reduces mixing by ≈2 eV.',
      diagram: chemGraph({
        xLabel: 'Z (2nd period)',
        yLabel: 'MO energy',
        curves: [
          { d: 'M 50 100 L 150 80', stroke: '#1d4ed8', label: 'σ₂p', labelPos: [120, 75] },
          { d: 'M 50 90 L 150 95', stroke: '#dc2626', label: 'π₂p', labelPos: [120, 100] },
        ],
        annotations:
          '<text x="60" y="30" font-size="10">N₂: σ₂p &lt; π₂p</text>' +
          '<text x="160" y="30" font-size="10">O₂: π₂p &lt; σ₂p</text>',
      }),
    },
    {
      title: 'Photoelectron spectra of N₂ and O₂',
      body: 'PES ionization energies map to MO energies. N₂ shows peaks for σ₂s, σ*₂s, π₂p, σ₂p (no π*₂p occupied). O₂ shows an additional low-IE peak from ejection of an electron in the **half-filled π*₂p** orbital (≈12 eV), confirming paramagnetism.',
      diagram: chemGraph({
        xLabel: 'IE (eV)',
        yLabel: 'Intensity',
        curves: [
          { d: 'M 50 130 L 80 60 L 90 130 L 130 80 L 140 130 L 180 70 L 190 130 L 230 90 L 240 130', stroke: '#1d4ed8', label: 'N₂', labelPos: [200, 55] },
          { d: 'M 50 130 L 70 100 L 80 130 L 120 75 L 130 130 L 160 65 L 170 130 L 210 85 L 220 130 L 250 95', stroke: '#dc2626', label: 'O₂', labelPos: [220, 80] },
        ],
        annotations: '<text x="55" y="25" font-size="9">π*₂p peak only in O₂</text>',
      }),
      takeaway: 'MO theory explains bond order, magnetism, and spectroscopic ionization energies consistently.',
    },
  ],
  solution:
    '**(a)** N₂ BO=3 diamagnetic; O₂ BO=2 paramagnetic; F₂ BO=1 diamagnetic; NO BO=2.5 paramagnetic; CO BO=3 diamagnetic. **(b)** σ from head-on overlap, π from sideways p overlap; antibonding from destructive interference. **(c)** 2s–2p mixing in N₂ inverts σ₂p and π₂p ordering vs O₂. **(d)** O₂ PES has extra peak from π*₂p electrons.',
  verifiedPatterns: ['BO=3', 'paramagnetic', 'diamagnetic', '2.5', 'π*₂p', '2s–2p mixing'],
  minDiagramSteps: 5,
};
