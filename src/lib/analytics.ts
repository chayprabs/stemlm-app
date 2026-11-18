/**
 * Usage analytics: content-free events to PostHog, from store installs only.
 *
 * The PostHog project key is WXT_POSTHOG_KEY in `.env.production.local`, which git ignores, so a
 * dev build, the tests, CI and anyone building from source send nothing. A copy loaded unpacked
 * has no `update_url` in its manifest and sends nothing either: only installs from a store count.
 * An event carries the fields in ANALYTICS_PARAM_KEYS, the version and a random install id; never
 * question text, answers, chat links or error messages. Settings > Share usage statistics stops it.
 */
import { browser } from 'wxt/browser';
import { getSettings } from './settings';

const CAPTURE_URL = 'https://us.i.posthog.com/i/v0/e/';
const INSTALL_ID_KEY = 'stemlm_analytics_id';
export const TRACK_MESSAGE = 'stemlm:track' as const;

const EVENTS = [
  'extension_installed',
  'panel_opened',
  'question_asked',
  'question_solved',
  'quickcheck_revealed',
  'followup_used',
  'session_saved',
  'session_unsaved',
  'pdf_exported',
  'conversation_loaded',
  'extension_error',
] as const;

export type StemLmEvent = (typeof EVENTS)[number];

export type EventParams = Record<string, string | number | boolean | undefined>;

const ANALYTICS_PARAM_KEYS = new Set([
  'platform',
  'subject',
  'injection_method',
  'source',
  'steps',
  'parse_status',
  'warnings_count',
  'step_quality_warnings_count',
  'diagram_warnings_count',
  'step_work_ok',
  'had_svg',
  'had_mermaid',
  'family',
  'parse_error_code',
  'repair_used',
  'method',
  'count',
  'where',
  'kind',
]);

/** Keep telemetry operational and content-free at the last boundary. */
export function sanitizeEventParams(params: EventParams): EventParams {
  const cleaned: EventParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ANALYTICS_PARAM_KEYS.has(key) || value === undefined) continue;
    if (typeof value === 'string' && !/^[A-Za-z0-9_.-]{1,64}$/.test(value)) continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

declare global {
  interface ImportMetaEnv { readonly WXT_POSTHOG_KEY?: string }
  interface ImportMeta { readonly env: ImportMetaEnv }
}

/**
 * WXT_POSTHOG_KEY, written into the bundle at build time ('' when the build had none). Spelled out
 * in full: the build and the tests replace only the literal `import.meta.env.NAME`.
 */
const projectKey = (): string => import.meta.env.WXT_POSTHOG_KEY ?? '';

/** A build with a project key, installed from a store. */
export function analyticsEnabled(): boolean {
  try {
    return projectKey() !== '' && 'update_url' in browser.runtime.getManifest();
  } catch {
    return false;
  }
}

let installId: Promise<string> | undefined;

/** One random id per install, kept in extension storage; no account, no device details. */
function getInstallId(): Promise<string> {
  installId ??= (async () => {
    const stored = (await browser.storage.local.get(INSTALL_ID_KEY))[INSTALL_ID_KEY];
    if (typeof stored === 'string' && stored) return stored;
    const id = crypto.randomUUID();
    await browser.storage.local.set({ [INSTALL_ID_KEY]: id });
    return id;
  })().catch((err) => {
    installId = undefined;
    throw err;
  });
  return installId;
}

/** Send one event from an extension page or the background service worker. */
export async function sendEvent(name: StemLmEvent, params: EventParams): Promise<void> {
  if (!analyticsEnabled() || !(await getSettings()).shareUsage) return;
  await fetch(CAPTURE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: projectKey(),
      event: name,
      distinct_id: await getInstallId(),
      properties: {
        ...sanitizeEventParams(params),
        version: browser.runtime.getManifest().version,
        $process_person_profile: false,
      },
    }),
  });
}

/** Record an event. Never throws; callers do not wait for it. */
export async function trackEvent(name: StemLmEvent, params: EventParams = {}): Promise<void> {
  if (!analyticsEnabled()) return;
  const properties = sanitizeEventParams(params);
  try {
    if (globalThis.location?.protocol.endsWith('-extension:')) await sendEvent(name, properties);
    // A content script runs inside the chat page: the background sends, so the page sees no request.
    else void browser.runtime.sendMessage({ type: TRACK_MESSAGE, name, properties }).catch(() => {});
  } catch {
    /* analytics never breaks stemLM */
  }
}

export function isTrackMessage(msg: unknown): msg is { type: typeof TRACK_MESSAGE; name: StemLmEvent; properties: EventParams } {
  const rec = msg as { type?: unknown; name?: unknown; properties?: unknown } | null;
  return rec?.type === TRACK_MESSAGE && EVENTS.includes(rec.name as StemLmEvent) &&
    typeof rec.properties === 'object' && rec.properties !== null;
}
