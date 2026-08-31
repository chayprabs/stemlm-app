# Privacy Policy — stemLM

_Last updated: 2026-08-31_

stemLM has no stemLM server, account, or login. It reads the question and answer already present in a supported chat page so it can build the local study view. That content is sent to the chat provider by the provider's own page, not to stemLM.

## Local data

The extension stores settings, saved sessions that you explicitly save, the last-chat reference, and workspace state in browser extension storage. A configured analytics build also stores a random installation ID locally. Uninstalling the extension or clearing its extension storage removes this data.

## Optional analytics

Analytics is disabled unless a distributor supplies both `STEMLM_GA_MEASUREMENT_ID` and `STEMLM_GA_API_SECRET` at build time. With either value empty, `trackEvent()` returns before reading storage or calling the network. The default source/test build is therefore a no-op; this is covered by `src/lib/analytics.test.ts`.

When configured, the extension sends HTTPS POST events to Google's GA4 Measurement Protocol when these actions occur:

| Event | When | Fields sent by stemLM |
| --- | --- | --- |
| `extension_installed` | first install | none beyond the common identifiers |
| `panel_opened` | panel opens from an answer, toolbar, or ask action | platform, source |
| `question_asked` | protocol injection succeeds | platform, subject, injection method |
| `question_solved` | a capsule is accepted | platform, subject, step count, parse/quality counts and status flags |
| `quickcheck_revealed` | a quick-check answer is revealed | platform |
| `followup_used` | a follow-up is sent | platform |
| `session_saved` / `session_unsaved` | a save is added or removed | platform |
| `pdf_exported` | a PDF export succeeds or fails | platform, export method |
| `conversation_loaded` | saved conversation content is loaded | platform, count |
| `extension_error` | a handled launch, parse, or repair error occurs | source, category, family, stable error code, counts, repair result |

Every configured event also contains a random `client_id`, a rolling session identifier, and a fixed engagement-time value required by GA4. It does not contain a user ID, question text, answer text, prompt, follow-up text, selection, URL, filename, DOM content, screenshot, account ID, email address, or raw error message. Event keys and string values are filtered at the analytics boundary.

Google receives the ordinary network metadata required to deliver an HTTPS request and processes Measurement Protocol data under its own policies. stemLM does not add an account identity or advertising identifier. See [Google's Measurement Protocol documentation](https://developers.google.com/analytics/devguides/collection/protocol/ga4).

## Turning analytics off

There is no runtime analytics opt-out in this release. A distributor disables it by leaving either build-time value empty; a user of a configured build must install an unconfigured build, block the GA endpoint, or disable/uninstall the extension. The settings screen's analytics switch is presentation-only and does not change collection.

## Other services

The extension communicates with the supported chat site selected by the user. It may request remote style assets from Google Fonts and KaTeX assets from jsDelivr for presentation and PDF output. Those services receive their normal request metadata; stemLM does not send study content to them.

## Contact

For a privacy question, open an issue in the project repository. For a security issue, follow [SECURITY.md](SECURITY.md).
