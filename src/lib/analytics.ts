/**
 * stemLM analytics — Google Analytics 4 Measurement Protocol.
 *
 * Manifest V3 forbids loading remote scripts (gtag.js), so we POST events
 * directly to the GA4 Measurement Protocol endpoint. This is the officially
 * recommended approach for extensions.
 *
 * IMPORTANT: This module is a SAFE NO-OP until credentials are provided.
 * The user asked us to wire the endpoints now and supply the API later — so
 * fill in the values via env vars (see .env.example) and everything starts
 * flowing. Nothing is sent while the values are empty.
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
  return Boolean(MEASUREMENT_ID && API_SECRET);
}

/** Respect a user opt-out flag stored in settings. */
async function userOptedOut(): Promise<boolean> {
  try {
    const { stemlm_settings } = await browser.storage.local.get('stemlm_settings');
    return Boolean((stemlm_settings as { analyticsOptOut?: boolean } | undefined)?.analyticsOptOut);
  } catch {
    return false;
  }
}

export type StemLmEvent =
  | 'extension_installed'
  | 'panel_opened'
  | 'question_asked'
  | 'question_solved'
  | 'step_reviewed'
  | 'quickcheck_revealed'
  | 'followup_used'
  | 'session_saved'
  | 'pdf_exported'
  | 'conversation_loaded'
  | 'extension_error';

export type EventParams = Record<string, string | number | boolean | undefined>;

const DEBUG = false;

/**
 * Send a single event to GA4. No-ops silently when credentials are absent or
 * the user has opted out. Never throws.
 */
export async function trackEvent(name: StemLmEvent, params: EventParams = {}): Promise<void> {
  try {
    if (!analyticsEnabled()) return;
    if (await userOptedOut()) return;

    const [clientId, sessionId] = await Promise.all([
      getOrCreateClientId(),
      getOrCreateSessionId(),
    ]);

    const cleaned: EventParams = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) cleaned[k] = v;
    }

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
