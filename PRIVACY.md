# Privacy Policy — stemLM

_Last updated: 2026-09-27_

stemLM has no stemLM server, account, or login. It reads the question and answer already present in a supported chat page so it can build the local study view. That content is sent to the chat provider by the provider's own page, not to stemLM.

## Local data

The extension stores settings, saved sessions that you explicitly save, the last-chat reference, and workspace state in browser extension storage. Uninstalling the extension or clearing its extension storage removes this data.

- **Saved questions** stay until you delete them. stemLM never removes a saved answer to make room; when storage is full it tells you instead.
- **Session storage** (cleared when the browser closes) holds each chat tab's current study workspace so a reloaded tab can restore its panel, pending panel actions, the cross-tab copy of your open answers when "Share sessions across tabs" is on, and the short hand-off used to export a PDF (deleted once the export page reads it). It contains only study content already shown in the chat. stemLM's own scripts in the chat tab can read it; web pages cannot read extension storage.

## Permissions

- **Access to claude.ai, gemini.google.com and grok.com**: read the answer and add the stemLM **+** and study panel. stemLM runs on no other site.
- **storage** and **unlimitedStorage**: settings and saved questions, without a size limit that would force deleting saved answers.
- **tabs**: open the chat sites, the saved-question library and settings, and find the chat tab to open the panel in.
- **downloads**: save exported PDFs to your Downloads folder.
- **scripting**: after stemLM is installed or updated, add it to chat tabs that were already open, so they work without a refresh.

## Analytics

Analytics is disabled in the distributed build. No GA4 measurement identifier, API secret, client identifier, session identifier, or analytics endpoint is compiled into the MV3 JavaScript. `trackEvent()` remains as a no-op compatibility boundary, covered by `src/lib/analytics.test.ts`.

No telemetry events are sent by this release. The event call sites remain
as no-ops for compatibility and do not retain or transmit study content.

## Other services

The extension communicates only with the supported chat site selected by the user. Fonts (IBM Plex, KaTeX) and every other asset ship inside the extension, so no font service or CDN receives a request from stemLM, in the chat tab, the extension pages or PDF export.

## Contact

For a privacy question, open an issue in the project repository. For a security issue, follow [SECURITY.md](SECURITY.md).
