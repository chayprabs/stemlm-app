// Rebuild the notices shipped with the extension from installed production dependencies.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const report = JSON.parse(execSync('pnpm licenses list --prod --json', {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
}));
if (report.error) throw new Error(report.error.message);

const packages = Object.values(report).flat().sort((a, b) => a.name.localeCompare(b.name, 'en'));
const sections = [
  'stemLM — third-party notices',
  'This file includes the installed production dependency closure, including packages that may be removed by bundling. Generated with scripts/release-notices.mjs. License texts remain the work of their respective authors.',
];
// These monorepo packages omit the repository license from their npm tarballs.
// The two pinned upstream tags contain the same text, retained under docs/licenses.
const repositoryLicenses = new Map([
  ['rehype-katex@7.0.1', 'https://github.com/remarkjs/remark-math/blob/rehype-katex%407.0.1/license'],
  ['remark-math@6.0.0', 'https://github.com/remarkjs/remark-math/blob/6.0.0/license'],
]);
let count = 0;
for (const pkg of packages) {
  for (const directory of pkg.paths) {
    const metadata = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    const files = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^(licen[cs]e|copying|notice)(?:$|[._-])/i.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    const repositoryLicense = repositoryLicenses.get(`${metadata.name}@${metadata.version}`);
    if (!files.some((name) => /^(licen[cs]e|copying)/i.test(name)) && !repositoryLicense) {
      throw new Error(`Missing license text: ${metadata.name}@${metadata.version}`);
    }
    sections.push([
      '='.repeat(72),
      `${metadata.name}@${metadata.version}`,
      `License: ${pkg.license}`,
      pkg.homepage ? `Project: ${pkg.homepage}` : '',
      ...files.map((name) => `\n--- ${name} ---\n${readFileSync(join(directory, name), 'utf8').trim()}`),
      repositoryLicense ? `\nLicense source: ${repositoryLicense}\n${readFileSync(join(root, 'docs/licenses/remark-math-MIT.txt'), 'utf8').trim()}` : '',
    ].filter(Boolean).join('\n'));
    count++;
  }
}
sections.push([
  '='.repeat(72),
  'IBM Plex Sans and IBM Plex Mono',
  'License: SIL Open Font License 1.1',
  readFileSync(join(root, 'assets/fonts/ibm-plex/OFL.txt'), 'utf8').trim(),
].join('\n'));

writeFileSync(join(root, 'public/LICENSE.txt'), readFileSync(join(root, 'LICENSE')));
writeFileSync(join(root, 'public/THIRD-PARTY-NOTICES.txt'), `${sections.join('\n\n')}\n`.replace(/[\t ]+$/gm, ''));
console.log(`Wrote stemLM license and ${count} dependency notices plus IBM Plex font license.`);
