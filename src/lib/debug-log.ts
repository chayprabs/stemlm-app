/** Session debug logging — folded regions in instrumented call sites. */
export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  // #region agent log
  fetch('http://127.0.0.1:7283/ingest/b763f971-f31a-48e3-919a-d645c61a9559', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f4f217' },
    body: JSON.stringify({
      sessionId: 'f4f217',
      location,
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
    }),
  }).catch(() => {});
  // #endregion
}
