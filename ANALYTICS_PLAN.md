# stemLM Analytics and Updates Plan

Status: approved design for a later implementation session. This document contains no implementation code.

## Executive decision

Use PostHog Cloud US through `e.stemlm.app`. Run one analytics client in the MV3 background service worker; all other extension contexts send typed event messages to it. Analytics is anonymous, minimal, enabled by default, and has a prominent settings opt-out. Capture only four versioned events. Do not capture page content, prompts, answers, URLs, DOM activity, errors, session replay, or email addresses.

For update emails, Chrome Web Store does not provide installer addresses. Offer an optional subscription after the first successful export and permanently in Settings. Request `identity.email` only after the user clicks the subscription action, show the retrieved address for confirmation, and offer typed-email fallback. Send it to a server endpoint on `stemlm.app`; never send email to PostHog or embed an email-provider secret in the extension.

## Phase 1 audit: current repository

### Extension and build

- `wxt.config.ts` is the source manifest configuration. The generated `.output/chrome-mv3/manifest.json` is Manifest V3.
- Current permissions: `storage`, `tabs`, and `downloads`.
- Current host permissions cover ChatGPT, Claude, Gemini, Grok, Google Fonts, and Google Analytics.
- No source `content_security_policy` is present. The generated manifest has no custom CSP entry.
- Background entry point: `entrypoints/background.ts`, emitted as `background.js`. The generated manifest does not set `background.type: "module"`.
- Web-accessible resources are generated for extension icons and content-script CSS.
- WXT `0.20.26` uses Vite. Source is bundled; files are not shipped raw.
- Build-time values are currently injected from `STEMLM_GA_MEASUREMENT_ID` and `STEMLM_GA_API_SECRET` in `wxt.config.ts`.
- There is an options page and popup. There is no side panel.
- The source says `options_ui.open_in_tab: true`; the inspected generated output said `false`. Treat the generated output as stale until a clean build proves otherwise.

### Runtime behavior

- `entrypoints/background.ts` handles install tracking, theme messages, `whoami`, background launch, and currently sends raw/truncated error strings. It has no important module-scope state that assumes permanent service-worker lifetime.
- Content scripts match ChatGPT, Claude, Gemini, and Grok. `src/platforms/detect.ts` selects the platform from `location.hostname`.
- The solve flow begins in `src/content/controller.ts` at `StemController.inject()` and ends when platform injection succeeds or fails. The current `question_asked` call occurs only after successful injection.
- Panel-opening paths currently exist in `entrypoints/content/index.ts`, `src/lib/panel-remote.ts`, and `src/components/OverlayButton.tsx`.
- Export paths are in `src/lib/pdf.ts`; saved-session export also exists in `src/lib/saved-sessions.ts` and `src/components/SavedSessionList.tsx`.

### Data, errors, and LLMs

- Settings, enabled state, saved sessions, last chat, and the client UUID use `chrome.storage.local`. Session/workspace/action state uses `chrome.storage.session`. `chrome.storage.sync` is not used.
- `src/lib/settings.ts` is the settings schema and migration layer.
- Error handling exists, but the current analytics path transmits raw/truncated error messages. That is unacceptable for production telemetry and must be removed.
- stemLM does not call an LLM API directly. It injects into the host product; the user's ChatGPT/Claude/Gemini/Grok account pays. No stemLM LLM proxy or BYOK flow is present.

### Repository hygiene

- `.env` and `.env.local` are ignored. Broader `.env.*` patterns are not yet covered.
- `.env.example` exists and contains the current Google Analytics variable names.
- Legal files exist under `docs/legal/`, but canonical root `LICENSE` and `PRIVACY.md` files are not present. The privacy text is stale.
- Existing telemetry is Google Analytics Measurement Protocol in `src/lib/analytics.ts`.
- No hardcoded live credential was found in the current tree.
- A scan of 348 commits found no credential-shaped committed secret. This is evidence from pattern scanning, not a cryptographic guarantee.
- The worktree already contains user changes. Implementation must preserve unrelated modifications.

## A — Decisions

