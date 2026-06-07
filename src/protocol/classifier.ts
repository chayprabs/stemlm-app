/**
 * Lightweight client-side subject classifier.
 *
 * Used purely to pick ONE playbook to inject (token economy) — the model is
 * still told to re-classify and adapt if we guessed wrong, so a miss is never
 * fatal. Heuristic scoring over keyword/regex signals; ties resolve to the
 * higher-priority subject, and a weak signal falls back to General.
 */
import type { Subject } from './types';

interface Rule {
  subject: Subject;
  /** Weighted signals. */
  patterns: { re: RegExp; w: number }[];
}

const RULES: Rule[] = [
  {
    subject: 'CS',
    patterns: [
      // Strong, unambiguous CS signatures.
      { re: /\b(algorithm|algorithmic|big-?o|time complexity|space complexity|recursion|recursive|data structure|linked list|binary (search )?tree|bst\b|hash ?map|hash table|heap|stack|queue|graph traversal|bfs|dfs|dijkstra|dynamic programming|memoi[sz]ation|greedy|backtrack|binary search|merge sort|quick ?sort|sorting algorithm|time-?complexity|leetcode|pseudocode|state machine|finite automat|turing|np-?complete|regex|regular expression|compiler|operating system|deadlock|mutex|semaphore|concurrency|pointer|big o)\b/i, w: 3 },
      { re: /\b(python|java\b|javascript|typescript|c\+\+|c#|golang|\brust\b|kotlin|swift|sql\b|nosql|html|css|code|coding|program(ming)?|function|variable|loop|for ?loop|while ?loop|array|object|class|method|api\b|database|query|string|integer|boolean|compile|debug|runtime|stack overflow|binary)\b/i, w: 1 },
    ],
  },
  {
    subject: 'Electrical',
    patterns: [
      { re: /\b(circuit|resistor|capacitor|inductor|voltage|current|ohm'?s? law|ohm|kirchhoff|kvl|kcl|impedance|reactance|transistor|diode|op-?amp|operational amplifier|thevenin|norton|superposition|dependent source|current source|nodal analysis|mesh (analysis|current)|series and parallel|rc circuit|rl circuit|rlc|logic gate|boolean logic|truth table|flip-?flop|mosfet|bjt\b|amplifier|rectifier|capacitance|inductance|emf\b|label all nodes|hybrid[- ]?π|hybrid[- ]?pi|small[- ]signal|common[- ]emitter|emitter degeneration|voltage gain|bandwidth|phasor|admittance|bode|transfer function|laplace|fourier|z-?transform|s-?domain|ce amplifier|integrator oscillator|power flow|ybus|symmetrical fault|gauss-?seidel|newton-?raphson|per unit|pu\b|slack bus|pv bus|pq bus|wattmeter|power factor|three[- ]phase|line voltage|transformer|induction motor|synchronous machine|pwm|buck converter|boost converter|pid controller|nyquist|bode plot)\b/i, w: 3 },
      { re: /\b(electrical|electronics|ampere|amps?\b|watt|signal|frequency|waveform|electrical engineering)\b/i, w: 1 },
    ],
  },
  {
    subject: 'Chemistry',
    patterns: [
      { re: /\b(mole|molar(ity| mass)?|stoichiometr|chemical (reaction|equation)|balance the (equation|reaction)|equilibrium constant|\bke?q\b|\bph\b|\bpoh\b|acid|base|alkal|titration|buffer|enthalp|entrop|gibbs|oxidation|reduction|redox|half[- ]reaction|electron configuration|periodic (table|trend)|ideal gas law|avogadro|concentration|molecule|molecular|compound|reagent|reactant|product|catalyst|valence|covalent|ionic bond|electronegativ|lewis structure|functional group|organic chemistr(y)?|isomer|hybridi[sz]ation|empirical formula|atomic (structure|orbital)|molecular orbital|\bmo theory\b|emission spectrum|lyman|balmer|paschen|crystal field|coordination (complex|compound)|ligand|spectroscop|nmr|ir spectrum|uv[- ]vis|mass spectr|born[- ]haber|vsepr|electrochem|electroanalytical|cyclic voltammogram|randles[- ]?sevcik|nyquist|voltammetr|warburg|galvanic|daniell|haber process|grignard|alkali metal|lanthanide|actinide|pericyclic|retrosynth|polymeris|polymeriz|enzyme|biochem|porphyrin|cobalamin|vitamin b|elimination mechanism|\bE[12]\b|E1cb|dehydrohalogenation|newman projection|carbocation|zaitsev|anti[- ]periplanar|physical chemistr|quantum chemistr|particle[- ]in[- ]a[- ]box|morse potential|statistical thermodynam|partition[- ]function|boltzmann|maxwell[- ]bolt|heat[- ]capacit|schottky|surface chemistr|langmuir|adsorption|heterogeneous catalys|isotherm|turnover frequency|computational chemistr|huckel|ab initio|hartree[- ]fock|basis[- ]function|potential energy surface|sto[- ]3g|metal[- ]metal|quadruple bond|wade[- ]mingos|borane|carbonyl cluster|re2cl8|fe3\(co\)12|solid[- ]state|band structure|bragg|debye[- ]?scherrer|\bxrd\b|crystallite|crystal packing|\bfcc\b|\bbcc\b|\bhcp\b|environmental chemistr|industrial chemistr|ozone|chapman|catalytic converter|contact process|\bnox\b|photovoltaic|perovskite|mapbi3|solar cell|nuclear chemistr|nuclide|binding energy|mass defect|nuclear fission|chart of nuclides|u-235|colloid|dlvo|zeta potential|debye length|electrical double layer|\bcmc\b|micell|surfactant|reaction engineering|reaction kinetics|arrhenius|residence time|\brtd\b)\b/i, w: 3 },
      { re: /\b(h2o|co2|nacl|hcl|naoh|nh3|h2so4|ch4|\\ce|solution|solute|solvent|salt|gas\b)\b/i, w: 2 },
    ],
  },
  {
    subject: 'Biology',
    patterns: [
      {
        re: /\b(cells?|prokaryot\w*|eukaryot\w*|cellular|dna|rna|mrna|trna|protein|amino acids?|enzyme|substrate|mitosis|meiosis|photosynthesis|cellular respiration|glycolysis|krebs|genes?|genetic|alleles?|genotypes?|phenotypes?|chromosomes?|organisms?|ecosystems?|species|membrane|osmosis|diffusion|atp\b|punnett|heredity|inherit|dominant|recessive|evolution|natural selection|neurons?|synapse|hormones?|homeostasis|bacteria|viruses?|antibod(?:y|ies)|immune|tissues?|organs?|nucleus|ribosomes?|mitochondria?|chloroplasts?|endosymbios\w*|replication fork|telomerase|calvin cycle|mendelian|genetics|crassulacean|microbiology|gram[- ]stain|binary fission|antibiotic resistance|bacterial growth|peptidoglycan)\b/i,
        w: 3,
      },
      {
        re: /\b(histology|epithelial|connective tissue|cartilage|osteoblast|osteoclast|sarcomere|myelin|nephron|renal|kidney|glomerulus|dialysis|gfr\b|raas|angiotensin|aldosterone|adh\b|aquaporin|cardiac|ecg|respiratory|spirometry|fev1|fvc|hemoglobin|anemia|asthma|hemostasis|coagulation|lymphatic|placenta|menstrual|spermatogenesis|oogenesis|fertilisation|fertilization|embryogenesis|blastocyst|gastrulation|phylogen\w*|gel electrophoresis|western blot|elisa\b|flow cytometry|pcr\b|rt-pcr|sanger sequencing|sequence alignment|blast\b|hardy-?weinberg|lac operon|hpa axis|dicot|apoplast|symplast|xylem|phloem|stomatal|transpiration|photoperiodism|germination|kranz|cam plant|eutrophication|wetland|coral|zooxanthellae|microbiome|biofilm|quorum sensing|prion|epigenet\w*|histone|methylation|ipsc|gene therapy|pharmacogenomics|cyp450|oncogenes?|tumor suppressor|biomes?|biodiversity|shannon|inbreeding|effective population|mycology|hyphae|protist|plasmodium|malaria|histolog\w*|integumentary|immunolog\w*|virolog\w*|ecolog\w+|physiolog\w+)\b/i,
        w: 3,
      },
      { re: /\b(michaelis[- ]menten|vmax|\bkm\b|enzyme kinetics|competitive inhibitor|non[- ]competitive inhibitor)\b/i, w: 5 },
      { re: /\benzyme\b.*\b(activation energy|\bea\b|Δg|delta g)\b|\b(activation energy|\bea\b)\b.*\benzyme\b/i, w: 4 },
      { re: /\bactivation energy\b/i, w: 2 },
    ],
  },
  {
    subject: 'Civil',
    patterns: [
      { re: /\b(truss|beam|bending moment|bending moment diagram|\bbmd\b|shear force|shear force diagram|\bsfd\b|shear[- ]and[- ]moment|simply supported|reinforced concrete|structural (analysis|engineer)|foundation|soil mechanic|geotechnical|load[- ]bearing|cantilever|deflection|support reaction|pin support|roller support|distributed load|point load|column buckling|retaining wall)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Chemical',
    patterns: [
      { re: /\b(mass balance|energy balance|material balance|component balance|distillation|reactor design|cstr|pfr\b|reflux|process flow|flowsheet|heat exchanger|fugacity|raoult'?s? law|mass transfer|unit operation|control volume|reflux ratio|vapor[- ]liquid equilibrium|vle\b|absorption column|chemical engineering|mixer|mixing streams?|feed stream|outlet stream|mass flow|kg\/h|wt%|aqueous stream)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Mechanical',
    patterns: [
      { re: /\b(torque|moment of inertia|\bgear\b|gearbox|\bshaft\b|axial stress|normal stress|tensile stress|yield strength|steel bar|cross[- ]section|stress area|bending stress|shear stress|stress and strain|young'?s modulus|thermodynamic cycle|carnot|otto cycle|heat engine|refrigerat|fluid mechanics|bernoulli|reynolds|viscosity|factor of safety|linkage|cam shaft|cam follower|crank|piston|pulley system|mechanical advantage|vibration|natural frequency)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Physics',
    patterns: [
      { re: /\b(free[- ]body|projectile|kinematics?|newton'?s (first|second|third)? ?law|electric field|magnetic field|coulomb|gauss'?s? law|momentum|impulse|kinetic energy|potential energy|conservation of energy|refraction|reflection|snell'?s? law|lens|mirror|diffraction|interference|relativity|quantum|photon|wavelength|frequency|terminal velocity|incline(d plane)?|tension|normal force|centripetal|angular velocity|simple harmonic|pendulum|bethe|weizsaecker|weizsacker|binding energy per nucleon|nuclear physics|radioactive decay|blackbody|planck|stefan[- ]boltzmann|maxwell[- ]boltzmann)\b/i, w: 3 },
      { re: /\b(force|velocity|acceleration|energy|work|power|gravity|gravitational|mass\b|wave|optics?|joule|newton|friction|displacement|speed|distance|motion)\b/i, w: 1 },
    ],
  },
  {
    subject: 'Math',
    patterns: [
      { re: /\b(integral|integrate|integration|derivative|differentiate|differential|\blimit\b|matrix|matrices|determinant|eigen(value|vector)|vector space|linear algebra|probability|combinatorics?|permutation|factorial|series|sequence|summation|theorem|proof|prove\b|polynomial|quadratic|trigonometr|\bsine\b|cosine|tangent|logarithm|exponential|inequality|system of equations|complex number|set theory|modular arithmetic|geometry|triangle|circle|angle|fourier|laplace transform|ode\b|pde\b|jacobian|hessian|lagrange multiplier|convex|linear programming|group theory|ring theory|finite field|metric space|banach|hilbert|lebesgue|measure theory|generating function|recurrence relation|number theory|graph theory|numerical (method|analysis)|newton-?raphson|fixed point|interpolation|variance|expected value|stochastic|hypothesis test|confidence interval|regression|bayes|markov|binomial theorem|chinese remainder|gram-schmidt|singular value|orthogonal diagonal|quadratic form|divergence theorem|green'?s theorem|stokes|parseval|implicit (function|differentiation)|conservative field|surface integral|knapsack|inclusion-exclusion|cyclic group|symmetric group|boolean algebra|mathematical induction|countable|uncountable|normed space|vector calculus|prime ideal|quotient ring|discrete mathematics)\b/i, w: 3 },
      { re: /\b(equation|solve for|factor|simplify|calculate|evaluate|function|graph|slope|x\b|y\b)\b/i, w: 1 },
    ],
  },
];

/**
 * Priority used to break exact score ties (earlier = wins). Ordered most-
 * specific → most-generic so an engineering signature beats generic Physics/
 * Math when both fire on the same score.
 */
const PRIORITY: Subject[] = [
  'Chemical',
  'Civil',
  'Electrical',
  'Mechanical',
  'CS',
  'Chemistry',
  'Biology',
  'Physics',
  'Math',
  'General',
];

export function classifySubject(question: string): Subject {
  const text = question || '';
  // Chemistry-bank phrasing: "… chemistry:" topic lines and named chem subfields.
  if (
    (/\b([a-z][\w -]{0,48}chemistry)\b/i.test(text) ||
      /\b(physical chemistry|quantum chemistry|statistical thermodynamics|chemical kinetics|reaction engineering|electrochem\w*|biochem\w*|colloid|dlvo|cmc|photovoltaic|perovskite|solar cell|p[- ]n junction|electroanalytical|huckel|ab initio|schottky|hammett|bronsted|lipinski|ferrocene|born[- ]haber|grignard|titration|stoichiometr)\b/i.test(
        text,
      )) &&
    !/\b(chemical engineering|mass balance on|distillation column|control volume balance|mixer stream|kg\/h|wt%|blackbody|planck|stefan|maxwell[- ]boltzmann|nuclear physics|radioactive decay|binding energy per nucleon|photosynthesis|chloroplast|calvin cycle|z-?scheme|psii|psi\b|chemiosmotic|cellular respiration|glycolysis|krebs cycle|enzyme kinetic|michaelis)\b/i.test(
      text,
    )
  ) {
    return 'Chemistry';
  }

  const CHEMISTRY_EXAM_OVERRIDE =
    /\b(physical chemistry|quantum chemistry|reaction engineering|born[- ]haber|grignard|stoichiometr|titration curve|electroanalytical|colloid|dlvo|langmuir isotherm|huckel|ab initio|hartree[- ]fock)\b/i;

  if (
    !CHEMISTRY_EXAM_OVERRIDE.test(text) &&
    (/\b(biology|physiology|ecology|histology|immunology|virology|genetics|embryogenesis|gametogenesis|microbiome|epigenetics|proteomics|pharmacogenomics|nephron|phylogenetic|gel electrophoresis|western blot|elisa\b|flow cytometry|hardy-?weinberg|punnett|mendel|lac operon|calvin cycle|krebs|glycolysis|endosymbios\w*|homeostasis|speciation|allopatric|crispr|reverse transcriptase|telomerase|sanger sequencing|mrna vaccine|herd immunity|mhc\b|clonal selection|biofilm|quorum sensing|prions?|zooxanthellae|eutrophication|kranz anatomy|cam plant|xylem|phloem|stomatal|photoperiodism|dicot root|hpa axis|prokaryot\w*|eukaryot\w*|mitochondria|chloroplasts?)\b/i.test(
      text,
    ) ||
      /^In (an integrative biology|an advanced integrative biology|histology|renal physiology|cardiovascular biology|respiratory physiology|human digestive biology|synaptic neurobiology|population ecology|community ecology|ecosystem ecology|evolutionary biology|evolutionary speciation biology|microbiology|virology|immunology|adaptive immunity|molecular genetics|gene regulation|molecular biology|genome engineering|cell signalling biology|developmental biology|neurobiology|reproductive biology|plant physiology|seed biology|mycology|protist biology|aquatic ecology|wetland biology|marine biology|invasion ecology|conservation biology|epigenetics|RNA biology|molecular diagnostics|proteomics|cell biology technology|microscopy|stem cell biology|gene therapy|pharmacogenomics|antimicrobial biology|microbial ecology|microbiome biology|molecular pathology|synthetic biology|systems biology|cardiovascular-renal integration|nephrology|hematology|clinical physiology|endocrinology|reproductive endocrinology|gametogenesis|developmental physiology|lymphatic biology|muscle physiology|neurohistology|osmoregulation|photosynthesis biochemistry|plant water relations|plant developmental biology|plant signaling|vascular plant anatomy|CAM plant biology|integumentary biology|connective tissue biology|skeletal biology|hemostasis biology|ecology and biogeography|cancer biology)\b/i.test(
        text,
      ) ||
      /^Using (enzyme kinetic|evolutionary biology|community ecology|population genetics)/i.test(text) ||
      /^For (population genetics|pea traits)/i.test(text) ||
      /^Explain (the central dogma|chloroplast|Sanger sequencing|the fluid mosaic|how DNA methylation|miRNA|SDS-PAGE)/i.test(
        text,
      ) ||
      /^Compare (prokaryotic|simple and stratified|skeletal, cardiac|nervous and endocrine)/i.test(text) ||
      /^Differentiate (global and local)/i.test(text) ||
      /^Describe (PCR|Sanger|how gut commensals|how CYP450|how DNA methylation|innate immunity)/i.test(
        text,
      ) ||
      /^Construct a (macromolecule|five-species)/i.test(text) ||
      /^Draw (the aerobic|a replication|the cell-cycle|a reflex)/i.test(text) ||
      /^Classify (mutation types|common vaccine)/i.test(text) ||
      /^Map FSH/i.test(text) ||
      /^Interpret a dicot root/i.test(text))
  ) {
    return 'Biology';
  }

  const scores = new Map<Subject, number>();

  for (const rule of RULES) {
    let score = 0;
    for (const { re, w } of rule.patterns) {
      const matches = text.match(
        new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'),
      );
      if (matches) score += w * matches.length;
    }
    if (score > 0) scores.set(rule.subject, score);
  }

  if (scores.size === 0) return 'General';

  let best: Subject = 'General';
  let bestScore = 0;
  for (const subject of PRIORITY) {
    const s = scores.get(subject) ?? 0;
    // Strictly greater so PRIORITY only breaks exact ties.
    if (s > bestScore) {
      bestScore = s;
      best = subject;
    }
  }

  // Auto should find the closest match: any genuine signal routes to a subject;
  // we only fall back to General when nothing matched at all.
  return bestScore >= 1 ? best : 'General';
}
