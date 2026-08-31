# Contributing

1. Install with `pnpm install --ignore-scripts`, then run `pnpm exec wxt prepare`.
2. Run `pnpm compile`, `pnpm test`, and `pnpm build` before opening a change.
3. Keep behavior, privacy, security, accessibility, and fail-closed figure handling intact. Do not add secrets, corpus images, textbook figures, remote executable code, or unapproved dependencies.
4. For a diagram family, use typed specs, `SceneBuilder`, and the existing layout/compiler path; add a rule-level test and avoid question-specific fixtures.

Keep changes small and explain user-visible or security-relevant decisions in the pull request. Never commit `.env` or generated output.
