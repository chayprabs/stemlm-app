/**
 * Fresh Node consumer of the SHIPPED inject payload builder (verification).
 *   node --import tsx --import ./scripts/eval/raw-hook.mjs scripts/eval/inject-launch.mjs
 */
import { register } from 'node:module';
import { writeFileSync } from 'node:fs';

register('./raw-hook.mjs', import.meta.url);
register('./alias-hook.mjs', import.meta.url);
globalThis.__GA_MEASUREMENT_ID__ = '';
globalThis.__GA_API_SECRET__ = '';

const { buildInjectionPayload } = await import('@/src/protocol/builder.ts');

function inspect(label, payload) {
  const composer = payload.composerText;
  const file = payload.fileContent;
  const report = {
    label,
    composerBytes: Buffer.byteLength(composer, 'utf8'),
    fileBytes: Buffer.byteLength(file, 'utf8'),
    hasSentinel: composer.includes('--- stemLM ---'),
    hasFilename: composer.includes('stemlm-protocol.txt'),
    composerHasMeta: composer.includes('@meta'),
    composerHasOutput: composer.includes('OUTPUT:'),
    composerHasPlaybookChapter: /PHYSICS: one move/.test(composer),
    fileHasVersion: /version:\s*2/.test(file),
    fileHasResume: file.includes('@resume'),
    fileHasStepId: file.includes('@step id='),
    fileHasVerify: file.includes('@verify'),
    fileHasUncertainty: file.includes('@uncertainty'),
    fileHasDiagramRegistry: file.includes('DIAGRAM REGISTRY'),
    fileHasWhenNot: file.includes('WHEN NOT TO DRAW'),
    fileHasFollowup: file.includes('FOLLOW-UP CONTRACT'),
    fileNonEmpty: file.length > 0,
  };
  report.ok =
    report.hasSentinel &&
    report.hasFilename &&
    !report.composerHasMeta &&
    !report.composerHasOutput &&
    !report.composerHasPlaybookChapter &&
    report.fileNonEmpty &&
    report.fileHasVersion &&
    report.fileHasResume &&
    report.fileHasStepId &&
    report.fileHasVerify &&
    report.fileHasDiagramRegistry;
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const typedPayload = buildInjectionPayload(
  'Find the range of a projectile launched at 20 m/s at 45 degrees.',
);
const imagePayload = buildInjectionPayload('', { hasImageAttachment: true });
const typed = inspect('typed', typedPayload);
const image = inspect('image-only', imagePayload);
if (process.argv[2]) writeFileSync(process.argv[2], typedPayload.fileContent);
const sameStructure = typed.hasSentinel && image.hasSentinel && typed.fileHasVersion && image.fileHasVersion;
console.log(JSON.stringify({ sameStructure, typedOk: typed.ok, imageOk: image.ok }, null, 2));
if (!typed.ok || !image.ok || !sameStructure) process.exit(1);
