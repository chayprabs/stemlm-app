# Analytics implementation note

This is a record of the current implementation, not a roadmap.

- `src/lib/analytics.ts` uses the GA4 Measurement Protocol only when both build-time constants are non-empty.
- The default/test build returns before storage access or `fetch`; `src/lib/analytics.test.ts` proves that no-op.
- Only documented operational fields are accepted. Question text, answers, prompts, URLs, filenames, DOM content, account IDs, and raw errors are rejected at the telemetry boundary.
- The event names and collection timing are documented in [PRIVACY.md](PRIVACY.md).
- Keep `.env` local and uncommitted; `.env.example` contains empty placeholders.
