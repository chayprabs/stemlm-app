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
  },
  {
    "id": "q51",
    "number": 51,
    "topic": "Epithelial Tissue Types, Junctions, and Barrier Functions",
    "question": "In histology, compare simple and stratified epithelia (squamous, cuboidal, columnar), diagram tight junctions, desmosomes, and gap junctions, and explain how epithelial polarity supports absorption and secretion in organs."
  },
  {
    "id": "q52",
    "number": 52,
    "topic": "Connective Tissue Matrix, Cartilage, and Bone Remodeling",
    "question": "In connective tissue biology, compare collagen and elastic fibers, classify cartilage types, diagram osteon structure in compact bone, and explain how osteoblasts and osteoclasts regulate bone remodeling."
  },
  {
    "id": "q53",
    "number": 53,
    "topic": "Muscle Tissue: Skeletal, Cardiac, and Smooth Contraction",
    "question": "In muscle physiology, compare skeletal, cardiac, and smooth muscle at the cellular level, diagram the sarcomere and sliding filament model, and explain how Ca2+ and ATP couple excitation to contraction."
  },
  {
    "id": "q54",
    "number": 54,
    "topic": "Nervous Tissue, Glia, and Myelin Sheath Formation",
    "question": "In neurohistology, distinguish neurons from astrocytes, oligodendrocytes, Schwann cells, and microglia, explain myelin formation in CNS versus PNS, and interpret how demyelination alters conduction velocity."
  },
  {
    "id": "q55",
    "number": 55,
    "topic": "Nephron Structure, Filtration, and Urine Formation",
    "question": "In renal physiology, label nephron regions (glomerulus, PCT, loop of Henle, DCT, collecting duct), trace filtrate through filtration, reabsorption, and secretion, and calculate GFR from given inulin clearance data."
  },
  {
    "id": "q56",
    "number": 56,
    "topic": "Renin-Angiotensin-Aldosterone System and Blood Pressure",
    "question": "In cardiovascular-renal integration, diagram the renin-angiotensin-aldosterone system (RAAS), explain how low blood pressure triggers angiotensin II effects, and predict aldosterone actions on sodium and water balance."
  },
  {
    "id": "q57",
    "number": 57,
    "topic": "ADH, Osmoregulation, and Kidney Concentrating Ability",
    "question": "In osmoregulation, explain antidiuretic hormone (ADH) release from the posterior pituitary, interpret aquaporin insertion in collecting duct cells, and predict urine osmolarity changes during dehydration."
  },
  {
    "id": "q58",
    "number": 58,
    "topic": "Skeletal System, Joint Types, and Lever Mechanics",
    "question": "In skeletal biology, classify synovial joint types, diagram a hinge joint with ligaments and cartilage, and apply lever mechanics to a biceps curl with given force and distance values."
  },
  {
    "id": "q59",
    "number": 59,
    "topic": "Integumentary System: Skin Layers and Thermoregulation",
    "question": "In integumentary biology, label epidermis, dermis, and hypodermis layers, explain melanocyte function, and describe vasodilation, vasoconstriction, and sweating in thermoregulation."
  },
  {
    "id": "q60",
    "number": 60,
    "topic": "Endocrine Glands: Thyroid, Parathyroid, and Adrenal Axes",
    "question": "In endocrinology, compare thyroid hormone synthesis and feedback, explain parathyroid hormone effects on blood calcium, and diagram adrenal cortex zones with glucocorticoid and mineralocorticoid roles."
  },
  {
    "id": "q61",
    "number": 61,
    "topic": "Menstrual Cycle Hormones and Ovarian/Uterine Events",
    "question": "In reproductive endocrinology, map FSH, LH, estrogen, and progesterone across the menstrual cycle, correlate hormone peaks with follicular development and endometrial changes, and explain negative feedback control."
  },
  {
    "id": "q62",
    "number": 62,
    "topic": "Spermatogenesis, Oogenesis, and Gamete Maturation",
    "question": "In gametogenesis, compare spermatogenesis and oogenesis timelines, diagram meiotic arrest points in oogenesis, and calculate chromosome number at each stage for 2n=46 human cells."
  },
  {
    "id": "q63",
    "number": 63,
    "topic": "Placental Exchange, Fetal Circulation, and Parturition",
    "question": "In developmental physiology, explain placental nutrient and gas exchange, diagram fetal circulation including foramen ovale and ductus arteriosus, and outline hormonal triggers of parturition."
  },
  {
    "id": "q64",
    "number": 64,
    "topic": "Lymphatic System, Immune Surveillance, and Edema",
    "question": "In lymphatic biology, trace lymph from interstitial fluid to venous return, explain lymph node filtering of pathogens, and relate blocked lymphatic drainage to edema formation."
  },
  {
    "id": "q65",
    "number": 65,
    "topic": "ABO and Rh Blood Groups with Transfusion Compatibility",
    "question": "In hematology, explain ABO antigen and antibody rules, interpret Rh incompatibility in pregnancy, and determine compatible donor units for a patient with given blood type."
  },
  {
    "id": "q66",
    "number": 66,
    "topic": "Hemostasis, Coagulation Cascade, and Clot Resolution",
    "question": "In hemostasis biology, diagram platelet plug formation, outline intrinsic and extrinsic coagulation pathways to fibrin, and explain how plasmin dissolves clots during wound repair."
  },
  {
    "id": "q67",
    "number": 67,
    "topic": "Anemia Types, Hemoglobin, and Oxygen-Carrying Capacity",
    "question": "In clinical physiology, distinguish iron-deficiency, pernicious, and sickle-cell anemia mechanisms, calculate oxygen carrying capacity from hemoglobin concentration, and interpret oxyhemoglobin dissociation shifts."
  },
  {
    "id": "q68",
    "number": 68,
    "topic": "Asthma Pathophysiology and Ventilation-Perfusion Mismatch",
    "question": "In respiratory disease biology, explain bronchoconstriction and inflammation in asthma, interpret spirometry changes (FEV1, FVC), and describe ventilation-perfusion mismatch during an acute attack."
  },
  {
    "id": "q69",
    "number": 69,
    "topic": "Dialysis Principles, GFR Estimation, and Renal Failure",
    "question": "In nephrology, compare hemodialysis and peritoneal dialysis principles, estimate GFR from creatinine clearance, and explain how chronic kidney disease disrupts electrolyte and acid-base homeostasis."
  },
  {
    "id": "q70",
    "number": 70,
    "topic": "Photosynthetic Electron Transport and Proton Motive Force",
    "question": "In photosynthesis biochemistry, diagram Z-scheme electron transport through PSII and PSI, quantify ATP and NADPH output per absorbed photon cycle, and relate proton gradient to chemiosmotic ATP synthesis in chloroplasts."
  },
  {
    "id": "q71",
    "number": 71,
    "topic": "C4 Photosynthesis: Kranz Anatomy and CO2 Concentration",
    "question": "In plant physiology, diagram Kranz anatomy in C4 leaves, explain mesophyll and bundle-sheath roles in concentrating CO2, and compare photosynthetic efficiency of C4 versus C3 plants in hot climates."
  },
  {
    "id": "q72",
    "number": 72,
    "topic": "CAM Pathway, Succulent Adaptation, and Stomatal Timing",
    "question": "In CAM plant biology, explain temporal separation of CO2 uptake and Calvin cycle, diagram nightly malate storage in vacuoles, and relate stomatal opening patterns to water conservation in succulents."
  },
  {
    "id": "q73",
    "number": 73,
    "topic": "Xylem and Phloem Structure with Long-Distance Transport",
    "question": "In vascular plant anatomy, compare xylem vessel elements and tracheids, explain cohesion-tension theory for water ascent, and describe pressure-flow model of phloem translocation."
  },
  {
    "id": "q74",
    "number": 74,
    "topic": "Stomatal Regulation, Transpiration, and Water Use Efficiency",
    "question": "In plant water relations, diagram guard cell turgor control by K+ flux, calculate transpiration rate from given leaf area and water loss, and explain abscisic acid effects during drought."
  },
  {
    "id": "q75",
    "number": 75,
    "topic": "Plant Hormones: Auxin, Gibberellin, Cytokinin, and Ethylene",
    "question": "In plant signaling, compare auxin, gibberellin, cytokinin, and ethylene effects on growth, explain apical dominance and fruit ripening, and interpret a hormone experiment with quantitative shoot elongation data."
  },
  {
    "id": "q76",
    "number": 76,
    "topic": "Photoperiodism, Flowering Loci, and Circadian Control",
    "question": "In plant developmental biology, distinguish short-day, long-day, and day-neutral plants, explain phytochrome role in night-length sensing, and diagram florigen concept in flowering induction."
  },
  {
    "id": "q77",
    "number": 77,
    "topic": "Seed Germination, Dormancy, and Reserve Mobilization",
    "question": "In seed biology, explain dormancy breaking by gibberellin and water imbibition, diagram amylase activation in germinating barley seeds, and track reserve mobilization to support early seedling growth."
  },
  {
    "id": "q78",
    "number": 78,
    "topic": "Fungal Hyphae, Reproductive Structures, and Ecological Roles",
    "question": "In mycology, compare septate and coenocytic hyphae, diagram basidiomycete mushroom life cycle, and evaluate fungal roles as decomposers, pathogens, and mutualists."
  },
  {
    "id": "q79",
    "number": 79,
    "topic": "Protist Diversity, Locomotion, and Disease Examples",
    "question": "In protist biology, classify major protist groups by nutrition and locomotion, diagram Amoeba pseudopodia and Paramecium cilia, and relate Plasmodium life cycle stages to malaria pathogenesis."
  },
  {
    "id": "q80",
    "number": 80,
    "topic": "Eutrophication, Algal Blooms, and Dead Zones",
    "question": "In aquatic ecology, explain how nitrogen and phosphorus runoff triggers algal blooms, diagram dissolved oxygen collapse and fish kills, and propose watershed management to reduce eutrophication."
  },
  {
    "id": "q81",
    "number": 81,
    "topic": "Wetland Ecology, Methane Flux, and Carbon Storage",
    "question": "In wetland biology, compare marsh, swamp, and bog ecosystems, explain anaerobic decomposition and methane production, and estimate carbon storage benefits of wetland conservation."
  },
  {
    "id": "q82",
    "number": 82,
    "topic": "Coral Bleaching, Zooxanthellae Symbiosis, and Reef Resilience",
    "question": "In marine biology, explain coral-zooxanthellae mutualism, interpret sea-surface temperature stress leading to bleaching, and evaluate reef recovery versus collapse scenarios."
  },
  {
    "id": "q83",
    "number": 83,
    "topic": "Invasive Species Dynamics and Biotic Resistance",
    "question": "In invasion ecology, analyze logistic spread of an introduced species with given r and K, explain enemy release and niche opportunity hypotheses, and design biosecurity measures for early detection."
  },
  {
    "id": "q84",
    "number": 84,
    "topic": "Conservation Genetics and Minimum Viable Population",
    "question": "In conservation biology, calculate effective population size from census data and sex ratio, explain inbreeding depression and genetic drift risks, and estimate minimum viable population for a threatened mammal."
  },
  {
    "id": "q85",
    "number": 85,
    "topic": "Epigenetics, DNA Methylation, and Histone Modification",
    "question": "In epigenetics, explain how DNA methylation silences genes, compare euchromatin and heterochromatin states, and interpret how environmental cues can produce heritable expression changes without DNA sequence alteration."
  },
  {
    "id": "q86",
    "number": 86,
    "topic": "RNA Interference, miRNA, and siRNA Gene Silencing",
    "question": "In RNA biology, diagram miRNA and siRNA pathways leading to mRNA degradation or translational block, compare RISC complex function, and propose an RNAi experiment to knock down a target gene."
  },
  {
    "id": "q87",
    "number": 87,
    "topic": "Western Blot, ELISA, and Antibody-Based Detection",
    "question": "In molecular diagnostics, explain SDS-PAGE and Western blot antibody detection, compare direct versus indirect ELISA formats, and interpret quantitative ELISA standard curve data."
  },
  {
    "id": "q88",
    "number": 88,
    "topic": "Mass Spectrometry Proteomics and Protein Identification",
    "question": "In proteomics, outline tandem mass spectrometry (MS/MS) peptide identification, explain how spectral libraries match fragment ions, and interpret a simple protein coverage result from a cell lysate."
  },
  {
    "id": "q89",
    "number": 89,
    "topic": "Flow Cytometry, Cell Sorting, and Fluorescent Markers",
    "question": "In cell biology technology, explain how flow cytometry measures scatter and fluorescence, interpret a two-marker dot plot separating lymphocyte subsets, and describe how FACS sorts live cells."
  },
  {
    "id": "q90",
    "number": 90,
    "topic": "Light and Electron Microscopy, Resolution, and Staining",
    "question": "In microscopy, compare bright-field, fluorescence, and electron microscopy resolution limits, explain why SEM versus TEM differ in sample preparation, and interpret how Gram stain differentiates bacterial cell walls."
  },
  {
    "id": "q91",
    "number": 91,
    "topic": "Induced Pluripotent Stem Cells and Regenerative Medicine Ethics",
    "question": "In stem cell biology, explain how Yamanaka factors reprogram somatic cells to iPSCs, compare embryonic versus induced pluripotent stem cell applications, and discuss ethical constraints in human trials."
  },
  {
    "id": "q92",
    "number": 92,
    "topic": "Gene Therapy Vectors: AAV, Lentivirus, and Delivery Challenges",
    "question": "In gene therapy, compare adeno-associated virus (AAV) and lentiviral vector properties, explain tissue tropism and immune clearance, and evaluate ex vivo versus in vivo delivery for a monogenic disorder."
  },
  {
    "id": "q93",
    "number": 93,
    "topic": "Pharmacogenomics, CYP450 Variants, and Drug Metabolism",
    "question": "In pharmacogenomics, explain how CYP450 enzyme polymorphisms alter drug clearance, interpret poor-metabolizer versus ultra-rapid metabolizer phenotypes, and predict warfarin dosing implications from genotype."
  },
  {
    "id": "q94",
    "number": 94,
    "topic": "Antibiotic Mechanisms and Resistance Evolution",
    "question": "In antimicrobial biology, compare beta-lactam, aminoglycoside, and fluoroquinolone targets, explain horizontal gene transfer of resistance cassettes, and model selection for resistant clones in a hospital outbreak."
  },
  {
    "id": "q95",
    "number": 95,
    "topic": "Biofilms, Quorum Sensing, and Chronic Infections",
    "question": "In microbial ecology, diagram biofilm matrix formation on surfaces, explain quorum sensing signal accumulation, and relate biofilm persistence to antibiotic tolerance in chronic wound infections."
  },
  {
    "id": "q96",
    "number": 96,
    "topic": "Gut Microbiome, Dysbiosis, and Host Metabolism",
    "question": "In microbiome biology, explain how gut commensals aid vitamin synthesis and fiber fermentation, interpret dysbiosis links to inflammation, and outline how diet shifts microbial community composition."
  },
  {
    "id": "q97",
    "number": 97,
    "topic": "Prions, Protein Misfolding, and Neurodegeneration",
    "question": "In molecular pathology, explain prion protein conformational conversion, contrast infectious prion hypothesis with seeded misfolding models, and relate prion-like spread to other neurodegenerative diseases."
  },
  {
    "id": "q98",
    "number": 98,
    "topic": "Synthetic Biology Circuits and Genetic Logic Gates",
    "question": "In synthetic biology, design a two-input genetic AND gate using regulated promoters, explain feedback loops in oscillatory circuits, and discuss biosafety containment for engineered microbes."
  },
  {
    "id": "q99",
    "number": 99,
    "topic": "Metabolomics, Pathway Flux, and Stable Isotope Tracing",
    "question": "In systems biology, interpret a metabolomics heatmap of glycolysis and TCA intermediates, explain 13C isotope tracing through pyruvate, and calculate flux redistribution under hypoxic culture conditions."
  },
  {
    "id": "q100",
    "number": 100,
    "topic": "Biocius comprehensivus II: Advanced Integrative Biology Synthesis",
    "question": "In an advanced integrative biology scenario (Biocius comprehensivus II), estimate effective population size for 120 breeding adults with unequal sex ratio, calculate dialysis clearance from given urea data, interpret a flow-cytometry lymphocyte plot, predict RAAS response to 90/60 mmHg blood pressure, and explain coral bleaching recovery thresholds."
  }
] as BiologyPromptDef[];

export function getBiologyPromptByNumber(n: number): BiologyPromptDef | undefined {
  return BIOLOGY_PROMPTS.find((q) => q.number === n);
}
