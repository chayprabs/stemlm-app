/**
 * stemLM analytics — Google Analytics 4 Measurement Protocol.
 *
 * Manifest V3 forbids loading remote scripts (gtag.js), so we POST events
 * directly to the GA4 Measurement Protocol endpoint. This is the officially
 * recommended approach for extensions.
 *
 * IMPORTANT: This module is a SAFE NO-OP until both credentials are provided
 * at build time. Nothing is sent while either value is empty.
 *
 *   STEMLM_GA_MEASUREMENT_ID  -> __GA_MEASUREMENT_ID__
 *   STEMLM_GA_API_SECRET      -> __GA_API_SECRET__
 */
import { browser } from 'wxt/browser';

const MEASUREMENT_ID = __GA_MEASUREMENT_ID__;
const API_SECRET = __GA_API_SECRET__;

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const GA_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

const DEFAULT_ENGAGEMENT_TIME_MSEC = 100;
const SESSION_EXPIRATION_MIN = 30;

/** Stable per-install client id, required by GA4. */
async function getOrCreateClientId(): Promise<string> {
  const { stemlm_client_id } = await browser.storage.local.get('stemlm_client_id');
  let clientId = stemlm_client_id as string | undefined;
  if (!clientId) {
    clientId = crypto.randomUUID();
    await browser.storage.local.set({ stemlm_client_id: clientId });
  }
  return clientId;
}

interface SessionRecord {
  session_id: string;
  timestamp: number;
}

/** Rolling 30-minute session id (GA4 convention) so Realtime reports work. */
async function getOrCreateSessionId(): Promise<string> {
  const { stemlm_session } = await browser.storage.session.get('stemlm_session');
  const now = Date.now();
  let record = stemlm_session as SessionRecord | undefined;
  if (record) {
    const ageMin = (now - record.timestamp) / 60000;
    if (ageMin > SESSION_EXPIRATION_MIN) {
      record = undefined;
    } else {
      record.timestamp = now;
      await browser.storage.session.set({ stemlm_session: record });
    }
  }
  if (!record) {
    record = { session_id: now.toString(), timestamp: now };
    await browser.storage.session.set({ stemlm_session: record });
  }
  return record.session_id;
}

/** Whether analytics is configured (credentials present). */
export function analyticsEnabled(): boolean {
  return MEASUREMENT_ID.trim().length > 0 && API_SECRET.trim().length > 0;
}

export type StemLmEvent =
  | 'extension_installed'
  | 'panel_opened'
  | 'question_asked'
  | 'question_solved'
  | 'quickcheck_revealed'
  | 'followup_used'
  | 'session_saved'
  | 'session_unsaved'
  | 'pdf_exported'
  | 'conversation_loaded'
  | 'extension_error';

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

const DEBUG = false;

/**
 * Send a single event to GA4. No-ops silently when credentials are absent.
 * Never throws.
 */
export async function trackEvent(name: StemLmEvent, params: EventParams = {}): Promise<void> {
  try {
    if (!analyticsEnabled()) return;

    const [clientId, sessionId] = await Promise.all([
      getOrCreateClientId(),
      getOrCreateSessionId(),
    ]);

    const cleaned = sanitizeEventParams(params);

    const body = {
      client_id: clientId,
      events: [
        {
          name,
          params: {
            session_id: sessionId,
            engagement_time_msec: DEFAULT_ENGAGEMENT_TIME_MSEC,
            ...cleaned,
          },
        },
      ],
    };

    const endpoint = DEBUG ? GA_DEBUG_ENDPOINT : GA_ENDPOINT;
    const url = `${endpoint}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;
    const res = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[stemLM][analytics]', name, await res.json());
    }
  } catch {
    // Analytics must never break the app.
  }
}