| # | Decision | Reasoning and rejected alternative | Confidence / change trigger |
|---|---|---|---|
| 1 | Use PostHog Cloud US. | The company explicitly rejects EU Cloud. Global students can still use the extension; disclose US processing. Rejected EU residency because it conflicts with the business decision. | High; change only for a binding customer or legal requirement. |
| 2 | Ingest through `https://e.stemlm.app`. | A first-party managed reverse proxy reduces blocker loss and avoids permanently publishing PostHog's hostname in the extension contract. Direct ingest is simpler initially but harder to change across installed versions. | High. |
| 3 | Treat the endpoint as expensive to reverse. | Changing it requires DNS/proxy work plus a new signed extension release if CSP/host permissions or bundled config change; users update asynchronously. Choose the permanent hostname before code. | High. |
| 4 | Keep PostHog on its free plan with no payment method. | PostHog currently says Product Analytics includes 1M events/month free, one project, one-year retention, and usage stops when limits are reached without a card. This is the strongest bill guard. | High, but re-check pricing before launch. |
| 5 | Add a client-side event budget as defense in depth. | A public project token can be copied and flooded; it cannot be kept secret. Limit stemLM itself to the four allowlisted events and deduplicate install. This cannot stop a malicious party using the public token. | High. |
| 6 | Run one PostHog client in the background service worker. | It gives one identity and one transport. Content scripts, popup, and options send typed messages. Rejected one SDK per context because it multiplies bundles, queues, defaults, and identity failure modes. | High. |
| 7 | Bundle the extension-safe PostHog build and all executable code locally. | MV3 prohibits remotely hosted executable code. Use PostHog's browser-extension build with external dependency loading disabled. Rejected CDN-loaded SDKs and dynamic remote modules. | High. |
| 8 | Use one anonymous random installation ID in `chrome.storage.local`. | It survives restarts and is shared across contexts. Do not call `identify`, merge it with email, use host account IDs, or claim cross-device identity. Reinstall/profile reset creates a new user. | High. |
| 9 | Use memory persistence inside PostHog; own durable identity in Chrome storage. | Service-worker globals disappear and Web Storage is unavailable there. Rejected cookies/localStorage and SDK-generated per-context IDs. | High. |
| 10 | Disable autocapture and automatic page views everywhere. | Content scripts run inside private third-party pages, so generic DOM/click/URL capture is disproportionate and risky. Only explicit allowlisted events are permitted. | High. |
| 11 | Never enable session replay for stemLM's injected UI. | Replay could observe sensitive educational work and surrounding host-page content. Masking is not a sufficient reason to record third-party pages. | High. |
| 12 | Make delivery best-effort in v1; no durable queue. | Analytics must never block product actions. A terminated worker may lose an event. A durable queue adds duplicate, retention, and wake-up complexity that four directional metrics do not justify. | Medium; add a bounded queue only if measured loss materially distorts decisions. |
| 13 | Use Product Analytics now; use Feature Flags later only for emergency kill switches or staged releases. | Analytics answers the current questions. Flags can help shipped clients that update slowly but add network and lifecycle complexity. Rejected flags in v1. | High. |
| 14 | Defer Experiments, Surveys, and sanitized Error Tracking. | They require more traffic, UI, or privacy design. Existing raw error telemetry must be deleted, not migrated. | High. |
| 15 | Do not use Session Replay, Web Analytics/autocapture, LLM Analytics, Group Analytics, Heatmaps, or replay-based tools. | stemLM neither owns the host DOM nor sends LLM requests itself, and has no organization-level entity model. These products add no proportionate v1 value. | High. |
| 16 | Defer Data Warehouse/CDP, SQL workflows, MCP, notebooks, logs, and advanced data tooling. | Four events and zero users do not justify another data system. PostHog's built-in insights are sufficient. | High. |
| 17 | Start with exactly four events. | `extension_installed_v1`, `panel_opened_v1`, `solve_started_v1`, and `solution_exported_v1` measure acquisition, activation, core intent, and high-value output. More events at zero users create false precision. | High. |
| 18 | Version event semantics in the event name and freeze each version. | Shipped clients cannot be backfilled or instantly updated. If meaning changes, emit `_v2`; never silently reinterpret `_v1`. | High. |
| 19 | Watch DAU/WAU/MAU, activation, and export conversion. | The decisive questions are whether people return, attempt the core action, and value the output enough to export it. Avoid a large vanity dashboard. | High. |
| 20 | Send only explicit operational metadata. | Never send prompts, answers, follow-ups, DOM, URLs, titles, files, saved solutions, chat IDs, raw errors, inferred subject, email, or host-account identity. | High. |
| 21 | Analytics is default-on with a visible settings opt-out. | This matches the owner's strict product decision. The Web Store's general policy asks for affirmative informed consent, while its newer troubleshooting guidance says a prominent listing disclosure can be sufficient and recommends opt-out. This contradiction creates review/legal risk. | Medium/low; raise confidence with written counsel or Chrome Web Store support confirmation. |
| 22 | Use a prominent pre-install listing disclosure plus a nonblocking first-run notice. | This is the best defensible version of default-on analytics: explain the four events, US processing, anonymous ID, and opt-out before install and again in-product. Do not hide or prevaricate. | Medium because of the policy contradiction above. |
| 23 | Keep public and secret credentials categorically separate. | The PostHog project token and ingest host are public configuration. PostHog personal/private keys and the email-provider key are genuine secrets and must never enter extension code, artifacts, examples, or browser storage. | High. |
| 24 | Accept that published extension configuration cannot be hidden. | Anyone can unzip the package or inspect network requests. We protect server credentials and prevent accidental fork pollution; we do not pretend the public token is secret. | High. |
| 25 | Make analytics compile to a no-op unless an explicit production token is injected. | Forks and ordinary local builds then cannot pollute production. Production CI supplies the token. Rejected a checked-in default token. | High. |
| 26 | Separate local/test/prod by project and build channel. | Local builds default to disabled. CI smoke tests use a separate PostHog test project; release builds alone use production. Rejected an `is_dev` property in one project because it still corrupts totals. | High. |
| 27 | Make root `PRIVACY.md` and root `LICENSE` canonical. | Publish the same privacy content at `stemlm.app/privacy` and use it for Web Store disclosures. Rejected independently maintained copies that drift. | High. |
| 28 | Do not expect Chrome Web Store to provide installer emails. | The store provides aggregate install/usage metrics, not a mailing list. Email collection must be a separate, voluntary subscription. | High. |
| 29 | Ask for `identity`/`identity.email` only at subscription time as optional permissions. | This avoids an install-time email warning. After a user clicks Subscribe, retrieve the signed-in Chrome address, show a masked confirmation, and offer typed fallback if denied or unavailable. | Medium; verify the exact generated warning and optional-permission behavior in a packed test before release. |
| 30 | Keep newsletter identity completely separate from analytics identity. | Send the confirmed email only to `https://stemlm.app/api/subscribe`; never attach it to a PostHog event or distinct ID and never store the full email locally. | High. |
| 31 | Use a server-side email provider integration, recommended Resend. | The extension calls a narrow stemLM endpoint; `RESEND_API_KEY` stays in server hosting secrets. Resend's current free tier is adequate for a small launch. Rejected direct provider calls from the extension because the key would be public. | Medium; change provider if the company already has another compliant mailing system. |
| 32 | Show the updates CTA after the first successful live-panel export and always in Settings. | It asks at a moment of demonstrated value without blocking install or solve. Do not repeatedly nag; denial/dismissal must be respected. | Medium; change if measured subscription quality is poor. |

