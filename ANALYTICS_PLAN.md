# Analytics implementation note

This is a record of the current implementation, not a roadmap.

- `src/lib/analytics.ts` ships no telemetry: `analyticsEnabled()` always returns false and `trackEvent()` is a no-op kept so the call sites stay stable. `src/lib/analytics.test.ts` proves it.
- `sanitizeEventParams()` still allow-lists operational fields only; question text, answers, prompts, URLs, filenames, DOM content, account IDs, and raw errors are rejected at that boundary.
- There is no build-time analytics configuration. `.env.example` only warns never to compile a secret into MV3 JavaScript.
- User-facing statements live in [PRIVACY.md](PRIVACY.md).
