import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from '@/src/lib/figure/compile';
import { canonicalizeDiagramType } from '@/src/lib/figure/catalog';
import { assembleProtocolFile } from './protocol';
import { renderDiagramRegistry } from './registries';

// D2: the Guide advertises only families that render faithfully, and teaches each one by example.
function advertisedFamilies(): string[] {
  return renderDiagramRegistry()
    .split('\n')
    .filter((line) => /^[a-z][a-z0-9.-]*\t/.test(line) && !line.startsWith('type\t'))
    .map((line) => line.split('\t', 1)[0]!);
}

function specimens(): Array<{ type: string; content: string }> {
  const pattern = /^@diagram\b[^\n]*\btype=(\S+)[^\n]*\n([\s\S]*?)^@enddiagram\s*$/gm;
  return [...assembleProtocolFile().matchAll(pattern)]
    .filter((match) => !/^<.*>$/.test(match[1]!))
    .map((match) => ({ type: canonicalizeDiagramType(match[1]!), content: match[2]!.trim() }));
}

describe('Guide specimens', () => {
  it('teaches every advertised family with at least one compiling specimen', async () => {
    const families = advertisedFamilies();
    expect(families.length).toBeGreaterThan(5);
    const shipped = specimens();
    for (const family of families) {
      const own = shipped.filter((specimen) => specimen.type === canonicalizeDiagramType(family));
      expect(own.length, `no specimen for advertised family ${family}`).toBeGreaterThan(0);
      for (const specimen of own) {
        const result = await compileDiagramSpec(specimen);
        expect(result.ok, result.ok ? family : `${family}: ${result.reason}`).toBe(true);
      }
    }
  });

  it('ships no specimen for a family it does not advertise', () => {
    const advertised = new Set(advertisedFamilies().map(canonicalizeDiagramType));
    for (const specimen of specimens()) expect(advertised.has(specimen.type), `unadvertised specimen ${specimen.type}`).toBe(true);
  });
});
