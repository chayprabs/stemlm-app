# Privacy Policy — stemLM

_Last updated: 2026-08-31_

stemLM has no stemLM server, account, or login. It reads the question and answer already present in a supported chat page so it can build the local study view. That content is sent to the chat provider by the provider's own page, not to stemLM.

## Local data

The extension stores settings, saved sessions that you explicitly save, the last-chat reference, and workspace state in browser extension storage. Uninstalling the extension or clearing its extension storage removes this data.

## Analytics

Analytics is disabled in the distributed build. No GA4 measurement identifier, API secret, client identifier, session identifier, or analytics endpoint is compiled into the MV3 JavaScript. `trackEvent()` remains as a no-op compatibility boundary, covered by `src/lib/analytics.test.ts`.

No telemetry events are sent by this release. The event call sites remain
as no-ops for compatibility and do not retain or transmit study content.

## Other services

The extension communicates with the supported chat site selected by the user. It may request remote style assets from Google Fonts and KaTeX assets from jsDelivr for presentation and PDF output. Those services receive their normal request metadata; stemLM does not send study content to them.

## Contact

For a privacy question, open an issue in the project repository. For a security issue, follow [SECURITY.md](SECURITY.md).
