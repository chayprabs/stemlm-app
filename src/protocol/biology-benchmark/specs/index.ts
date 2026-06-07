import { BIOLOGY_QUESTIONS } from '../../biology-question-bank';
import type {
  BiologyBenchmarkSpec,
  BiologyBenchmarkVerifyResult,
} from '../types';

type Pattern = string | RegExp;

const EXACT_PROMPT_OVERRIDES: Record<string, string> = {
  q01: 'Compare prokaryotic and eukaryotic cells. (a) List five structural differences in a table. (b) Draw and label a prokaryotic cell: cell wall, plasma membrane, nucleoid, ribosome (70S), flagellum, pili, capsule. (c) Why no membrane-bound organelles? Endosymbiotic hypothesis for mitochondria/chloroplasts with two evidence pieces.',
  q02: 'Fluid mosaic model - draw and label phospholipid bilayer, integral/peripheral proteins, cholesterol, glycoproteins, glycolipids. Explain fluid vs mosaic. Distinguish simple diffusion, facilitated diffusion, active transport (primary/secondary) with ATP and examples. RBC in 0.2% and 2% NaCl.',
  q03: "Enzyme kinetics S→P: energy diagram with/without enzyme (Ea, ΔG), Michaelis-Menten (Vmax, Km), competitive vs non-competitive inhibitors, why enzymes can't change ΔG.",
  q04: 'Aerobic respiration flowchart per glucose: glycolysis, pyruvate oxidation, Krebs, oxidative phosphorylation with ATP/NADH/FADH2/CO2. ETC role and final acceptor. NADH 2.5 vs FADH2 1.5 ATP. Fermentation yeast vs muscle.',
  q05: 'Chloroplast diagram and light reactions PSII/PSI, Calvin cycle phases, Rubisco, C3/C4/CAM comparison.',
  q06: 'Cell cycle circle G1/S/G2/M/G0, mitosis stages, checkpoints, chromosome counts 2n=46 at G1, after S, metaphase, end mitosis.',
  q07: 'Four macromolecule classes monomer/bond/examples, protein structure levels, lipids vs polymers, DNA vs RNA.',
  q08: "Replication fork labels, 5'→3' synthesis, semi-conservative/Meselson-Stahl, telomerase.",
  q09: 'Central dogma diagram, transcription, translation, genetic code degenerate/universal/unambiguous.',
  q10: 'Pea genetics R/Y round/wrinkled yellow/green, F1/F2, Mendel laws, test cross 51:48:50:49.',
};

const EASY_IDS = new Set(['q43', 'q47']);

function matchesPattern(capsuleText: string, pattern: Pattern): boolean {
  if (typeof pattern === 'string') {
    return capsuleText.toLowerCase().includes(pattern.toLowerCase());
  }

  const flags = pattern.flags.includes('i') ? pattern.flags : `${pattern.flags}i`;
  const testPattern = new RegExp(pattern.source, flags);
  return testPattern.test(capsuleText);
}

function patternToLabel(pattern: Pattern): string {
  if (typeof pattern === 'string') return `"${pattern}"`;
  return `/${pattern.source}/${pattern.flags}`;
}

function createPatternVerifier(patterns: Pattern[]): (capsuleText: string) => BiologyBenchmarkVerifyResult {
  return (capsuleText: string): BiologyBenchmarkVerifyResult => {
    if (!capsuleText.trim()) {
      return { ok: false, errors: ['Capsule text is empty.'] };
    }

    const missing = patterns.filter((pattern) => !matchesPattern(capsuleText, pattern));
    if (missing.length === 0) {
      return { ok: true, errors: [] };
    }

    return {
      ok: false,
      errors: [
        `Missing required concept patterns: ${missing.map(patternToLabel).join(', ')}`,
      ],
    };
  };
}

const QUESTION_BANK_SORTED = [...BIOLOGY_QUESTIONS].sort((a, b) => a.number - b.number);

if (QUESTION_BANK_SORTED.length !== 50) {
  throw new Error(`Expected 50 biology questions, found ${QUESTION_BANK_SORTED.length}.`);
}

export const BIOLOGY_BENCHMARK_SPECS: BiologyBenchmarkSpec[] = QUESTION_BANK_SORTED.map((question) => {
  const patterns: Pattern[] = question.verifiedPatterns.slice(0, 8);

  return {
    id: question.id,
    number: question.number,
    topic: question.topic,
    question: EXACT_PROMPT_OVERRIDES[question.id] ?? question.question,
    year: 1,
    difficulty: EASY_IDS.has(question.id) ? 'Easy' : 'Mid',
    verify: createPatternVerifier(patterns),
  };
});
