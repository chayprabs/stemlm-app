import {
  hydrogenEnergyLevels,
  radialProbability2s2p,
  orbitals2s2p,
  orbitals3d,
  penetrationShielding,
} from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q01: ChemistryQuestionDef = {
  id: 'q01',
  number: 1,
  topic: 'Atomic Structure and Orbital Theory',
  question:
    'Atomic structure and orbital theory: (a) Draw a fully labelled hydrogen atom emission spectrum energy level diagram (n=1–5) marking Lyman, Balmer, and Paschen series. (b) Sketch radial probability P(r) for 2s and 2p orbitals; draw 3D boundary surfaces. (c) Draw all five 3d orbital boundary surfaces. (d) Explain penetration and shielding for 3s vs 3p electrons in multi-electron atoms with a diagram.',
  steps: [
    {
      title: 'Hydrogen energy levels n = 1 to 5',
      formula: '$$E_n = -\\frac{13.6\\,\\text{eV}}{n^2}$$',
      body: 'The hydrogen emission spectrum arises from electronic transitions between discrete principal levels. With $n=2$: $E_2=-13.6/4=-3.4$ eV; with $n=1$: $E_1=-13.6$ eV, so the Balmer $2\\to 1$ photon energy is $\\Delta E=10.2$ eV. The **Lyman** series ($n\\to 1$) lies in the UV; **Balmer** ($n\\to 2$) in visible; **Paschen** ($n\\to 3$) in the IR.',
      diagram: hydrogenEnergyLevels(),
    },
    {
      title: 'Radial probability distribution P(r) for 2s and 2p',
      formula: '$$P(r) = 4\\pi r^2 |R_{nl}(r)|^2$$',
      body: 'Both 2s and 2p share $n=2$ but differ in angular momentum. At $r=4a_0$, the 2s radial factor gives $P(4a_0)\\approx 0.02$ (past its radial node), while 2p peaks near $r=5a_0$ with $P(5a_0)\\approx 0.04$. The **2s** orbital has one **radial node**; **2p** has only an angular nodal plane.',
      diagram: radialProbability2s2p(),
    },
    {
      title: '3D boundary surfaces for 2s and 2p orbitals',
      body: 'The **2s** boundary is a spherical shell (no angular nodes). Each **2p** orbital ($2p_x$, $2p_y$, $2p_z$) has two lobes separated by a **nodal plane** through the nucleus. The lobes have opposite phases ($+$ and $-$).',
      diagram: orbitals2s2p(),
    },
    {
      title: 'Five 3d orbital boundary surfaces',
      body: 'The 3d subshell contains $d_{xy}$, $d_{xz}$, $d_{yz}$, $d_{x^2-y^2}$, and $d_{z^2}$. The first four are cloverleaf-shaped in the respective planes. **$d_{z^2}$** is unique: it has a torus in the $xy$-plane plus an axial lobe along $z$, giving distinct orientation compared to the other four.',
      diagram: orbitals3d(),
    },
    {
      title: 'Penetration and shielding: 3s vs 3p',
      formula: '$$Z_{\\text{eff}} = Z - \\sigma$$',
      body: 'In multi-electron atoms, **3s** electrons penetrate closer to the nucleus. For Na ($Z=11$), Slater rules give $\\sigma\\approx 10$ for 3s so $Z_{\\text{eff}}=11-10=1$; for 3p, $\\sigma\\approx 10.8$ so $Z_{\\text{eff}}\\approx 0.2$. Larger $Z_{\\text{eff}}$ for 3s means 3s electrons are **more tightly held** (lower energy) than 3p.',
      diagram: penetrationShielding(),
      takeaway:
        'Penetration increases $Z_{\\text{eff}}$; shielding by inner electrons lowers the effective nuclear charge felt by outer electrons.',
    },
  ],
  solution:
    '**(a)** Energy levels $E_n=-13.6/n^2$ eV for $n=1$–$5$; Lyman ($n\\to 1$, UV), Balmer ($n\\to 2$, visible), Paschen ($n\\to 3$, IR). **(b)** 2s has one radial node and larger most-probable $r$; 2p has a nodal plane and peaks closer in. **(c)** Five 3d orbitals: four cloverleaf types plus unique $d_{z^2}$ with torus + axial lobe. **(d)** 3s penetrates inner shells better → less shielding → lower energy than 3p.',
  verifiedPatterns: ['Lyman', 'Balmer', 'Paschen', 'radial node', 'd_{z^2}', '3s', 'shielding', 'Z_{\\text{eff}}'],
  minDiagramSteps: 5,
};
