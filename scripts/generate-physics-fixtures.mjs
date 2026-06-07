#!/usr/bin/env node
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PHYSICS_SPECS } from '../src/protocol/physics-benchmark/specs/index.ts';
import { generatePhysicsCapsule } from '../src/protocol/physics-benchmark/ai-client.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_DIR = path.resolve(__dirname, '../src/protocol/physics-benchmark/fixtures');

function parseFlags(argv) {
  const flags = {
    overwrite: false,
    limit: null,
    only: null,
  };

  for (const arg of argv) {
    if (arg === '--overwrite') {
      flags.overwrite = true;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const value = Number(arg.slice('--limit='.length));
      if (Number.isFinite(value) && value > 0) flags.limit = Math.floor(value);
      continue;
    }
    if (arg.startsWith('--only=')) {
      flags.only = new Set(
        arg
          .slice('--only='.length)
          .split(',')
          .map((part) => part.trim().toLowerCase())
          .filter(Boolean),
      );
    }
  }

  return flags;
}

function selectSpecs(flags) {
  let selected = PHYSICS_SPECS;
  if (flags.only) {
    selected = selected.filter((spec) => flags.only.has(spec.id.toLowerCase()));
  }
  if (flags.limit !== null) {
    selected = selected.slice(0, flags.limit);
  }
  return selected;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const specs = selectSpecs(flags);
  let verifyPhysicsCapsule = null;

  if (specs.length === 0) {
    console.log('No specs selected. Use --only=q01,q02 or increase --limit.');
    return;
  }

  try {
    const verifyModule = await import('../src/protocol/physics-benchmark/verify-capsule.ts');
    verifyPhysicsCapsule = verifyModule.verifyPhysicsCapsule;
  } catch {
    console.warn('Verifier module unavailable in this runtime. Proceeding without local verification.');
  }

  await mkdir(FIXTURE_DIR, { recursive: true });

  console.log(`Generating fixtures for ${specs.length} spec(s)...`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const spec of specs) {
    const outPath = path.join(FIXTURE_DIR, `${spec.id}.stemlm`);
    const exists = await fileExists(outPath);
    if (exists && !flags.overwrite) {
      skipped += 1;
      console.log(`- ${spec.id}: skipped (already exists)`);
      continue;
    }

    try {
      const capsule = await generatePhysicsCapsule(spec.question, 'Physics');
      const verification = verifyPhysicsCapsule
        ? await verifyPhysicsCapsule(spec, capsule)
        : { ok: true, errors: [] };
      await writeFile(outPath, capsule, 'utf8');

      generated += 1;
      const status = verification.ok ? 'ok' : `warnings/errors (${verification.errors.length})`;
      console.log(`- ${spec.id}: saved (${status})`);
      if (!verification.ok) {
        for (const error of verification.errors) {
          console.log(`  • ${error}`);
        }
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`- ${spec.id}: failed - ${message}`);
    }
  }

  console.log(
    `Done. generated=${generated}, skipped=${skipped}, failed=${failed}, output=${FIXTURE_DIR}`,
  );

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
