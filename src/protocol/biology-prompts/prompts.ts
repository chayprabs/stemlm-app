/** Biology exam prompts — questions only; solutions/diagrams come from Gemini at runtime. */
import type { BiologyPromptDef } from './types';

export const BIOLOGY_PROMPTS: BiologyPromptDef[] = [
  {
    "id": "q01",
    "number": 1,
    "topic": "Prokaryote vs Eukaryote and Endosymbiosis",
    "question": "Compare prokaryotic and eukaryotic cells using a structured table and labeled diagrams. Then explain the endosymbiotic origin of mitochondria (and chloroplasts) with key molecular evidence."
  },
  {
    "id": "q02",
    "number": 2,
    "topic": "Membrane Fluid Mosaic and Osmosis in RBCs",
    "question": "Explain the fluid mosaic model of membranes, classify membrane transport mechanisms, and predict red blood cell behavior in 0.2% and 2% NaCl solutions relative to isotonic conditions."
  },
  {
    "id": "q03",
    "number": 3,
    "topic": "Enzyme Kinetics, Inhibition, and Delta G",
    "question": "Using enzyme kinetic principles, interpret a reaction coordinate diagram, apply Michaelis-Menten kinetics, compare inhibition types, and compute Gibbs free energy changes."
  },
  {
    "id": "q04",
    "number": 4,
    "topic": "Aerobic Respiration, ETC, and Fermentation",
    "question": "Draw the aerobic respiration flow from glucose to ATP, explain ETC chemiosmotic coupling, estimate ATP yield from NADH and FADH2, and contrast this with fermentation."
  },
  {
    "id": "q05",
    "number": 5,
    "topic": "Chloroplast Function, Light Reactions, and Carbon Fixation",
    "question": "Explain chloroplast structure, the light reactions (PSII and PSI), Calvin cycle stoichiometry, and compare C3, C4, and CAM carbon fixation strategies."
  },
  {
    "id": "q06",
    "number": 6,
    "topic": "Cell Cycle, Mitosis, and Checkpoints",
    "question": "Draw the cell-cycle phases, identify mitosis stages and checkpoints, and track chromosome/chromatid numbers in a human somatic cell with 2n=46."
  },
  {
    "id": "q07",
    "number": 7,
    "topic": "Biological Macromolecules, Protein Structure, and Nucleic Acids",
    "question": "Construct a macromolecule comparison table, explain protein structural hierarchy, summarize lipid classes/functions, and compare DNA with RNA."
  },
  {
    "id": "q08",
    "number": 8,
    "topic": "DNA Replication Fork Dynamics and Telomerase",
    "question": "Draw a replication fork, justify 5'->3' synthesis and semiconservative replication, distinguish leading/lagging strand synthesis, and explain why telomerase is required in eukaryotes."
  },
  {
    "id": "q09",
    "number": 9,
    "topic": "Central Dogma, Transcription, Translation, and Genetic Code",
    "question": "Explain the central dogma, outline transcription and translation mechanisms, and discuss key properties of the genetic code with quantitative examples."
  },
  {
    "id": "q10",
    "number": 10,
    "topic": "Mendelian Genetics with Dihybrid Pea Crosses",
    "question": "For pea traits with alleles R/r and Y/y, derive expected F1 and F2 outcomes from parental crosses, apply Mendel laws, compute key probabilities, and interpret a test cross."
  },
  {
    "id": "q11",
    "number": 11,
    "topic": "Inheritance Patterns: Incomplete Dominance, Codominance, Epistasis, and Pleiotropy",
    "question": "In genetics, compare incomplete dominance in snapdragon flower color, codominance in ABO blood groups, recessive epistasis in Labrador coat color, and pleiotropy where one gene affects multiple cell and organism traits."
  },
  {
    "id": "q12",
    "number": 12,
    "topic": "Sex-linked Inheritance, Non-disjunction, and Lyon Hypothesis",
    "question": "In human genetics, use X-linked haemophilia inheritance, meiotic non-disjunction causing aneuploidy (Down syndrome and Klinefelter syndrome), and the Lyon hypothesis of X-chromosome inactivation to explain phenotype probabilities in cells and offspring."
  },
  {
    "id": "q13",
    "number": 13,
    "topic": "Mutation Types, Translation Effects, DNA Repair, and Mutagens",
    "question": "In molecular genetics, classify mutation types in DNA, translate a given coding sequence after a base substitution, and relate DNA repair pathways to mutagen effects such as UV-induced pyrimidine dimers in cells."
  },
  {
    "id": "q14",
    "number": 14,
    "topic": "Gene Regulation in Prokaryotes and Eukaryotes",
    "question": "In gene regulation, compare lac operon control in bacteria with eukaryotic chromatin and RNA-based control, and explain catabolite repression plus miRNA effects on mRNA and enzyme production."
  },
  {
    "id": "q15",
    "number": 15,
    "topic": "Motor Neuron Structure and Action Potential Physiology",
    "question": "In neurobiology, label a motor neuron cell, explain resting membrane potential and action potential phases, interpret a membrane voltage graph, and quantify why saltatory conduction increases conduction velocity in myelinated axons."
  },
  {
    "id": "q16",
    "number": 16,
    "topic": "Chemical Synapse Signaling, Summation, and Neuropharmacology",
    "question": "In synaptic neurobiology, explain chemical synapse transmission, distinguish EPSP and IPSP effects on neuron membrane potential, compute temporal/spatial summation outcomes, and interpret actions of cocaine, botulinum toxin, and curare."
  },
  {
    "id": "q17",
    "number": 17,
    "topic": "Cardiac Anatomy, Blood Flow, Conduction, ECG, and Cardiac Output",
    "question": "In cardiovascular biology, label heart chambers and vessels, trace blood pathway through the heart, explain cardiac conduction and ECG waves, and calculate cardiac output from stroke volume and heart rate."
  },
  {
    "id": "q18",
    "number": 18,
    "topic": "Respiratory Pathway, Gas Transport, Bohr Effect, and Lung Volumes",
    "question": "In respiratory physiology, trace air flow through the respiratory pathway, explain oxygen and carbon dioxide transport in blood, interpret the oxyhaemoglobin dissociation curve including the Bohr effect, and compute lung function indices such as FEV1/FVC."
  },
  {
    "id": "q19",
    "number": 19,
    "topic": "Digestive Tract Function, Enzyme Digestion, Absorption, and Liver Roles",
    "question": "In human digestive biology, trace food through the digestive tract, quantify enzyme digestion of carbohydrates, proteins, and lipids, explain villus-based nutrient absorption, and summarize major liver functions in metabolism and homeostasis."
  },
  {
    "id": "q20",
    "number": 20,
    "topic": "Homeostasis, Feedback Control, and Thermoregulation",
    "question": "In physiology, explain homeostasis using blood glucose regulation as negative feedback, compare positive versus negative feedback systems in cells and organs, and quantify basic thermoregulation responses around a temperature set point."
  },
  {
    "id": "q21",
    "number": 21,
    "topic": "Population Growth Models and Regulation",
    "question": "In population ecology, compare the exponential growth equation and logistic growth equation, interpret growth curves, classify scenarios with r>0, r=0, and r<0, and distinguish density-dependent from density-independent factors."
  },
  {
    "id": "q22",
    "number": 22,
    "topic": "Species Interactions, Keystone Effects, and Succession",
    "question": "Using community ecology concepts, complete a species interactions table, explain competitive exclusion, evaluate keystone species effects in a food web, and compare primary versus secondary succession."
  },
  {
    "id": "q23",
    "number": 23,
    "topic": "Food Web Energetics, Productivity, Biomass, and Nitrogen Cycle",
    "question": "In ecosystem ecology, interpret a food web diagram, apply the 10% rule from 10000 kcal, calculate GPP and NPP with biomass implications, and explain how the nitrogen cycle supports trophic productivity."
  },
  {
    "id": "q24",
    "number": 24,
    "topic": "Natural Selection, Fitness, and Evidence for Evolution",
    "question": "Using evolutionary biology, state Darwin postulates, interpret directional, stabilizing, and disruptive selection curves, calculate relative fitness, and summarize major evidence supporting evolution."
  },
  {
    "id": "q25",
    "number": 25,
    "topic": "Hardy-Weinberg Equilibrium and Evolutionary Mechanisms",
    "question": "For population genetics, state Hardy-Weinberg conditions, calculate genotype frequencies when q=0.3, solve a 10000-individual recessive phenotype case, and explain mechanisms that violate equilibrium."
  },
  {
    "id": "q26",
    "number": 26,
    "topic": "Speciation Models and Reproductive Isolation",
    "question": "In evolutionary speciation biology, define the biological species concept, compare allopatric versus sympatric speciation, classify prezygotic and postzygotic barriers, and contrast gradualism with punctuated equilibrium."
  },
  {
    "id": "q27",
    "number": 27,
    "topic": "Bacterial Growth, Gram Staining, Binary Fission, and Resistance",
    "question": "In microbiology, interpret a bacterial growth curve, compare Gram-positive and Gram-negative staining outcomes, calculate binary fission from 100 cells over 3 hours, and explain antibiotic resistance evolution."
  },
  {
    "id": "q28",
    "number": 28,
    "topic": "Virus Structure, Viral Replication, and Antimicrobial Strategy",
    "question": "In virology, compare bacteriophage and animal virus structures, distinguish lytic and lysogenic cycles, outline HIV replication steps, and explain why antibiotics differ from antivirals."
  },
  {
    "id": "q29",
    "number": 29,
    "topic": "Innate Immunity, Inflammation, Phagocytosis, and Complement",
    "question": "In immunology, describe innate immunity barriers, explain the cardinal signs of inflammation, outline phagocytosis, and summarize complement-system antimicrobial actions."
  },
  {
    "id": "q30",
    "number": 30,
    "topic": "Adaptive Immunity: B Cells, T Cells, MHC, and Immunization",
    "question": "In adaptive immunity, interpret B-cell and T-cell roles, compare antigen presentation by MHC I and MHC II, explain clonal selection, and distinguish active versus passive immunity."
  },
  {
    "id": "q31",
    "number": 31,
    "topic": "Sanger Sequencing, NGS, and WGS vs WES",
    "question": "Explain Sanger sequencing chain termination using ddNTPs, compare next-generation sequencing (NGS) advantages, estimate the protein-coding fraction of the human genome, and contrast whole-genome sequencing (WGS) with whole-exome sequencing (WES)."
  },
  {
    "id": "q32",
    "number": 32,
    "topic": "Sequence Alignment, BLAST Statistics, and Homology Terms",
    "question": "Differentiate global and local alignment, interpret BLAST E-values, compute percent identity for an ATGCATGCAATG alignment, and distinguish homology from ortholog/paralog relationships."
  },
  {
    "id": "q33",
    "number": 33,
    "topic": "PCR Amplification, Gel Electrophoresis, and RT-PCR",
    "question": "Describe PCR cycle stages, calculate expected copy number after 30 cycles, interpret gel electrophoresis output, and explain RT-PCR workflow and interpretation."
  },
  {
    "id": "q34",
    "number": 34,
    "topic": "Phylogenetic Trees, Molecular Clock, and Homology Concepts",
    "question": "Construct a five-species phylogenetic interpretation, apply molecular clock reasoning, use cytochrome c comparisons, and distinguish homologous from analogous traits."
  },
  {
    "id": "q35",
    "number": 35,
    "topic": "Recombinant DNA, Insulin Cloning, CRISPR, and GMOs",
    "question": "Explain recombinant DNA construction with restriction enzymes, outline an insulin plasmid cloning workflow, summarize CRISPR editing logic, and evaluate GMO applications."
  },
  {
    "id": "q36",
    "number": 36,
    "topic": "Water Potential, Turgor, and Soil-Plant-Atmosphere Continuum",
    "question": "Use the equation Psi = Psi_s + Psi_p, calculate plant cell water potential for given values, explain turgor versus plasmolysis, and relate water movement to the soil-plant-atmosphere continuum."
  },
  {
    "id": "q37",
    "number": 37,
    "topic": "Mitosis vs Meiosis, Chromosome Numbering, and Crossing Over",
    "question": "Compare mitosis and meiosis in a structured table, interpret a meiosis diagram for 2n=4, calculate gamete outcomes for 2n=6, and explain how crossing over increases variation."
  },
  {
    "id": "q38",
    "number": 38,
    "topic": "Nervous vs Endocrine Signaling, HPA Axis, and Diabetes",
    "question": "Compare nervous and endocrine communication, contrast steroid and peptide hormones, interpret the HPA axis diagram, and distinguish type 1 from type 2 diabetes."
  },
  {
    "id": "q39",
    "number": 39,
    "topic": "Dicot Root Anatomy, Transport Pathways, and Plant Reproduction",
    "question": "Interpret a dicot root cross-section, compare apoplast and symplast movement, explain phloem translocation, and differentiate pollination from double fertilisation."
  },
  {
    "id": "q40",
    "number": 40,
    "topic": "Vaccine Platforms, mRNA Mechanism, Herd Immunity, and Autoimmunity",
    "question": "Classify common vaccine types using MMR, flu, mRNA, and hepatitis B examples, explain mRNA vaccine mechanism, calculate herd immunity thresholds from R0, and relate immunity to autoimmune disease concepts."
  },
  {
    "id": "q41",
    "number": 41,
    "topic": "Restriction Sites, PCR with Taq Polymerase, Reverse Transcriptase, and Ribozymes",
    "question": "In molecular biology, explain restriction endonuclease recognition and sticky ends, apply Taq polymerase PCR cycle math, distinguish reverse transcriptase from DNA-dependent polymerases, and describe catalytic ribozyme function."
  },
  {
    "id": "q42",
    "number": 42,
    "topic": "Proto-oncogenes, Tumor Suppressors, p53, and Cancer Progression",
    "question": "In cancer biology, distinguish proto-oncogenes from oncogenes and tumor suppressors (including p53), compare benign and malignant tumors with metastasis behavior, and evaluate major cancer risk factors quantitatively."
  },
  {
    "id": "q43",
    "number": 43,
    "topic": "Terrestrial Biomes, Latitude-Altitude Patterns, Greenhouse Effect, and Shannon Biodiversity",
    "question": "In ecology and biogeography, summarize six terrestrial biomes in a comparison table, interpret latitude-altitude biome shifts, explain the greenhouse effect energy balance, and compute biodiversity using the Shannon index."
  },
  {
    "id": "q44",
    "number": 44,
    "topic": "CRISPR Editing: NHEJ vs HDR, Applications, Ethics, and Next-Generation Editors",
    "question": "In genome engineering, explain CRISPR-Cas target recognition, compare non-homologous end joining (NHEJ) versus homology-directed repair (HDR), evaluate medical/agricultural/research applications, discuss germline ethics, and distinguish base editing from prime editing."
  },
  {
    "id": "q45",
    "number": 45,
    "topic": "Cell Signalling: Reception, Transduction, RTK Pathway, and Amplification",
    "question": "In cell signalling biology, describe reception-transduction-response stages, map a receptor tyrosine kinase (RTK) pathway, compare cAMP and Ca2+ second messengers, and compute signal amplification quantitatively."
  },
  {
    "id": "q46",
    "number": 46,
    "topic": "Differentiation, Stem Cell Potency, Hox Patterning, and Intrinsic Apoptosis",
    "question": "In developmental biology, explain differentiation by transcription factors and epigenetics, compare stem cell potency classes, interpret Hox gene patterning including Antennapedia, and map intrinsic apoptosis signaling."
  },
  {
    "id": "q47",
    "number": 47,
    "topic": "Three Domains, Extremophiles, Archaeal Phylogeny, and Horizontal Gene Transfer",
    "question": "In microbiology and evolution, compare Bacteria, Archaea, and Eukarya in a domain table, explain extremophile adaptations, interpret archaeal placement on the tree of life, and contrast horizontal gene transfer by transformation, transduction, and conjugation."
  },
  {
    "id": "q48",
    "number": 48,
    "topic": "Reflex Arc, Somatic vs Autonomic Systems, Neurotransmitters, and Blood-Brain Barrier",
    "question": "In neurobiology, diagram a reflex arc, compare somatic and autonomic pathways (including sympathetic and parasympathetic divisions), identify major neurotransmitters, and explain blood-brain barrier selectivity."
  },
  {
    "id": "q49",
    "number": 49,
    "topic": "Sexual vs Asexual Reproduction, Fertilisation, Early Embryogenesis, and hCG Testing",
    "question": "In reproductive biology, compare sexual versus asexual reproduction, outline human fertilisation steps, track cleavage-blastulation-gastrulation and germ-layer formation, and explain how hCG-based pregnancy tests work."
  },
  {
    "id": "q50",
    "number": 50,
    "topic": "Biocius comprehensivus: Integrated Quantitative Biology Synthesis",
    "question": "In an integrative biology scenario (Biocius comprehensivus), calculate guanine count for a 500 Mb genome at 40% GC, identify key eukaryotic autotroph organelles, solve a Hardy-Weinberg bioluminescence case with 80 of 420 recessive individuals, compute lake energy flow from 100000 kcal, and explain allopatric speciation."
  }
] as BiologyPromptDef[];

export function getBiologyPromptByNumber(n: number): BiologyPromptDef | undefined {
  return BIOLOGY_PROMPTS.find((q) => q.number === n);
}