### Explicit tensions and likely disagreement

- Default-on analytics is in tension with the strongest reading of Chrome's affirmative-consent policy and privacy-first expectations for an open-source technical audience. This is the largest unresolved risk; the plan mitigates it but cannot erase it.
- A reverse proxy improves delivery but makes `stemlm.app` part of critical analytics infrastructure and introduces PostHog's proxy processor. Availability and disclosure must be maintained.
- Optional Chrome email access improves subscription conversion but may feel intrusive. The typed fallback and just-in-time request are mandatory.
- The recommendation most likely to be challenged is refusing session replay and autocapture. Keep that refusal: stemLM operates on pages containing private work.

## B — Event specification

### Event rules

- Event names are lowercase snake case and end in an immutable schema version: `_v1`.
- An event's meaning and allowed property values never change. Add `_v2` for a semantic change and maintain both definitions while old clients remain active.
- The background validates event name and properties against an allowlist. Unknown events, unknown properties, invalid enum values, and oversized strings are dropped.
- No analytics call may affect, delay, retry, or fail a user action.
- The analytics wrapper must be a no-op when analytics is disabled or when the build lacks a token.

### Standard properties on every event

| Property | Type | Allowed value/source | Purpose |
|---|---|---|---|
| `schema_version` | integer | exactly `1` | Machine-checkable payload contract. |
| `extension_version` | string | `chrome.runtime.getManifest().version` | Compare adoption and regressions across shipped clients. |
| `build_channel` | enum | `production`, `test` | Guard dashboards from test traffic. Local development sends nothing. |
| `origin_context` | enum | `background`, `content`, `popup`, `options`, `saved_library` | Diagnose which surface originated the semantic event without page details. |
| `analytics_test` | boolean | `false` in production, `true` in test | A second filter and production assertion. |

