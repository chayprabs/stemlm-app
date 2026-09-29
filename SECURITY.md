# Security Policy

stemLM runs on the chat pages where people study, so we take security reports seriously.

## Reporting a vulnerability

**Please do not report security problems in a public issue, pull request or discussion.**

Email **[founders@stemlm.app](mailto:founders@stemlm.app)** with:

- a description of the issue and its impact,
- the stemLM version (shown on the extension's card in `chrome://extensions`) or the commit you tested,
- your browser and version, and the chat site involved, if any,
- steps to reproduce, and a proof of concept if you have one.

Send only what is needed to show the problem. Leave out real chats, passwords and other people's data. If you need to share a sample answer or spec, make one up.

We will confirm that we received your report, keep you updated while we investigate, and tell you when a fix is released. Please give us a reasonable amount of time to release a fix before you disclose the issue publicly. With your permission, we are happy to credit you.

## Supported versions

Security fixes go into the `main` branch and the latest release on the Chrome Web Store. Older versions are not patched; update to the latest release.

## Scope

In scope:

- the extension in this repository, including its content scripts, study panel, extension pages and background worker,
- the website at [stemlm.app](https://stemlm.app).

Examples of what we want to hear about:

- script injection or unsafe HTML or SVG reaching a chat page or extension page through model output, a figure spec or a saved question,
- a web page reading or changing stemLM's storage, settings or saved questions,
- study content (questions, answers, saved solutions) leaving the browser other than through the chat provider's own page, or appearing in analytics,
- the extension acting on sites outside the supported chat services, or using a permission for something other than its documented purpose,
- a problem in how this repository builds, packages or ships the extension.

Out of scope:

- vulnerabilities in Claude, Gemini, Grok, ChatGPT or the browser itself; please report those to the vendor,
- an AI model giving a wrong or harmful answer, unless stemLM makes it worse through an injection or rendering flaw,
- issues that need a compromised device, a malicious browser extension, or physical access,
- missing security headers or best-practice suggestions without a demonstrated impact.

## How stemLM is built to be safe

- **Manifest V3 only.** All code ships inside the extension package. There is no `eval`, `new Function` or remotely hosted code.
- **Untrusted model output.** Markdown renders without raw HTML. Figures are compiled locally from typed specs into SVG, which is sanitized before it is mounted. No language model runs in the render path.
- **Narrow permissions.** Host access covers only the supported chat sites, over HTTPS.
- **No stemLM backend.** There is no stemLM account or server that receives questions, answers or saved solutions. Study data stays in browser extension storage.
- **Content-free analytics.** Usage analytics never include questions, answers, chat transcripts or saved solutions, and can be turned off in Settings. See the [Privacy Policy](PRIVACY.md).

Thank you for helping keep stemLM and its users safe.
