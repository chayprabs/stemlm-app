export interface PhysicsBenchmarkVerifyResult {
  ok: boolean;
  errors: string[];
}

export type PhysicsBenchmarkDifficulty = 'Easy' | 'Mid' | 'Tough';

export interface PhysicsBenchmarkSpec {
  id: string;
  number: number;
  topic: string;
  year: 1 | 2 | 3;
  difficulty: PhysicsBenchmarkDifficulty;
  question: string;
  verify: (capsuleText: string) => PhysicsBenchmarkVerifyResult;
}