The background supplies `distinct_id` from the random installation UUID. It is transport identity, not an event property owned by call sites. Do not send PostHog's automatic URL, pathname, referrer, screen, page title, browser-location, or DOM properties. If the selected SDK version cannot guarantee that property allowlist after inspecting the actual request, do not release it; replace only the background transport with PostHog's documented capture endpoint and an explicit JSON payload.

### Approved events

| Event | Where it fires | Properties beyond standard | Exact firing condition | Question answered |
|---|---|---|---|---|
| `extension_installed_v1` | `entrypoints/background.ts` — `chrome.runtime.onInstalled` listener | none | Once when `details.reason === "install"`; never for update, browser restart, or background restart. | How many new installations occurred? |
| `panel_opened_v1` | `entrypoints/content/index.ts` answer-start callback; `src/lib/panel-remote.ts` `handleStemLmPanelMessage`; `src/components/OverlayButton.tsx` `onMain` | `platform`: `chatgpt` \| `claude` \| `gemini` \| `grok`; `source`: `answer` \| `toolbar` \| `ask_here` \| `composer_button` | On a real hidden-to-visible transition only. Do not emit on render, redundant open commands, or close. | How many people are active, how often do they open stemLM, and which entry point works? |
| `solve_started_v1` | `src/content/controller.ts` — `StemController.inject()` | `platform`: same enum; `injection_method`: `attachment` \| `text` | After stemLM successfully hands the solve request to the host composer. Do not emit merely on click or on failed injection. | What share of active users attempt the core solve action, and how? |
| `solution_exported_v1` | `src/lib/pdf.ts` — `exportSessionPdf()` and `downloadSessionPdf()` | `platform`: same enum; `method`: `print` \| `download` | Only after the print/export flow is successfully opened or the download completes. Never emit failure. | What share of active/solving users reach a high-value portable result? |

### Explicitly rejected events and properties

- Rejected by product decision: solve success/failure, follow-up started/succeeded, solution saved, export failure.
- Rejected for privacy: question text, answer text, follow-up text, generated HTML/Markdown, attachment/file names or contents, saved-session content, DOM selectors, clicks, keystrokes, scrolls, screenshots, recordings, full or partial URLs, path/query/hash, referrer, page title, host conversation IDs, host account IDs, email, raw errors, stack traces, and inferred STEM subject.
- Rejected as noise: worker started, content script loaded, popup viewed, settings opened, heartbeat, browser/version defaults, and every UI interaction.

### Metric definitions

1. **Active users:** DAU/WAU/MAU are unique anonymous installation IDs with at least one `panel_opened_v1`; this excludes passive installs.
2. **Activation:** unique installers who emit `solve_started_v1` within seven days of `extension_installed_v1`. Also show panel-to-solve conversion when install attribution is unavailable after reinstall/reset.
3. **Value conversion:** unique users with `solution_exported_v1` divided by unique users with `solve_started_v1`, using 7-day and 28-day windows.

Supporting breakdowns only: platform, extension version, panel source, and injection/export method. Do not turn every breakdown into a top-level KPI.

## C — Manual steps

Perform these in order. Items marked **BEFORE CODE** must be complete before the implementation session changes extension files.

