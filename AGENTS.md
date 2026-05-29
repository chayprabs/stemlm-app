## Cursor Cloud specific instructions

- This repo is a single WXT browser extension (`stemlm-app`); there is no local backend, database, queue, or Docker service to start.
- Standard dependency, test, and build commands live in `package.json`. There is currently no `lint` script, so use `pnpm compile` for the type-check/lint-equivalent gate.
- Run `pnpm dev` to start the Chromium WXT dev server. It builds `.output/chrome-mv3-dev`, opens Chromium with the unpacked extension, and should be left running for manual browser testing.
- Full content-script testing depends on live ChatGPT, Claude, or Gemini pages. Their login pages may load the extension popup and host permissions, but prompt injection and panel flows require an authenticated chatbot session.
- GA4 analytics credentials are optional; with the `.env.example` values unset, analytics no-ops and local development/testing still works.
