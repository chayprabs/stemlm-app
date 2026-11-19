# Install stemLM v2.1.0

> The easiest way to install stemLM is from the [Chrome Web Store](https://chromewebstore.google.com/detail/stemlm/ikidgbbejoonemfbdojncjgkbcglkkmm), which also keeps it up to date. This page is for loading the GitHub release by hand.

Requires desktop Google Chrome 116+ or a compatible Microsoft Edge version. Supported chat sites are [ChatGPT](https://chatgpt.com/), [Claude](https://claude.ai/), [Gemini](https://gemini.google.com/), and [Grok](https://grok.com/). Your provider's account, plan and attachment limits apply. Firefox and mobile browsers are not supported by this release.

## Install the release ZIP

1. Open the [v2.1.0 release](https://github.com/chayprabs/stemlm-app/releases/tag/v2.1.0).
2. Download **stemlm-2.1.0-chrome.zip** from Assets. The automatically generated **Source code** archives are for developers and cannot be loaded directly as an extension.
3. Extract the ZIP to a permanent folder on your computer. `manifest.json` must be directly inside the selected folder.
4. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
5. Enable **Developer mode**, choose **Load unpacked**, and select that folder.
6. Check that the extension reports version **2.1.0**. Pin stemLM from the browser's extensions menu if desired.
7. Open a supported chat. Refresh any existing chat tab if the **stemLM button** does not appear beside the composer.

Type your question or attach a problem image/PDF, press the **stemLM button** to prepare the study guide, review the draft, then press **Send** yourself. stemLM never sends the message for you. The provider can begin uploading attachments before you send.

The study panel offers **Steps** and **Solution**, quick checks, **Ask in chat**, saving, and PDF download. **Study the latest answer** in an empty panel opens the chat's most recent answer. An ordinary answer written without the guide is arranged into steps and labelled as not checked by stemLM.

## Update an existing unpacked installation

1. Export important saved questions to PDF before updating. PDFs preserve readable copies, not an importable library backup.
2. Keep the extension installed and keep its existing folder path. Extract the new ZIP separately, then copy its contents into the existing extension folder, replacing matching files.
3. On the extensions page, press the extension's **Reload** button and verify version **2.1.0**.
4. Refresh supported chat tabs if needed. Use **Study the latest answer** to reopen the current answer.

Do not uninstall or clear extension storage during the update: that removes local saved work. Loading a different folder can create a separate unpacked installation with separate storage. A Chrome Web Store installation also has a separate identity from an unpacked installation; its data does not automatically transfer.

## Verify the download

Download **SHA256SUMS.txt** beside the ZIP. In PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 .\stemlm-2.1.0-chrome.zip
```

On macOS:

```sh
shasum -a 256 stemlm-2.1.0-chrome.zip
```

On Linux:

```sh
sha256sum stemlm-2.1.0-chrome.zip
```

Compare the result with the ZIP's line in `SHA256SUMS.txt`. The checksums verify file integrity; they are not a digital signature.

## Troubleshooting

- **Manifest missing:** select the extracted folder containing `manifest.json`, not the ZIP or its parent folder.
- **No stemLM button:** verify stemLM is enabled, has site access for that provider, and the chat page is refreshed. Make sure you are using one of the four supported domains.
- **Guide attachment fails:** check the provider's upload quota and supported attachment features. Review the status message and retry once the provider permits uploads.
- **No figure:** incomplete or unsupported figure specifications are hidden. The remaining explanation still appears; model answers and diagrams can be wrong.
- **Old version after updating:** confirm the path shown on the extensions page matches the folder you updated, then reload it.

For reproducible problems, [open an issue](https://github.com/chayprabs/stemlm-app/issues/new/choose) with the version, browser and provider. Remove private study content before sharing screenshots or logs. See [SECURITY.md](SECURITY.md) for private security reports.
