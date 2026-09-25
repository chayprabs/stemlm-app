/**
 * Analytics compatibility boundary. This release deliberately ships no
 * client-side telemetry endpoint or credential.
 */
/** Analytics is intentionally disabled in the distributed client build. */
export function analyticsEnabled(): boolean {
  return false;
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

/**
 * Keep the call sites stable while ensuring no client-side analytics secret,
 * storage identifier, or network sink is shipped in this release.
 */
export async function trackEvent(_name: StemLmEvent, _params: EventParams = {}): Promise<void> {
  return;
}
