import { writeFileSync } from 'node:fs';
import { EE_SPECS_Q51_Q100 } from '../src/protocol/ee-benchmark/specs/q51-q100.ts';

const chunk = EE_SPECS_Q51_Q100.map((e) => ({
  id: e.slug,
  number: e.id,
  topic: e.topic,
  question: e.problemStatement,
}));

writeFileSync(
  new URL('../src/protocol/electrical-prompts/prompts-q51-100.ts', import.meta.url),
  `/** Auto-synced from ee-benchmark/specs/q51-q100.ts — questions only, no answers. */\nimport type { ElectricalPromptDef } from './types';\n\nexport const ELECTRICAL_PROMPTS_Q51_100: ElectricalPromptDef[] = ${JSON.stringify(chunk, null, 2)} as ElectricalPromptDef[];\n`,
);

console.log(`Wrote ${chunk.length} prompts`);
