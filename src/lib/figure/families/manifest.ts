/**
 * Every extension family's manifest. Light by design: this module is reachable from the capsule
 * parser, which runs in the chat-page content script.
 */
import type { FamilyManifest } from './types';
import { STATS_MANIFESTS } from './packs/stats.manifest';
import { GEOMETRY_MANIFESTS } from './packs/geometry.manifest';
import { CS_MANIFESTS } from './packs/cs.manifest';
import { SCIENCE_MANIFESTS } from './packs/science.manifest';

export const FAMILY_MANIFESTS: readonly FamilyManifest[] = [
  ...STATS_MANIFESTS,
  ...GEOMETRY_MANIFESTS,
  ...CS_MANIFESTS,
  ...SCIENCE_MANIFESTS,
];

export function familyManifest(token: string): FamilyManifest | undefined {
  return FAMILY_MANIFESTS.find((manifest) => manifest.token === token);
}