1. **BEFORE CODE — Create PostHog Cloud US projects.** Create separate `stemLM Production` and `stemLM Test` projects. Do not add a payment method. Confirm the account UI still says usage stops at the free limit.
2. **BEFORE CODE — Record public configuration securely.** Copy each project's public project token and US UI host to the CI secret store/password manager. The token is public by design, but keeping production injection in CI prevents casual fork pollution.
3. **BEFORE CODE — Configure privacy in both projects.** Enable IP discarding and disable location enrichment if those exact controls are available in the current UI. Disable autocapture, page views, session replay, surveys, and any default capture not required by the four events. If a named control no longer exists, record it as unverified and validate payloads instead of guessing.
4. **BEFORE CODE — Provision the managed proxy.** In PostHog, create the managed reverse proxy for `e.stemlm.app`, add the required DNS record, wait for TLS, and verify that PostHog's health/capture route works. Do not substitute another hostname after implementation begins.
5. **BEFORE CODE — Fix the public privacy contract.** Approve the exact Web Store disclosure and `PRIVACY.md` language: four events, random install ID, US processing, PostHog, proxy processor, retention, default-on behavior, opt-out path, prohibited fields, deletion/contact method, and separate voluntary email subscription.
6. **BEFORE NEWSLETTER CODE — Create the mailing setup.** Create the Resend account (or chosen equivalent), verify a sending subdomain such as `updates.stemlm.app`, create a `Product updates` topic/audience, and place `RESEND_API_KEY` only in the website/backend host's secret store.
7. **BEFORE NEWSLETTER CODE — Define the server contract.** `POST https://stemlm.app/api/subscribe` accepts a normalized email plus consent metadata, validates and rate-limits requests, records consent time/source/privacy version, adds the contact to the updates topic, and returns a generic response. Provide an unsubscribe/manage endpoint or provider link. Do not accept an analytics ID.
8. Configure release CI with production public token, `https://e.stemlm.app`, `https://us.posthog.com`, `production`, and the subscription endpoint. Configure a separate test build with only the test token and `test` channel.
9. After implementation verification, create only three PostHog insights: active users, activation funnel, and export conversion. Add a small version/platform breakdown to each where useful.
10. Publish root `PRIVACY.md` verbatim at `https://stemlm.app/privacy`, link it in the Chrome Web Store, and complete the store's data-use disclosure consistently.
11. Put a prominent short analytics disclosure in the Web Store listing before release. Do not rely only on a buried privacy-policy link.
12. Upload the packed build only after all checks in sections E and F pass in a clean Chrome profile.

## D — Implementation steps

Each step has a proof gate. Do not move forward until its verification passes.

### 1. Freeze infrastructure and build contracts

Files: `wxt.config.ts`, `.gitignore`, `.env.example`, CI release workflow if present/added.

- Replace Google Analytics defines with public PostHog configuration and explicit build channel.
- `.env.example` contains empty/safe placeholders only:
  - `STEMLM_POSTHOG_PROJECT_TOKEN=`
  - `STEMLM_POSTHOG_API_HOST=https://e.stemlm.app`
  - `STEMLM_POSTHOG_UI_HOST=https://us.posthog.com`
  - `STEMLM_BUILD_CHANNEL=development`
  - `STEMLM_UPDATES_API_URL=https://stemlm.app/api/subscribe`
- Never list `RESEND_API_KEY` in the extension repository's example file.
- Ignore `.env`, `.env.local`, `.env.*.local`, and other real environment variants while explicitly retaining `.env.example`.
- Add only the required network destinations to manifest host permissions/CSP. Add `identity` and `identity.email` as optional permissions, never required permissions.
- Remove Google Analytics host access.

Verification: build without environment variables; inspect the generated manifest and compiled files. Analytics must be disabled, no production token may appear, permissions must be minimal, optional email permissions must not produce an install-time warning, and the options-page mode mismatch must be resolved.

### 2. Replace the analytics transport

Files: `package.json`, lockfile, `src/lib/analytics.ts`, a background-only analytics module such as `src/lib/posthog-background.ts`, `entrypoints/background.ts`.

