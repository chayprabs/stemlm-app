## What this changes

<!-- What does this pull request do, and why? Link the issue it fixes, e.g. "Fixes #123". -->

## How it was tested

<!-- Which tests did you add? Did they fail before the change and pass after it?
     For UI changes, attach before and after screenshots in light and dark themes. -->

## Checklist

- [ ] `pnpm verify` passes (type-check, full test suite, production build).
- [ ] New behaviour has tests that fail without this change; no existing test was deleted, skipped or loosened.
- [ ] The change works for a class of problems, not one specific question, value or figure.
- [ ] Figures that can't be drawn faithfully fail closed instead of rendering something wrong.
- [ ] No new dependency, `eval`, `new Function` or remotely hosted code.
- [ ] If this changes what the extension reads, stores or sends, it is described above.
