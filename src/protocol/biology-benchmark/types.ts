export interface BiologyBenchmarkVerifyResult {
  ok: boolean;
  errors: string[];
}

export type BiologyBenchmarkDifficulty = 'Easy' | 'Mid';

export interface BiologyBenchmarkSpec {
  id: string;
  number: number;
  topic: string;
  question: string;
  year: 1;
  difficulty: BiologyBenchmarkDifficulty;
  verify: (capsuleText: string) => BiologyBenchmarkVerifyResult;
}