- Remove the Google Analytics Measurement Protocol implementation.
- Bundle PostHog's browser-extension-safe build locally; disable external dependency loading, autocapture, automatic page views, replay, surveys, and unnecessary defaults.
- Initialize exactly once per service-worker lifetime, bootstrap the stored anonymous ID, and use memory persistence.
- Implement a typed four-event protocol and strict per-event property allowlist.
- Other contexts send semantic messages; only the background imports the PostHog SDK.
- Remove all raw error/unhandled-rejection analytics. Console diagnostics may remain development-only and must not contain user content.
- Shutdown/flush behavior is best-effort. Never hold a user flow open for analytics.

Verification: search the compiled extension for GA endpoints, measurement IDs, remotely loaded scripts, `eval`, dynamic remote imports, and PostHog CDN loaders; none may remain. Confirm only the background bundle contains PostHog code.

### 3. Add identity and privacy preference

Files: `src/lib/settings.ts`, `src/components/SettingsOverlay.tsx`, analytics storage/transport modules, corresponding tests.

- Add `analyticsEnabled: boolean`, default `true`, with migration that preserves existing settings.
- Generate one random UUID and store it under a clearly named `chrome.storage.local` key; never use email or host identity.
- Add a plain-language Privacy section with the opt-out toggle and a link to `https://stemlm.app/privacy`.
- Turning analytics off must immediately stop capture and clear any in-memory pending events. Decide and document whether the anonymous ID is retained to preserve preference-independent product state; recommended: retain it unless the user requests deletion, because it is not used while disabled.
- Show a nonblocking first-run notice that links directly to the toggle.

Verification: migrate a pre-change settings record, toggle analytics off/on across browser restart, and confirm no event requests occur while off.

### 4. Implement the four events

Files: `entrypoints/background.ts`, `entrypoints/content/index.ts`, `src/lib/panel-remote.ts`, `src/components/OverlayButton.tsx`, `src/content/controller.ts`, `src/lib/pdf.ts`, analytics protocol, tests.

- Replace current names with the exact `_v1` names and property contracts in section B.
- Centralize panel visibility transitions so every opening source emits once and duplicate open commands do not.
- Emit solve start only after successful host injection.
- Emit export only on successful print/download; remove failed-export telemetry.
- Do not instrument saved-session export in v1 unless it can provide the exact same validated contract without adding another context-specific path. Recommended: defer it and retain Settings as the subscription entry point.

Verification: automated tests assert each positive firing condition, every negative condition, exact properties, enum rejection, no unknown fields, opt-out, and missing-token no-op behavior.

### 5. Add the optional updates subscription

Files: `wxt.config.ts`, `src/components/SettingsOverlay.tsx`, `src/components/Panel.tsx`, a narrowly scoped subscription module/component, tests. External dependency: `stemlm.app` backend endpoint.

- After the first successful live-panel export, show a one-time, dismissible “Get important stemLM updates” action. Settings always exposes the same action.
- Only a direct user click initiates `chrome.permissions.request` for optional `identity` and `identity.email` permissions.
- If granted, call the identity API, show a masked email and explicit Subscribe/Cancel confirmation. If unavailable or denied, show a manual email field without blocking the extension.
- Submit only the confirmed email and consent metadata to the stemLM endpoint. Never include the PostHog distinct ID.
- Store only prompt/subscription UI state locally, not the full email. Provide unsubscribe/manage access in Settings.
- Respect dismissal and do not repeatedly prompt.

Verification: test grant, deny, no-signed-in-account, typed fallback, cancel, subscribe, unsubscribe, endpoint failure, offline behavior, and repeated export. Confirm no email appears in PostHog, logs, Chrome storage, URLs, or extension artifacts.

### 6. Update legal and open-source documentation

Files: root `PRIVACY.md`, root `LICENSE`, `README.md`, `docs/legal/PRIVACY.md`, `docs/legal/LICENSE`, Chrome Web Store listing text outside the repo.

- Create one canonical root privacy policy with the contents in section E below.
- Make old legal locations point to the canonical source or remove duplicate hand-maintained copies safely.
- Put the existing license at repository root and link it from the README.
- Document analytics defaults, opt-out path, public-token behavior, fork-safe setup, local no-op behavior, and update-email consent.
- State that local contributors must provide their own PostHog project if they intentionally enable telemetry.

