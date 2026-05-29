# Privacy Policy — stemLM

_Last updated: 2026‑05‑29_

stemLM is a browser extension that adds a structured, step‑by‑step study view on
top of AI chat sites you already use (ChatGPT, Claude, Gemini, Perplexity, Grok,
DeepSeek). **stemLM has no backend server and no account/login.** Your questions
and the AI's answers are processed entirely inside your browser.

## The short version

- We do **not** run a server that receives your questions or answers.
- We do **not** sell, share, or monetise your data.
- Your study content stays on your device (and only goes to the AI site you
  chose to use — the same place it was already going).
- The only optional network call stemLM can make is **anonymous, aggregate usage
  analytics**, which you can turn off, and which never includes your content.

## What data stemLM handles

**1. Your questions and the AI's answers (content).**
When you click the stemLM button, the extension reads the text you typed and the
answer the AI returns _on the page you're already on_, parses it into steps, and
displays it in the side panel. This processing happens locally in the page. This
content is **not** transmitted to stemLM — it only ever reaches the AI provider
you chose (e.g. OpenAI, Anthropic, Google), exactly as it would without stemLM.

**2. Data stored locally on your device** (via the browser's extension storage):

- **Settings** — theme, enabled sites, default subject, split‑screen ratio,
  auto‑open and analytics preferences.
- **Saved sessions** — only the study capsules you explicitly click "Save" on,
  so you can revisit them. You can delete them any time from the popup.
- **A random client id** — a UUID used only to de‑duplicate anonymous analytics
  counts (see below). It is not linked to your identity.

This data never leaves your browser except as described under Analytics.

**3. Anonymous usage analytics (optional, off‑switchable).**
If analytics is configured by the distributor and you have **not** opted out,
stemLM sends small, content‑free event pings (via the Google Analytics 4
Measurement Protocol) such as `question_asked`, `question_solved`,
`pdf_exported`, and `panel_opened`, each tagged only with the platform name
(e.g. "chatgpt") and a random session/client id. **No question text, answer
text, selections, or personal data are ever included.** These counts exist only
to understand how many people use the tool and how many questions get solved.

You can disable analytics entirely in **Settings → Privacy → "Opt out of
anonymous usage analytics."** In addition, analytics is a hard no‑op unless the
distributor has supplied GA credentials at build time.

## Permissions and why they're needed

- **`storage`** — save your settings and saved sessions locally.
- **`activeTab` / `scripting`** — let the toolbar button open the panel on the
  current supported tab.
- **Host permissions** for `chatgpt.com`, `chat.openai.com`, `claude.ai`,
  `gemini.google.com`, `perplexity.ai`, `grok.com`, `chat.deepseek.com` — so the
  content script can render the overlay button and read the answer **only** on
  those AI chat sites. stemLM does not run on any other websites.

## Data retention & deletion

Everything stemLM stores lives in your browser. Remove it any time by deleting
saved sessions in the popup, clearing the extension's storage, or uninstalling
the extension (which removes all of its local data).

## Children's privacy

stemLM is a study tool intended for general audiences and does not knowingly
collect personal information from anyone, including children.

## Changes

If this policy changes, the "Last updated" date above will change and the new
version will ship with the extension.

## Contact

Questions about privacy? Open an issue on the project's GitHub repository.
