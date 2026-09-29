# Publishing a Chrome / Edge release

Use Node.js 22 and pnpm 11 (v2.0.0 uses Node 22.23.2 and pnpm 11.4.0). Keep the lockfile frozen; do not update dependencies during packaging.

1. Review the intended commit, the worktree, and the target remote branch. Preserve unrelated changes. Never force-push a release.
2. Set the release version in `package.json`. WXT uses it for `manifest.json`. Update `CHANGELOG.md`, `INSTALL.md`, and `docs/releases/<tag>.md` with behavior verified against the current code.
3. Run `pnpm install --frozen-lockfile`. Generate bundled notices with `node scripts/release-notices.mjs`; review any missing-license errors before proceeding.
4. Run `pnpm release:chrome`. This type-checks, runs the application tests, builds, and packages the production MV3 extension. Run `pnpm audit --prod` and record its result. Preserve exact logs locally.
5. Inspect the ZIP: root-level `manifest.json`, matching version, expected provider hosts and permissions, license notices, all referenced scripts/pages/fonts present, and no tests, source maps, secrets, local artifacts or development code. Compare every ZIP entry with `.output/chrome-mv3`.
6. Where the local Figure Lab is available, run its diagnostics and record results separately from the application suite. Historical or environment-dependent failures must stay visible; never describe a failed gate as passing or change tests to obtain a green result.
7. Commit only reviewed release files and push the intended commit to the release branch with a normal fast-forward push. Wait for the repository CI to pass on that exact commit.
8. Create an annotated version tag at that commit, and push that tag. Do not replace an existing published tag.
9. Prepare `build-info.json` with the full commit, tag, runtime versions, ZIP size/hash, manifest and measured verification results. Prepare `VERIFICATION.md`, copy the installation guide, and calculate `SHA256SUMS.txt` over the downloadable assets. Do not include private local paths or study content.
10. Create a GitHub draft release targeting the verified tag, with the reviewed release notes and assets. Verify the uploaded assets and hashes, then publish it as the latest stable release. Check that GitHub's latest release resolves to the expected tag and that the downloaded ZIP still matches its checksum.

The Chrome Web Store is a separate distribution channel. Publishing a GitHub release does not submit or update a store listing.

## Expected assets for v2.0.0

- `stemlm-2.0.0-chrome.zip` — installable unpacked Chrome/Edge extension.
- `INSTALL.md` — installation, update and integrity-check instructions.
- `VERIFICATION.md` — measured checks and known verification limits.
- `build-info.json` — source/build provenance and package inventory.
- `SHA256SUMS.txt` — hashes for those four files.

GitHub also generates source-code archives from the tag; these are not installable builds.