Verification: every repository and Web Store privacy statement agrees on event names, data fields, processor, region, purpose, default, opt-out, and email separation.

### 7. Final build and release audit

Files: generated build only for inspection; do not commit `.output` unless repository policy already requires it.

- Run existing typecheck, lint, unit tests, WXT build, and any packaging checks.
- Inspect generated manifest permissions, CSP, background type, content matches, and web-accessible resources.
- Perform the complete network-canary procedure in section F.
- Confirm a fork build with no environment configuration emits no telemetry.

Verification: section E is fully checked, section F passes, and a clean packed-extension install shows only expected permission warnings.

## E — Open-source and release checklist

### Secrets and builds

- [ ] Production PostHog token is absent from tracked source, `.env.example`, tests, fixtures, screenshots, and documentation.
- [ ] It is understood that the token remains visible inside the published production extension; it is public configuration, not a secret.
- [ ] No PostHog personal API key, private key, email-provider key, or backend credential exists anywhere in the extension package or git history.
- [ ] `RESEND_API_KEY` exists only in the backend host's secret store.
- [ ] A default clone/build has analytics disabled and cannot send to the stemLM production project.
- [ ] Test and production builds use different PostHog projects.
- [ ] No payment method is attached to PostHog unless a future explicit decision changes the cost guarantee.
- [ ] `.gitignore` covers real environment files and explicitly permits `.env.example`.

### Extension safety

- [ ] All executable dependencies are bundled locally; no remote code, CDN SDK, `eval`, or downloaded executable logic exists.
- [ ] Only the background bundle imports PostHog.
- [ ] CSP and host permissions allow only the required proxy and subscription endpoints in addition to core host permissions.
- [ ] `identity` and `identity.email` are optional and requested only from a clear user gesture.
- [ ] No analytics or newsletter failure changes the solve/export outcome.
- [ ] Service-worker restarts preserve identity and opt-out state.

### Data minimization

- [ ] Only the four event names and documented properties can pass validation.
- [ ] Autocapture, page views, session replay, surveys, and error capture are disabled.
- [ ] URLs, DOM, question/answer text, files, saved content, chat IDs, raw errors, and email are absent from event payloads.
- [ ] PostHog IP storage and location enrichment are disabled or payload/network behavior is otherwise documented as unverified.
- [ ] Email never enters PostHog and the PostHog anonymous ID never enters the mailing system.
- [ ] Full email is not kept in `chrome.storage`.

### Transparency

- [ ] Root `PRIVACY.md` is canonical and published unchanged at `https://stemlm.app/privacy`.
- [ ] The policy states controller/contact identity, purposes, exact events/properties, anonymous ID, US region, PostHog, proxy subprocessors, retention, opt-out, deletion/request process, security, children/student implications, policy changes, and separate email subscription/unsubscribe handling.
- [ ] The Web Store listing prominently discloses analytics before install.
- [ ] Web Store data-use answers match actual payloads and policy wording.
- [ ] README explains the safe fork/local-build behavior.
- [ ] Root `LICENSE` is present.

## F — Verification

### 1. Prove a normal open-source build is inert

Build with no `.env` or CI values and install it in a fresh Chrome profile. Exercise install, panel open, solve, and export. In the background-service-worker DevTools Network panel, there must be no request to `e.stemlm.app`, PostHog domains, or Google Analytics.

### 2. Inspect the generated artifact

Open the generated manifest and confirm MV3, exact permissions, optional email permissions, host permissions, CSP, background configuration, matches, and web-accessible resources. Search compiled output for production secrets, Google Analytics URLs, PostHog CDN/script loading, remote imports, `eval`, and source-map leakage.

### 3. Use privacy canaries

In the test build, use deliberately unmistakable values:

- Question: `SENSITIVE_QUESTION_CANARY_7f31`
- Follow-up: `SENSITIVE_FOLLOWUP_CANARY_9a42`
- Page query/hash: `url_canary_51bc`
- File name: `PRIVATE_FILE_CANARY_d820.pdf`
- Typed subscription email: a controlled test address

