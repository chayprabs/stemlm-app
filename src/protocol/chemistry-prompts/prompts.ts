/** Chemistry exam prompts — questions only; solutions/diagrams come from Gemini at runtime. */
import type { ChemistryPromptDef } from './types';

export const CHEMISTRY_PROMPTS: ChemistryPromptDef[] = [
  {
    "id": "q01",
    "number": 1,
    "topic": "Atomic Structure and Orbital Theory",
    "question": "Atomic structure and orbital theory: (a) Draw a fully labelled hydrogen atom emission spectrum energy level diagram (n=1–5) marking Lyman, Balmer, and Paschen series. (b) Sketch radial probability P(r) for 2s and 2p orbitals; draw 3D boundary surfaces. (c) Draw all five 3d orbital boundary surfaces. (d) Explain penetration and shielding for 3s vs 3p electrons in multi-electron atoms with a diagram."
  },
  {
    "id": "q02",
    "number": 2,
    "topic": "Chemical Bonding MO Theory",
    "question": "Molecular orbital theory for diatomic species: (a) Construct MO energy diagrams for N₂, O₂, F₂, NO, and CO with bond orders and magnetic properties. (b) Draw AO overlap diagrams for σ and π MOs. (c) Explain the σ₂p/π₂p crossover between N₂ and O₂ via 2s–2p mixing. (d) Sketch photoelectron spectra of N₂ and O₂."
  },
  {
    "id": "q03",
    "number": 3,
    "topic": "VSEPR and Hybridisation",
    "question": "VSEPR and hybridisation analysis with molecular orbital language where relevant: (a) Determine shapes for PCl5, SF4, ClF3, XeF4, IF5, XeF2, SO3, and ICl4⁻ using steric number and electron-domain geometry. (b) Compare SF4 vs XeF4 bond angles and polarity. (c) Explain CO3²⁻ resonance and average bond order. (d) Justify PCl5 as sp3d hybridisation."
  },
  {
    "id": "q04",
    "number": 4,
    "topic": "Chemical Thermodynamics",
    "question": "Thermodynamics and energetics: (a) Interpret a P-V diagram containing isothermal, adiabatic, isobaric, and isochoric paths and compare work terms. (b) Use a Born-Haber cycle to estimate lattice enthalpy of MgCl2. (c) Analyze Gibbs free energy G versus reaction coordinate for four ΔH/ΔS sign combinations. (d) Use a T-S Carnot cycle to compute efficiency and net work."
  },
  {
    "id": "q05",
    "number": 5,
    "topic": "Phase Behavior and Real Gas Models",
    "question": "Phase diagrams and gas-distribution thermodynamics: (a) Interpret an overlaid water and CO2 phase diagram (triple point, critical point, and 1 atm paths). (b) Use Maxwell-Boltzmann distributions to compare most probable, mean, and rms speeds at different temperatures. (c) Analyze compressibility factor Z vs pressure to diagnose attractive and repulsive intermolecular regimes."
  },
  {
    "id": "q06",
    "number": 6,
    "topic": "Periodic Table Trends",
    "question": "Periodic table trends: (a) Draw periodic trend arrows for atomic radius and first ionization energy across periods and down groups. (b) Explain the Na/Mg/Al first ionization energy pattern with a bar graph. (c) Discuss the diagonal relationship between Li and Mg with quantitative support. (d) Compare lattice structures and coordination for NaCl, CsCl, ZnS, and CaF2."
  },
  {
    "id": "q07",
    "number": 7,
    "topic": "s-Block Chemistry",
    "question": "s-Block chemistry: (a) Draw and explain the NaCl unit cell. (b) Compare alkali metal oxides Li2O, Na2O2, and KO2 with oxidation-state and stoichiometric arguments. (c) Draw Grignard reagent RMgX structure and discuss preparation/reactivity. (d) Plot melting point versus atomic number for alkali metals and interpret the trend."
  },
  {
    "id": "q08",
    "number": 8,
    "topic": "Stereochemistry",
    "question": "Stereochemistry: (a) Determine all stereoisomers of 2-bromo-3-chlorobutane. (b) Draw tartaric acid Fischer projections and identify meso/enantiomeric forms. (c) Draw butane Newman projections and correlate with an energy profile. (d) Explain cyclohexane conformations and axial/equatorial preference."
  },
  {
    "id": "q09",
    "number": 9,
    "topic": "Nucleophilic Substitution (SN1 and SN2)",
    "question": "Nucleophilic substitution mechanisms: (a) Analyze SN1/SN2 competition for 2-bromobutane with NaOH. (b) Draw and explain the steric-hindrance transition state for SN2. (c) Explain solvolysis of (R)-3-chloro-3-methylhexane. (d) Compare SN1 and SN2 energy profiles and stereochemical outcomes."
  },
  {
    "id": "q10",
    "number": 10,
    "topic": "Elimination Mechanisms (E1, E2, and E1cb)",
    "question": "Organic chemistry elimination mechanisms: (a) Compare E1 and E2 pathways for 2-bromo-2-methylbutane under different conditions. (b) Use a Newman projection to show anti-periplanar geometry for E2. (c) Explain an E1cb pathway for 2-fluoroacetaldehyde under basic conditions."
  },
  {
    "id": "q11",
    "number": 11,
    "topic": "Chemical Kinetics",
    "question": "Chemical reaction kinetics in physical chemistry: (a) Analyze N2O5 molecule decomposition concentration-time and first-order linear plots. (b) Use a Jablonski mechanism to discuss photophysical pathways and quantum yield. (c) Extract activation energy from an Arrhenius plot for a catalyzed reaction. (d) Apply Michaelis-Menten and Lineweaver-Burk kinetics to enzyme-catalyzed rates."
  },
  {
    "id": "q12",
    "number": 12,
    "topic": "Electrochemistry",
    "question": "Electrochemistry and redox chemistry: (a) Evaluate a Daniell galvanic cell and apply the Nernst equation. (b) Calculate products in brine electrolysis using Faraday law. (c) Interpret polarisation curves with Tafel kinetics. (d) Use the electrochemical series to predict displacement reactions and spontaneity."
  },
  {
    "id": "q13",
    "number": 13,
    "topic": "Chemical Equilibrium",
    "question": "Chemical equilibrium in inorganic and organic chemistry: (a) Analyze Haber process equilibrium constant and pressure effects. (b) Quantify Fischer esterification equilibrium and mechanism for carboxylic acid plus alcohol. (c) Interpret solubility curves and common-ion equilibrium using Ksp."
  },
  {
    "id": "q14",
    "number": 14,
    "topic": "Spectroscopy UV-Vis IR",
    "question": "Chemical spectroscopy using IR spectrum and UV-Vis methods: (a) assign functional-group bands for ethanol, acetone, acetic acid, and benzene. (b) quantify UV-Vis conjugation shifts with Beer-Lambert law. (c) explain Franck-Condon vibronic intensity and Stokes shift using a Jablonski picture."
  },
  {
    "id": "q15",
    "number": 15,
    "topic": "Carbonyl Chemistry",
    "question": "Organic chemistry of carbonyl compounds: (a) analyze HCN addition to aldehydes and cyanohydrin equilibrium. (b) work through aldol condensation and Claisen condensation energetics and yields. (c) assign proton NMR spectra for carbonyl-containing products."
  },
  {
    "id": "q16",
    "number": 16,
    "topic": "Coordination Chemistry Bonding",
    "question": "Coordination chemistry bonding: (a) Compare [Fe(CN)6]4- and [Fe(H2O)6]2+ using crystal field theory. (b) Draw octahedral, tetrahedral, and square-planar splitting diagrams. (c) Explain ligand strength using the spectrochemical series and connect it to color and magnetism."
  },
  {
    "id": "q17",
    "number": 17,
    "topic": "Coordination Isomerism",
    "question": "Coordination isomerism: (a) Analyze cis/trans forms of [Co(NH3)4Cl2]+. (b) Enumerate isomers of Cr(en)(ox)Cl2. (c) Compare cisplatin and transplatin geometries/reactivity. (d) Apply EAN and 18-electron counting to Ni(CO)4."
  },
  {
    "id": "q18",
    "number": 18,
    "topic": "p-Block Chemistry (Groups 15-17)",
    "question": "p-block chemistry for Groups 15-17: (a) Compare oxoacid structures, acid strength, and resonance. (b) Use molecular orbital analysis for O2, O2+, O2-, and O2^2-. (c) Analyze interhalogen bonding and VSEPR geometry for ClF, ClF3, ClF5, and IF7."
  },
  {
    "id": "q19",
    "number": 19,
    "topic": "d-Block Transition Metals",
    "question": "d-block transition metals: (a) Explain first ionization-energy trends from Sc to Zn. (b) Relate d-d transitions to observed colours using a colour-wheel idea. (c) Interpret manganese redox stability using a Frost diagram."
  },
  {
    "id": "q20",
    "number": 20,
    "topic": "Aromatic Chemistry",
    "question": "Organic chemistry of aromatic compounds: (a) Explain electrophilic aromatic substitution nitration and halogenation of benzene with Lewis-acid catalyst reagents. (b) Quantify directing effects and Hammett correlations. (c) Compare alpha and beta substitution in naphthalene."
  },
  {
    "id": "q21",
    "number": 21,
    "topic": "Quantum Chemistry: Particle in a Box and Molecular Potentials",
    "question": "Physical chemistry quantum analysis: (a) Solve particle-in-a-box quantized energies and node counts. (b) Compare infinite square-well, harmonic, and Morse potentials. (c) Analyze hydrogen atom level n=3 and allowed transitions. (d) Explain vibrational anharmonicity with a Morse potential diagram."
  },
  {
    "id": "q22",
    "number": 22,
    "topic": "Advanced NMR Spectroscopy: 1H, Coupling Trees, DEPT, and COSY",
    "question": "Advanced NMR spectroscopy: (a) Interpret 1H NMR data for substituted organic compounds. (b) Construct coupling trees and extract J values. (c) Use DEPT spectra to classify CH, CH2, and CH3 carbons. (d) Use COSY cross-peaks to build proton connectivities."
  },
  {
    "id": "q23",
    "number": 23,
    "topic": "Mass Spectrometry and IR: Ketones, Carboxylic Acids, and Alkanes",
    "question": "Mass spectrometry and IR spectroscopy: (a) Analyze EI-MS fragmentation for 2-pentanone. (b) Explain the acetic acid IR profile including hydrogen-bonded dimer effects. (c) Assign major n-hexane fragment ions and rationalize peak intensities."
  },
  {
    "id": "q24",
    "number": 24,
    "topic": "Statistical Thermodynamics: Boltzmann, Partition Functions, and Heat Capacity",
    "question": "Physical chemistry statistical thermodynamics: (a) Use Boltzmann distributions for level populations. (b) Analyze a two-level system and temperature dependence. (c) Build partition-function expressions and obtain thermodynamic observables. (d) Explain heat-capacity variation with temperature."
  },
  {
    "id": "q25",
    "number": 25,
    "topic": "Surface Chemistry: Adsorption Isotherms and Heterogeneous Catalysis",
    "question": "Physical chemistry surface chemistry: (a) Derive and interpret the Langmuir isotherm. (b) Explain adsorption, surface reaction, and desorption in heterogeneous catalysis. (c) Compare catalysed and uncatalysed reaction-coordinate profiles."
  },
  {
    "id": "q26",
    "number": 26,
    "topic": "Group Theory: Point Groups and Character Tables",
    "question": "Group theory in chemistry: (a) Assign point groups for H2O, NH3, BF3, PCl5, SF6, and ferrocene. (b) Construct and use symmetry operations to classify representations. (c) Interpret key entries of a PtCl4 character table for spectroscopy."
  },
  {
    "id": "q27",
    "number": 27,
    "topic": "Organometallic Chemistry: Ferrocene, CO Backbonding, and Monsanto Process",
    "question": "Organometallic chemistry: (a) Compare ferrocene conformations and electron counting. (b) Explain synergic sigma donation and pi backbonding in metal carbonyls. (c) Outline the Monsanto acetic acid process and identify key catalytic steps."
  },
  {
    "id": "q28",
    "number": 28,
    "topic": "Bioinorganic Chemistry: Hemoglobin, Oxygen Curves, and Carbonic Anhydrase",
    "question": "Bioinorganic chemistry: (a) Explain cooperative O2 binding by hemoglobin. (b) Compare oxygen dissociation curves for myoglobin, adult Hb, and fetal Hb. (c) Describe carbonic anhydrase mechanism in CO2 transport and acid-base balance."
  },
  {
    "id": "q29",
    "number": 29,
    "topic": "Lanthanides and Actinides: Contraction, Structure, and 4f vs 5f Behavior",
    "question": "f-block chemistry: (a) Explain lanthanide contraction and its periodic consequences. (b) Describe UO2 crystal structure. (c) Compare 4f and 5f orbital extension and resulting bonding behavior in lanthanides versus actinides."
  },
  {
    "id": "q30",
    "number": 30,
    "topic": "Pericyclic Reactions and Frontier Molecular Orbitals",
    "question": "Pericyclic chemistry with frontier orbitals: (a) Explain Diels-Alder orbital interactions and stereoselectivity. (b) Apply Woodward-Hoffmann orbital-symmetry rules. (c) Predict electrocyclic and sigmatropic outcomes under thermal or photochemical conditions."
  },
  {
    "id": "q31",
    "number": 31,
    "topic": "Retrosynthesis: Prostaglandin, Ibuprofen, and Hajos-Parrish Ketone",
    "question": "Advanced organic chemistry retrosynthesis and reaction design: (a) Propose a convergent retrosynthesis for a prostaglandin molecule using strategic disconnections and reagent logic. (b) Analyze key catalyst and green-metric data in industrial ibuprofen synthesis. (c) Explain how the Hajos-Parrish ketone enables stereocontrolled cyclization in synthesis planning."
  },
  {
    "id": "q32",
    "number": 32,
    "topic": "Asymmetric Synthesis: Cram/Felkin-Anh and Sharpless Reactions",
    "question": "Asymmetric synthesis in advanced organic chemistry reaction mechanisms: (a) Compare Cram and Felkin-Anh predictions for nucleophilic addition to chiral carbonyl compounds. (b) Apply Sharpless epoxidation catalyst and reagent stereochemical rules quantitatively. (c) Evaluate Sharpless dihydroxylation selectivity and enantioinduction for enantiomer control."
  },
  {
    "id": "q33",
    "number": 33,
    "topic": "Natural Product Biosynthesis: Cholesterol, Morphine, and Polyketides",
    "question": "Natural product biosynthesis: (a) Quantify key carbon-flow and reducing-equivalent steps in the cholesterol pathway. (b) Analyze major branch points in morphine biosynthesis. (c) Evaluate chain-extension arithmetic and reduction patterns in polyketide assembly."
  },
  {
    "id": "q34",
    "number": 34,
    "topic": "Heterocyclic Chemistry: Aromaticity, NAS, Fischer Indole, and Tautomers",
    "question": "Heterocyclic organic chemistry: (a) Compare aromatic electron counting in pyridine and pyrrole molecules. (b) Analyze nucleophilic aromatic substitution on activated pyridine with explicit reagent effects. (c) Explain Fischer indole synthesis as a chemical reaction with quantitative selectivity. (d) Evaluate nucleobase tautomer populations and mispair risk."
  },
  {
    "id": "q35",
    "number": 35,
    "topic": "Polymer Chemistry: Radical Styrene, Anionic SBS, and Grubbs ROMP",
    "question": "Polymer chemistry synthesis design: (a) Quantify radical polymerization of styrene. (b) Analyze living anionic synthesis of SBS triblock copolymers. (c) Evaluate catalyst turnover and molecular metrics in Grubbs-catalyzed ROMP."
  },
  {
    "id": "q36",
    "number": 36,
    "topic": "Medicinal Chemistry: Aspirin, Penicillin, and Lipinski Analysis",
    "question": "Medicinal organic chemistry quantitative analysis: (a) Evaluate aspirin synthesis as a chemical reaction and COX inhibition data. (b) Analyze penicillin acylation mechanism, catalyst-like enzyme behavior, and resistance effects. (c) Use Lipinski criteria in a radar-style scoring framework for lead assessment."
  },
  {
    "id": "q37",
    "number": 37,
    "topic": "Physical Organic Chemistry: Hammett, More O'Ferrall-Jencks, and Bronsted",
    "question": "Physical organic chemistry reaction analysis: (a) Use Hammett correlations to quantify substituent effects in an organic reaction. (b) Interpret reaction pathways on a More O'Ferrall-Jencks surface for molecular bond changes. (c) Apply Bronsted correlations to leaving-group dependence and infer mechanism shifts in chemical reactions."
  },
  {
    "id": "q38",
    "number": 38,
    "topic": "Green Chemistry: Heck, Ring-Closing Metathesis, and Suzuki Coupling",
    "question": "Green chemistry in modern synthesis: (a) Evaluate Heck reaction metrics and catalyst productivity. (b) Quantify ring-closing metathesis (RCM) efficiency. (c) Compare sustainability performance of Suzuki coupling under improved solvent/base systems."
  },
  {
    "id": "q39",
    "number": 39,
    "topic": "Photochemistry: Jablonski Analysis, [2+2] Cycloaddition, and Norrish Reactions",
    "question": "Photochemistry problem set: (a) Interpret Jablonski-state kinetics quantitatively. (b) Analyze photochemical [2+2] cycloaddition efficiency. (c) Compare Norrish Type I and Norrish Type II pathways using quantum yields and product ratios."
  },
  {
    "id": "q40",
    "number": 40,
    "topic": "Supramolecular Chemistry: Crown Ethers, Cryptands, Fujita Cages, and DNA H-Bonds",
    "question": "Supramolecular chemistry analysis: (a) Quantify ion binding by crown ethers and cryptands. (b) Evaluate stoichiometry and stability in Fujita self-assembled cages. (c) Use hydrogen-bond energetics to analyze DNA base pairing and host-guest cooperativity."
  },
  {
    "id": "q41",
    "number": 41,
    "topic": "Computational Chemistry: PES, Huckel vs Ab Initio, and Basis Functions",
    "question": "Computational chemistry: (a) Draw and interpret the potential energy surface for the H + H2 exchange reaction. (b) Compare Huckel and ab initio approaches for pi systems. (c) Explain basis-function quality (minimal vs split-valence vs polarized) and quantify its effect on computed energies."
  },
  {
    "id": "q42",
    "number": 42,
    "topic": "Electroanalytical Chemistry: CV, Randles-Sevcik, and Nyquist Analysis",
    "question": "Electroanalytical chemistry: (a) Distinguish reversible and irreversible cyclic voltammograms. (b) Use Randles-Sevcik to compute peak current. (c) Interpret Nyquist plots to obtain solution and charge-transfer resistances and comment on diffusion control."
  },
  {
    "id": "q43",
    "number": 43,
    "topic": "Metal-Metal Bonds: Re2Cl8, Wade-Mingos Boranes, and Fe3(CO)12",
    "question": "Metal cluster chemistry: (a) Explain the Re2Cl8 quadruple bond using MO occupancy. (b) Apply Wade-Mingos rules to classify boranes. (c) Analyze electron counting and bonding in Fe3(CO)12 with supporting spectroscopic indicators."
  },
  {
    "id": "q44",
    "number": 44,
    "topic": "Solid State Chemistry: Crystal Packing, Band Structure, and XRD",
    "question": "Solid-state chemistry: (a) Compare sc, bcc, fcc, and hcp structures using coordination and packing arguments. (b) Relate crystal structure to electronic band structure. (c) Use Debye-Scherrer and Bragg methods to extract crystallite and lattice parameters from XRD data."
  },
  {
    "id": "q45",
    "number": 45,
    "topic": "Environmental and Industrial Chemistry: Ozone, Catalytic Converters, Contact Process",
    "question": "Environmental and industrial chemistry: (a) Quantify ozone formation and catalytic destruction cycles. (b) Analyze catalytic converter performance for CO, NOx, and hydrocarbons. (c) Perform equilibrium and rate calculations for the Contact process (SO2 to SO3)."
  },
  {
    "id": "q46",
    "number": 46,
    "topic": "Photovoltaics: p-n Junction Solar Cells and Perovskite MAPbI3",
    "question": "Photovoltaics: (a) Derive key performance relations for a p-n junction solar cell. (b) Compute efficiency from Voc, Jsc, and fill factor. (c) Explain why perovskite MAPbI3 is effective and perform simple optical/electronic calculations."
  },
  {
    "id": "q47",
    "number": 47,
    "topic": "Nuclear Chemistry: Nuclides, Binding Energy, and U-235 Fission",
    "question": "Nuclear chemistry: (a) Interpret the chart of nuclides and neutron-to-proton trends. (b) Compute binding energy from mass defect. (c) Quantify U-235 fission energetics and simple reactor multiplication metrics."
  },
  {
    "id": "q48",
    "number": 48,
    "topic": "Colloid Science: Electrical Double Layer, CMC, and DLVO",
    "question": "Colloid science: (a) Quantify electrical double-layer thickness and zeta potential effects. (b) Determine surfactant CMC from experimental trends. (c) Apply DLVO theory to predict aggregation stability."
  },
  {
    "id": "q49",
    "number": 49,
    "topic": "Reaction Engineering: PFR vs CSTR, Conversion-Temperature, and RTD",
    "question": "Chemical reaction engineering and kinetics: (a) Compare PFR and CSTR sizing for a first-order reaction. (b) Analyze conversion-temperature behavior for an exothermic system with Arrhenius rate constants. (c) Interpret RTD curves and calculate mean residence metrics."
  },
  {
    "id": "q50",
    "number": 50,
    "topic": "Vitamin B12 Integrated: Structure, Spectroscopy, Mechanism, Biosynthesis, and Assay",
    "question": "Integrated vitamin B12 chemistry: (a) Explain cyanocobalamin structure and cobalt coordination. (b) Quantify UV-Vis concentration by Beer-Lambert law. (c) Analyze AdoB12 radical mechanism energetics. (d) Summarize biosynthesis logic and perform a yield estimate. (e) Calculate concentration from a competitive RIA assay."
  }
] as ChemistryPromptDef[];

export function getChemistryPromptByNumber(n: number): ChemistryPromptDef | undefined {
  return CHEMISTRY_PROMPTS.find((q) => q.number === n);
}
