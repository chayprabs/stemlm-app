/** Standalone biology benchmark prompts — questions only, no hardcoded solutions or diagrams. */
export interface BiologySpecRow {
  id: string;
  number: number;
  topic: string;
  question: string;
  difficulty: 'Easy' | 'Mid';
  patterns: string[];
}

export const BIOLOGY_SPEC_ROWS: BiologySpecRow[] = [
  {
    "id": "q01",
    "number": 1,
    "topic": "Prokaryote vs Eukaryote and Endosymbiosis",
    "question": "Compare prokaryotic and eukaryotic cells. (a) List five structural differences in a table. (b) Draw and label a prokaryotic cell: cell wall, plasma membrane, nucleoid, ribosome (70S), flagellum, pili, capsule. (c) Why no membrane-bound organelles? Endosymbiotic hypothesis for mitochondria/chloroplasts with two evidence pieces.",
    "difficulty": "Mid",
    "patterns": [
      "70S",
      "80S",
      "binary fission",
      "mitosis",
      "endosymbiosis",
      "double membrane"
    ]
  },
  {
    "id": "q02",
    "number": 2,
    "topic": "Membrane Fluid Mosaic and Osmosis in RBCs",
    "question": "Fluid mosaic model - draw and label phospholipid bilayer, integral/peripheral proteins, cholesterol, glycoproteins, glycolipids. Explain fluid vs mosaic. Distinguish simple diffusion, facilitated diffusion, active transport (primary/secondary) with ATP and examples. RBC in 0.2% and 2% NaCl.",
    "difficulty": "Mid",
    "patterns": [
      "0.034",
      "0.342",
      "0.308",
      "hypotonic",
      "crenation",
      "hemolysis"
    ]
  },
  {
    "id": "q03",
    "number": 3,
    "topic": "Enzyme Kinetics, Inhibition, and Delta G",
    "question": "Enzyme kinetics S→P: energy diagram with/without enzyme (Ea, ΔG), Michaelis-Menten (Vmax, Km), competitive vs non-competitive inhibitors, why enzymes can't change ΔG.",
    "difficulty": "Mid",
    "patterns": [
      "60",
      "competitive",
      "noncompetitive",
      "-36.2",
      "Vmax",
      "Km"
    ]
  },
  {
    "id": "q04",
    "number": 4,
    "topic": "Aerobic Respiration, ETC, and Fermentation",
    "question": "Aerobic respiration flowchart per glucose: glycolysis, pyruvate oxidation, Krebs, oxidative phosphorylation with ATP/NADH/FADH2/CO2. ETC role and final acceptor. NADH 2.5 vs FADH2 1.5 ATP. Fermentation yeast vs muscle.",
    "difficulty": "Mid",
    "patterns": [
      "10 NADH",
      "2 FADH2",
      "32",
      "30",
      "2 ATP",
      "Complex I"
    ]
  },
  {
    "id": "q05",
    "number": 5,
    "topic": "Chloroplast Function, Light Reactions, and Carbon Fixation",
    "question": "Chloroplast diagram and light reactions PSII/PSI, Calvin cycle phases, Rubisco, C3/C4/CAM comparison.",
    "difficulty": "Mid",
    "patterns": [
      "PSII",
      "PSI",
      "3 CO2",
      "9 ATP",
      "6 NADPH",
      "C4",
      "CAM"
    ]
  },
  {
    "id": "q06",
    "number": 6,
    "topic": "Cell Cycle, Mitosis, and Checkpoints",
    "question": "Cell cycle circle G1/S/G2/M/G0, mitosis stages, checkpoints, chromosome counts 2n=46 at G1, after S, metaphase, end mitosis.",
    "difficulty": "Mid",
    "patterns": [
      "2n=46",
      "92 chromatids",
      "G1/S",
      "G2/M",
      "spindle checkpoint",
      "anaphase"
    ]
  },
  {
    "id": "q07",
    "number": 7,
    "topic": "Biological Macromolecules, Protein Structure, and Nucleic Acids",
    "question": "Four macromolecule classes monomer/bond/examples, protein structure levels, lipids vs polymers, DNA vs RNA.",
    "difficulty": "Mid",
    "patterns": [
      "4 kcal",
      "9 kcal",
      "peptide",
      "phosphodiester",
      "thymine",
      "uracil",
      "quaternary"
    ]
  },
  {
    "id": "q08",
    "number": 8,
    "topic": "DNA Replication Fork Dynamics and Telomerase",
    "question": "Replication fork labels, 5'→3' synthesis, semi-conservative/Meselson-Stahl, telomerase.",
    "difficulty": "Mid",
    "patterns": [
      "semiconservative",
      "5\\",
      "",
      "Okazaki",
      "150",
      "3 s",
      "TTAGGG",
      "telomerase"
    ]
  },
  {
    "id": "q09",
    "number": 9,
    "topic": "Central Dogma, Transcription, Translation, and Genetic Code",
    "question": "Central dogma diagram, transcription, translation, genetic code degenerate/universal/unambiguous.",
    "difficulty": "Mid",
    "patterns": [
      "DNA -> RNA -> protein",
      "AUG",
      "UAA",
      "UAG",
      "UGA",
      "triplet",
      "degenerate"
    ]
  },
  {
    "id": "q10",
    "number": 10,
    "topic": "Mendelian Genetics with Dihybrid Pea Crosses",
    "question": "Pea genetics R/Y round/wrinkled yellow/green, F1/F2, Mendel laws, test cross 51:48:50:49.",
    "difficulty": "Mid",
    "patterns": [
      "RrYy",
      "9:3:3:1",
      "1/16",
      "segregation",
      "independent assortment",
      "1:1:1:1",
      "51"
    ]
  },
  {
    "id": "q11",
    "number": 11,
    "topic": "Inheritance Patterns: Incomplete Dominance, Codominance, Epistasis, and Pleiotropy",
    "question": "In genetics, compare incomplete dominance in snapdragon flower color, codominance in ABO blood groups, recessive epistasis in Labrador coat color, and pleiotropy where one gene affects multiple cell and organism traits.",
    "difficulty": "Mid",
    "patterns": [
      "1:2:1",
      "I^AI^B",
      "ABO",
      "9:3:4",
      "epistasis",
      "pleiotropy"
    ]
  },
  {
    "id": "q12",
    "number": 12,
    "topic": "Sex-linked Inheritance, Non-disjunction, and Lyon Hypothesis",
    "question": "In human genetics, use X-linked haemophilia inheritance, meiotic non-disjunction causing aneuploidy (Down syndrome and Klinefelter syndrome), and the Lyon hypothesis of X-chromosome inactivation to explain phenotype probabilities in cells and offspring.",
    "difficulty": "Mid",
    "patterns": [
      "X^hY",
      "1/4",
      "47,+21",
      "47,XXY",
      "Barr bodies",
      "Lyon hypothesis"
    ]
  },
  {
    "id": "q13",
    "number": 13,
    "topic": "Mutation Types, Translation Effects, DNA Repair, and Mutagens",
    "question": "In molecular genetics, classify mutation types in DNA, translate a given coding sequence after a base substitution, and relate DNA repair pathways to mutagen effects such as UV-induced pyrimidine dimers in cells.",
    "difficulty": "Mid",
    "patterns": [
      "ATG",
      "AUG",
      "CAU",
      "AAU",
      "missense",
      "NER",
      "UV",
      "dimer"
    ]
  },
  {
    "id": "q14",
    "number": 14,
    "topic": "Gene Regulation in Prokaryotes and Eukaryotes",
    "question": "In gene regulation, compare lac operon control in bacteria with eukaryotic chromatin and RNA-based control, and explain catabolite repression plus miRNA effects on mRNA and enzyme production.",
    "difficulty": "Mid",
    "patterns": [
      "lac operon",
      "allolactose",
      "CAP",
      "cAMP",
      "catabolite repression",
      "miRNA"
    ]
  },
  {
    "id": "q15",
    "number": 15,
    "topic": "Motor Neuron Structure and Action Potential Physiology",
    "question": "In neurobiology, label a motor neuron cell, explain resting membrane potential and action potential phases, interpret a membrane voltage graph, and quantify why saltatory conduction increases conduction velocity in myelinated axons.",
    "difficulty": "Mid",
    "patterns": [
      "-70 mV",
      "+30 mV",
      "100 mV",
      "v=d/t",
      "60 m/s",
      "saltatory"
    ]
  },
  {
    "id": "q16",
    "number": 16,
    "topic": "Chemical Synapse Signaling, Summation, and Neuropharmacology",
    "question": "In synaptic neurobiology, explain chemical synapse transmission, distinguish EPSP and IPSP effects on neuron membrane potential, compute temporal/spatial summation outcomes, and interpret actions of cocaine, botulinum toxin, and curare.",
    "difficulty": "Mid",
    "patterns": [
      "EPSP",
      "IPSP",
      "-55 mV",
      "summation",
      "cocaine",
      "botulinum",
      "curare"
    ]
  },
  {
    "id": "q17",
    "number": 17,
    "topic": "Cardiac Anatomy, Blood Flow, Conduction, ECG, and Cardiac Output",
    "question": "In cardiovascular biology and organ physiology, label heart chambers and vessels, trace blood pathway through cardiac tissue and systemic tissues in the organism, explain cardiac conduction and ECG waves, and estimate cardiac output from stroke volume and heart rate for circulatory homeostasis.",
    "difficulty": "Mid",
    "patterns": [
      "RA",
      "RV",
      "LA",
      "LV",
      "HR=60/RR",
      "CO=SV x HR",
      "5.04 L/min"
    ]
  },
  {
    "id": "q18",
    "number": 18,
    "topic": "Respiratory Pathway, Gas Transport, Bohr Effect, and Lung Volumes",
    "question": "In respiratory physiology of a human organism, trace air flow through the respiratory pathway to alveoli, explain oxygen and carbon dioxide transport across alveolar tissue and blood cells, interpret the oxyhaemoglobin dissociation curve including the Bohr effect, and estimate lung function indices such as FEV1/FVC for gas-exchange homeostasis.",
    "difficulty": "Mid",
    "patterns": [
      "alveoli",
      "C_aO2",
      "P50",
      "Bohr",
      "bicarbonate",
      "FEV1/FVC",
      "0.80"
    ]
  },
  {
    "id": "q19",
    "number": 19,
    "topic": "Digestive Tract Function, Enzyme Digestion, Absorption, and Liver Roles",
    "question": "In human digestive biology, trace food through the digestive tract, quantify enzyme digestion of carbohydrates, proteins, and lipids, explain villus-based nutrient absorption, and summarize major liver functions in metabolism and homeostasis.",
    "difficulty": "Mid",
    "patterns": [
      "mouth",
      "small intestine",
      "lipase",
      "villus",
      "600-fold",
      "liver"
    ]
  },
  {
    "id": "q20",
    "number": 20,
    "topic": "Homeostasis, Feedback Control, and Thermoregulation",
    "question": "In physiology, explain homeostasis using blood glucose regulation as negative feedback, compare positive versus negative feedback systems in cells and organs, and quantify basic thermoregulation responses around a temperature set point.",
    "difficulty": "Mid",
    "patterns": [
      "homeostasis",
      "negative feedback",
      "insulin",
      "glucagon",
      "Q=mc",
      "thermoregulation"
    ]
  },
  {
    "id": "q21",
    "number": 21,
    "topic": "Population Growth Models and Regulation",
    "question": "In population ecology, compare growth models for an organism species in an ecosystem: exponential growth and logistic growth. Interpret growth curves, classify scenarios with r>0, r=0, and r<0, and distinguish density-dependent from density-independent factors that regulate species populations.",
    "difficulty": "Mid",
    "patterns": [
      "dN/dt",
      "rN",
      "rN(1-N/K)",
      "carrying capacity",
      "r>0",
      "density-dependent"
    ]
  },
  {
    "id": "q22",
    "number": 22,
    "topic": "Species Interactions, Keystone Effects, and Succession",
    "question": "Using community ecology concepts, complete a species interactions table, explain competitive exclusion, evaluate keystone species effects in a food web, and compare primary versus secondary succession.",
    "difficulty": "Mid",
    "patterns": [
      "mutualism",
      "competition",
      "competitive exclusion",
      "keystone species",
      "\", "
    ]
  },
  {
    "id": "q23",
    "number": 23,
    "topic": "Food Web Energetics, Productivity, Biomass, and Nitrogen Cycle",
    "question": "In ecosystem ecology, interpret a food web diagram, apply the 10% rule from 10000 kcal, calculate GPP and NPP with biomass implications, and explain how the nitrogen cycle supports trophic productivity.",
    "difficulty": "Mid",
    "patterns": [
      "10% rule",
      "10000 kcal",
      "NPP = GPP - R",
      "biomass",
      "nitrification",
      "denitrification"
    ]
  },
  {
    "id": "q24",
    "number": 24,
    "topic": "Natural Selection, Fitness, and Evidence for Evolution",
    "question": "Using evolutionary biology, state Darwin postulates, interpret directional, stabilizing, and disruptive selection curves, calculate relative fitness, and summarize major evidence supporting evolution.",
    "difficulty": "Mid",
    "patterns": [
      "Darwin postulates",
      "directional selection",
      "stabilizing",
      "disruptive",
      "relative fitness",
      "selection coefficient"
    ]
  },
  {
    "id": "q25",
    "number": 25,
    "topic": "Hardy-Weinberg Equilibrium and Evolutionary Mechanisms",
    "question": "For population genetics, state Hardy-Weinberg conditions, calculate genotype frequencies when q=0.3, solve a 10000-individual recessive phenotype case, and explain mechanisms that violate equilibrium.",
    "difficulty": "Mid",
    "patterns": [
      "Hardy-Weinberg",
      "p+q=1",
      "q=0.3",
      "p^2+2pq+q^2",
      "10000",
      "recessive phenotype"
    ]
  },
  {
    "id": "q26",
    "number": 26,
    "topic": "Speciation Models and Reproductive Isolation",
    "question": "In evolutionary speciation biology, define the biological species concept, compare allopatric versus sympatric speciation, classify prezygotic and postzygotic barriers, and contrast gradualism with punctuated equilibrium.",
    "difficulty": "Mid",
    "patterns": [
      "biological species concept",
      "allopatric",
      "sympatric",
      "prezygotic",
      "postzygotic",
      "punctuated equilibrium"
    ]
  },
  {
    "id": "q27",
    "number": 27,
    "topic": "Bacterial Growth, Gram Staining, Binary Fission, and Resistance",
    "question": "In microbiology, interpret a bacterial growth curve, compare Gram-positive and Gram-negative staining outcomes, calculate binary fission from 100 cells over 3 hours, and explain antibiotic resistance evolution.",
    "difficulty": "Mid",
    "patterns": [
      "lag phase",
      "log phase",
      "Gram-positive",
      "Gram-negative",
      "binary fission",
      "antibiotic resistance"
    ]
  },
  {
    "id": "q28",
    "number": 28,
    "topic": "Virus Structure, Viral Replication, and Antimicrobial Strategy",
    "question": "In virology, compare bacteriophage and animal virus structures, distinguish lytic and lysogenic cycles, outline HIV replication steps, and explain why antibiotics differ from antivirals.",
    "difficulty": "Mid",
    "patterns": [
      "bacteriophage",
      "animal virus",
      "lytic",
      "lysogenic",
      "HIV",
      "antivirals"
    ]
  },
  {
    "id": "q29",
    "number": 29,
    "topic": "Innate Immunity, Inflammation, Phagocytosis, and Complement",
    "question": "In immunology and immune system biology, describe innate immunity barriers that protect the organism from pathogen entry, explain the cardinal signs of inflammation, outline phagocytosis by immune cells, and summarize complement-system antimicrobial actions including antibody-supported clearance.",
    "difficulty": "Mid",
    "patterns": [
      "innate immunity",
      "rubor",
      "calor",
      "phagocytosis",
      "complement",
      "MAC"
    ]
  },
  {
    "id": "q30",
    "number": 30,
    "topic": "Adaptive Immunity: B Cells, T Cells, MHC, and Immunization",
    "question": "In adaptive immunity, interpret B-cell and T-cell roles, compare antigen presentation by MHC I and MHC II, explain clonal selection, and distinguish active versus passive immunity.",
    "difficulty": "Mid",
    "patterns": [
      "B cells",
      "T cells",
      "MHC I",
      "MHC II",
      "clonal selection",
      "active immunity",
      "passive immunity"
    ]
  },
  {
    "id": "q31",
    "number": 31,
    "topic": "Sanger Sequencing, NGS, and WGS vs WES",
    "question": "Explain Sanger sequencing chain termination using ddNTPs, compare next-generation sequencing (NGS) advantages, estimate the protein-coding fraction of the human genome, and contrast whole-genome sequencing (WGS) with whole-exome sequencing (WES).",
    "difficulty": "Mid",
    "patterns": [
      "ddNTP",
      "Sanger",
      "NGS",
      "1.5%",
      "WGS",
      "WES",
      "coverage"
    ]
  },
  {
    "id": "q32",
    "number": 32,
    "topic": "Sequence Alignment, BLAST Statistics, and Homology Terms",
    "question": "Differentiate global and local alignment for DNA sequences from genes in different species, interpret BLAST E-values, compute percent identity for an ATGCATGCAATG alignment, and distinguish homology from ortholog/paralog relationships.",
    "difficulty": "Mid",
    "patterns": [
      "global alignment",
      "local alignment",
      "E-value",
      "ATGCATGCAATG",
      "100%",
      "deletion",
      "ortholog",
      "paralog"
    ]
  },
  {
    "id": "q33",
    "number": 33,
    "topic": "PCR Amplification, Gel Electrophoresis, and RT-PCR",
    "question": "Describe PCR cycle stages for DNA amplification, calculate expected copy number after 30 cycles, interpret gel electrophoresis output, and explain RT-PCR workflow from RNA to cDNA and interpretation.",
    "difficulty": "Mid",
    "patterns": [
      "PCR",
      "2^30",
      "1,073,741,824",
      "gel electrophoresis",
      "RT-PCR",
      "cDNA",
      "Ct"
    ]
  },
  {
    "id": "q34",
    "number": 34,
    "topic": "Phylogenetic Trees, Molecular Clock, and Homology Concepts",
    "question": "Construct a five-species phylogenetic interpretation for DNA/protein evolution, apply molecular clock reasoning, use cytochrome c comparisons, and distinguish homologous from analogous traits across species.",
    "difficulty": "Mid",
    "patterns": [
      "phylogenetic tree",
      "molecular clock",
      "t = d/(2r)",
      "cytochrome c",
      "homologous",
      "analogous",
      "ortholog",
      "paralog"
    ]
  },
  {
    "id": "q35",
    "number": 35,
    "topic": "Recombinant DNA, Insulin Cloning, CRISPR, and GMOs",
    "question": "Explain recombinant DNA construction with restriction enzymes, outline an insulin plasmid cloning workflow, summarize CRISPR editing logic, and evaluate GMO applications.",
    "difficulty": "Mid",
    "patterns": [
      "restriction enzyme",
      "EcoRI",
      "plasmid",
      "insulin",
      "ligation",
      "CRISPR",
      "Cas9",
      "GMO"
    ]
  },
  {
    "id": "q36",
    "number": 36,
    "topic": "Water Potential, Turgor, and Soil-Plant-Atmosphere Continuum",
    "question": "Use the equation Psi = Psi_s + Psi_p, calculate plant cell water potential for given values, explain turgor versus plasmolysis, and relate water movement to the soil-plant-atmosphere continuum.",
    "difficulty": "Mid",
    "patterns": [
      "Psi = Psi_s + Psi_p",
      "-0.7",
      "+0.5",
      "-0.2 MPa",
      "turgor",
      "plasmolysis",
      "soil-plant-atmosphere continuum"
    ]
  },
  {
    "id": "q37",
    "number": 37,
    "topic": "Mitosis vs Meiosis, Chromosome Numbering, and Crossing Over",
    "question": "Compare mitosis and meiosis in a structured table, interpret a meiosis diagram for 2n=4, calculate gamete outcomes for 2n=6, and explain how crossing over increases variation.",
    "difficulty": "Mid",
    "patterns": [
      "mitosis",
      "meiosis",
      "2n=4",
      "2n=6",
      "n=3",
      "2^3=8",
      "crossing over"
    ]
  },
  {
    "id": "q38",
    "number": 38,
    "topic": "Nervous vs Endocrine Signaling, HPA Axis, and Diabetes",
    "question": "Compare nervous and endocrine communication in neuron and hormone biology, contrast steroid and peptide hormones, interpret the HPA axis diagram, and distinguish type 1 from type 2 diabetes in glucose homeostasis.",
    "difficulty": "Mid",
    "patterns": [
      "nervous",
      "endocrine",
      "steroid hormone",
      "peptide hormone",
      "HPA axis",
      "cortisol",
      "type 1 diabetes",
      "type 2 diabetes"
    ]
  },
  {
    "id": "q39",
    "number": 39,
    "topic": "Dicot Root Anatomy, Transport Pathways, and Plant Reproduction",
    "question": "Interpret a dicot root transverse section in plant tissue, compare apoplast and symplast movement between plant cells, explain phloem translocation through vascular tissue, and differentiate pollination from double fertilisation in flowering species.",
    "difficulty": "Mid",
    "patterns": [
      "dicot root",
      "apoplast",
      "symplast",
      "phloem translocation",
      "pollination",
      "double fertilisation",
      "2n zygote",
      "3n endosperm"
    ]
  },
  {
    "id": "q40",
    "number": 40,
    "topic": "Vaccine Platforms, mRNA Mechanism, Herd Immunity, and Autoimmunity",
    "question": "Classify common vaccine types using MMR, flu, mRNA, and hepatitis B examples, explain mRNA vaccine mechanism, calculate herd immunity thresholds from R0, and relate immunity to autoimmune disease concepts.",
    "difficulty": "Mid",
    "patterns": [
      "MMR",
      "flu",
      "mRNA",
      "HepB",
      "HIT = 1 - 1/R0",
      "R0",
      "immune memory",
      "autoimmune"
    ]
  },
  {
    "id": "q41",
    "number": 41,
    "topic": "Restriction Sites, PCR with Taq Polymerase, Reverse Transcriptase, and Ribozymes",
    "question": "In molecular biology, explain DNA restriction endonuclease recognition and sticky ends, apply Taq polymerase PCR cycle math for gene amplification, distinguish reverse transcriptase from DNA-dependent polymerases in RNA-to-cDNA conversion, and describe catalytic ribozyme function.",
    "difficulty": "Mid",
    "patterns": [
      "EcoRI",
      "AATT",
      "Taq",
      "72 C",
      "2^30",
      "1.07",
      "reverse transcriptase",
      "ribozyme"
    ]
  },
  {
    "id": "q42",
    "number": 42,
    "topic": "Proto-oncogenes, Tumor Suppressors, p53, and Cancer Progression",
    "question": "In cancer biology, distinguish proto-oncogenes from oncogenes and tumor suppressors (including p53), compare benign and malignant tumor cell behavior with metastasis, and evaluate major DNA-mutation cancer risk factors quantitatively.",
    "difficulty": "Mid",
    "patterns": [
      "proto-oncogene",
      "oncogene",
      "tumor suppressor",
      "p53",
      "metastasis",
      "2.5",
      "0.25",
      "0.0198"
    ]
  },
  {
    "id": "q43",
    "number": 43,
    "topic": "Terrestrial Biomes, Latitude-Altitude Patterns, Greenhouse Effect, and Shannon Biodiversity",
    "question": "In ecology and biogeography, summarize six terrestrial biomes for species and ecosystem patterns in a comparison table, interpret latitude-altitude biome shifts, explain the greenhouse effect radiation budget, and compute biodiversity using the Shannon index.",
    "difficulty": "Easy",
    "patterns": [
      "tundra",
      "taiga",
      "desert",
      "rainforest",
      "6.5",
      "340",
      "240",
      "1.2799"
    ]
  },
  {
    "id": "q44",
    "number": 44,
    "topic": "CRISPR Editing: NHEJ vs HDR, Applications, Ethics, and Next-Generation Editors",
    "question": "In genome engineering biology, explain CRISPR-Cas DNA target recognition in cells, compare non-homologous end joining (NHEJ) versus homology-directed repair (HDR), evaluate medical/agricultural/research gene applications, discuss germline ethics, and distinguish base editing from prime editing.",
    "difficulty": "Mid",
    "patterns": [
      "PAM",
      "NHEJ",
      "HDR",
      "62",
      "18",
      "base editing",
      "prime editing",
      "germline"
    ]
  },
  {
    "id": "q45",
    "number": 45,
    "topic": "Cell Signalling: Reception, Transduction, RTK Pathway, and Amplification",
    "question": "In cell signalling biology, describe reception-transduction-response stages, map a receptor tyrosine kinase (RTK) pathway, compare cAMP and Ca2+ second messengers, and compute signal amplification quantitatively.",
    "difficulty": "Mid",
    "patterns": [
      "reception",
      "transduction",
      "response",
      "RTK",
      "RAS",
      "cAMP",
      "Ca2+",
      "10000"
    ]
  },
  {
    "id": "q46",
    "number": 46,
    "topic": "Differentiation, Stem Cell Potency, Hox Patterning, and Intrinsic Apoptosis",
    "question": "In developmental biology, explain differentiation by transcription factors and epigenetics, compare stem cell potency classes, interpret Hox gene patterning including Antennapedia, and map intrinsic apoptosis signaling.",
    "difficulty": "Mid",
    "patterns": [
      "totipotent",
      "pluripotent",
      "Antennapedia",
      "cytochrome c",
      "caspase-9",
      "caspase-3",
      "900"
    ]
  },
  {
    "id": "q47",
    "number": 47,
    "topic": "Three Domains, Extremophiles, Archaeal Phylogeny, and Horizontal Gene Transfer",
    "question": "In microbiology and evolution, compare Bacteria, Archaea, and Eukarya in a domain table, explain extremophile adaptations, interpret archaeal placement on the tree of life, and contrast horizontal gene transfer by transformation, transduction, and conjugation.",
    "difficulty": "Easy",
    "patterns": [
      "Bacteria",
      "Archaea",
      "Eukarya",
      "extremophile",
      "transformation",
      "transduction",
      "conjugation",
      "52.5%"
    ]
  },
  {
    "id": "q48",
    "number": 48,
    "topic": "Reflex Arc, Somatic vs Autonomic Systems, Neurotransmitters, and Blood-Brain Barrier",
    "question": "In neurobiology, diagram a reflex arc, compare somatic and autonomic neuron pathways (including sympathetic and parasympathetic divisions), identify major neurotransmitters at synapse sites, and explain blood-brain barrier selectivity in brain tissue homeostasis.",
    "difficulty": "Mid",
    "patterns": [
      "reflex arc",
      "somatic",
      "autonomic",
      "sympathetic",
      "parasympathetic",
      "glutamate",
      "GABA",
      "blood-brain barrier"
    ]
  },
  {
    "id": "q49",
    "number": 49,
    "topic": "Sexual vs Asexual Reproduction, Fertilisation, Early Embryogenesis, and hCG Testing",
    "question": "In reproductive biology, compare sexual versus asexual reproduction, outline human fertilisation steps in cell development, track cleavage-blastulation-gastrulation and germ-layer tissue formation, and explain how hCG-based pregnancy tests work.",
    "difficulty": "Mid",
    "patterns": [
      "sexual",
      "asexual",
      "fertilisation",
      "blastocyst",
      "gastrulation",
      "ectoderm",
      "mesoderm",
      "endoderm"
    ]
  },
  {
    "id": "q50",
    "number": 50,
    "topic": "Biocius comprehensivus: Integrated Quantitative Biology Synthesis",
    "question": "Biocius comprehensivus integrative: 500 Mb genome 40% GC guanine count; eukaryotic autotroph organelles; Hardy-Weinberg bioluminescence 80 luminescent of 500 (L dominant); lake energy 100,000 kcal solar 1% fixed 60% respiration; allopatric speciation.",
    "difficulty": "Mid",
    "patterns": [
      "500,000,000",
      "100,000,000",
      "100 Mb",
      "420/500",
      "0.84",
      "0.9165",
      "0.0835",
      "0.153"
    ]
  }
];