Preserve the Network log, trigger each event once, and inspect/decode every request body before trusting PostHog. Search requests for each canary, the full host URL, page title, DOM text, chat IDs, error strings, and email. Any match blocks release.

### 4. Validate exact event contracts

For every request, compare keys against section B. Confirm one stable distinct ID across background restarts and all originating contexts, correct extension version/channel, no automatic PostHog page properties, and only enumerated values. Unknown fields must be dropped rather than forwarded.

### 5. Validate behavior counts

- Fresh install produces exactly one install event; update and browser restart produce none.
- Each hidden-to-visible panel transition produces one panel event; rerender, close, or redundant open produces none.
- Failed injection produces no solve event; successful injection produces one.
- Successful print/download produces one export event; cancellation/failure produces none.

### 6. Validate opt-out

Turn analytics off, restart Chrome, and repeat all flows. There must be zero capture requests. Turn it back on and confirm new actions resume; no historical actions are replayed.

### 7. Validate PostHog

Use the Test project Live Events view first. Confirm events, property types, unique-user behavior, and filters. Then perform one controlled production smoke test labeled by the production build contract, delete/exclude it if supported, and confirm the three insights calculate as defined.

### 8. Validate update-email isolation

Confirm there is no install-time email warning. Test permission grant and denial, masked confirmation, typed fallback, subscription failure, and unsubscribe. Inspect the subscription request and server/provider record. Confirm email is absent from PostHog requests, PostHog persons, URLs, logs, and Chrome storage.

### 9. Validate Web Store presentation

Pack and install in a clean profile to capture the exact permission warnings users see. Compare the final package behavior against the listing disclosure and Data Safety answers. If they differ, fix the product or disclosure before submission.

## G — Deliberately out of scope for v1

- Session replay, autocapture, heatmaps, web analytics, and page views.
- Error tracking, raw errors, stack traces, and solve/export failure events.
- Feature flags, remote configuration, kill switches, experiments, and surveys.
- LLM analytics because stemLM does not make the LLM calls.
- Group analytics, cross-device identity, account linking, email-to-analytics linking, and host-account identity.
- Durable offline analytics queue, delivery guarantees, and historical replay.
- Data warehouse, CDP, SQL automation, MCP, notebooks, logs, and external BI.
- Question, answer, follow-up, subject, DOM, URL, file, or saved-session analytics.
- Newsletter prompts from saved-library exports; Settings remains available.
- Required email permission, silent email collection, or Chrome-account email collection without confirmation.
- Any attempt to hide the public PostHog token in a published extension.
- Paid PostHog usage or automatic plan upgrades.

## Primary sources fetched for this plan

### PostHog

- [Browser extension guidance](https://posthog.com/docs/advanced/browser-extension)
- [Reverse proxy guidance](https://posthog.com/docs/advanced/proxy)
- [Current pricing and free limits](https://posthog.com/pricing)
- [Data storage and regions](https://posthog.com/docs/privacy/data-storage)
- [API authentication and capture](https://posthog.com/docs/api)

### Chrome Extensions and Chrome Web Store

- [MV3 remotely hosted code](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- [Manifest content security policy](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
- [Extension service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Extension update lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/extensions-update-lifecycle)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [User data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Web Store troubleshooting and disclosure guidance](https://developer.chrome.com/docs/webstore/troubleshooting)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Permission list](https://developer.chrome.com/docs/extensions/reference/permissions-list)
- [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Permission warnings](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings)
- [Chrome Web Store metrics](https://developer.chrome.com/docs/webstore/metrics/)

### Email provider

- [Resend pricing](https://resend.com/pricing/)
- [Resend audiences/contacts](https://resend.com/docs/dashboard/audiences/introduction)
- [Resend examples and API usage](https://resend.com/docs/examples)

## Facts requiring re-verification at implementation/release time

The following are volatile and must be fetched again immediately before implementation or submission: PostHog pricing/free limits, exact managed-proxy DNS procedure, SDK extension import path and sanitization hooks, PostHog privacy-control names, Chrome Web Store consent interpretation, optional-permission warning text, and Resend limits. If current primary sources disagree, stop and resolve the contradiction rather than silently choosing favorable wording.
