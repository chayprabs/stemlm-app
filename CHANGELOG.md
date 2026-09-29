# Changelog

## [2.0.0](https://github.com/chayprabs/stemlm-app/releases/tag/v2.0.0) — 2026-09-29

- Support ChatGPT, Claude, Gemini and Grok with provider-specific composer, attachment and answer-capture handling.
- Add a redesigned study workspace with Steps and Solution views, quick checks, contextual follow-ups, adjustable reading sizes, themes and panel width.
- Expand local typed-specification figure rendering across STEM subjects, including plots, circuits, chemistry, mechanics, biology, computing and tables.
- Validate figure specifications before display and hide unsupported or failed figures without leaving empty sections or raw source in the study view.
- Deliver **stemLM Guide.txt** through the composer + control with busy feedback, attachment confirmation and duplicate-action protection.
- Improve saved-question search, storage, workspace recovery and optional sharing across tabs.
- Export individual and merged solutions as paginated PDFs with locally bundled math and text fonts. PDF pages are rendered images rather than vector-only documents.
- Load the study panel separately when first opened to reduce initial work on chat pages.
- Disable extension telemetry in this build; remove the legacy analytics and prompt-variant settings.
- Add release installation/update instructions, license notices, SHA-256 checksums and build verification metadata.

See the [release notes](docs/releases/v2.0.0.md) for installation, requirements and limitations.

## [1.0.0](https://github.com/chayprabs/stemlm-app/releases/tag/v1.0.0) — 2026-06-08

First stable release: a Gemini study overlay with step cards, formulas, diagrams, protocol attachment, quick checks, saved sessions and PDF export.

[Full comparison: v1.0.0 to v2.0.0](https://github.com/chayprabs/stemlm-app/compare/v1.0.0...v2.0.0)
