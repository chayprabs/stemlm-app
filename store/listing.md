# Chrome Web Store listing

Everything the developer dashboard asks for, in the order it asks. The package is
`.output/stemlm-app-<version>-chrome.zip`, built with `pnpm release:chrome` on a machine whose
`.env.production.local` holds `WXT_POSTHOG_KEY` (see `.env.example`). Images in this folder come
from `node scripts/visual/store-shots.mjs` after a build.

## Package tab

Upload the ZIP. Name (`stemlm`), summary and version come from the manifest. The summary is:

> Turns ChatGPT, Claude, Gemini and Grok answers into step-by-step STEM study pages with formulas, diagrams and quick checks.

## Store listing tab

**Description**

```
stemlm turns the answer your AI chat gives you into a study page you can work through, one step at a time.

Ask a maths, physics, chemistry, biology, engineering or computer science question in ChatGPT, Claude, Gemini or Grok. Press the stemlm button beside the chat's attach button and send your question as usual. stemlm attaches a short guide that asks the model to answer in clear steps. When the answer arrives, the study panel opens beside the chat.

What you get
• Numbered steps, each with its key relation, the working and a takeaway
• Formulas typeset properly, with Copy LaTeX on every formula
• Diagrams drawn in your browser: free-body diagrams, circuits, graphs, number lines, Venn diagrams, triangles, reaction energy profiles, truth tables, trees and more
• Quick checks to test yourself before you move on
• The full solution in one view, with the final answer set apart
• Follow-up questions about any step, sent back to the chat
• Saved questions with search and subject filters, and PDF export for revision
• Ordinary answers too: an answer written without the guide is arranged into steps

How it works
stemlm works inside the chat you already use, with your own account. It never sends a message for you: you review your message and press Send. It reads the answer on the page and builds the study view in your browser. There is no stemlm account and no study server.

Honest about checking
The steps come from your AI model. stemlm lays them out and draws the figures they describe, and says what it did and did not check. AI answers can be wrong.

Privacy
Your questions, answers and saved work stay in your browser. To improve stemlm, it sends usage statistics, such as how often the panel opens, under a random install id. It never sends your questions, answers or chat links. Turn usage statistics off in Settings.
Privacy policy: https://www.stemlm.app/privacy

Open source under the MIT licence: https://github.com/chayprabs/stemlm-app

Works in desktop Chrome and Edge on chatgpt.com, claude.ai, gemini.google.com and grok.com.
```

**Category:** Education
**Language:** English

**Graphic assets**

| Field | File |
| --- | --- |
| Store icon (128x128) | `public/icon/128.png` |
| Screenshots (1280x800, in this order) | `store/screenshot-1-steps.png`, `store/screenshot-2-start.png`, `store/screenshot-3-diagrams.png`, `store/screenshot-4-check.png`, `store/screenshot-5-solution.png` |
| Small promo tile (440x280) | `store/promo-tile-440x280.png` |
| Marquee promo tile (1400x560) | `store/marquee-1400x560.png` |
| Global promo video | Leave empty |

The screenshots frame unedited captures of the extension. The tiles' line art (`store/art/promo-art.png`) was made with an image model and holds no product UI; Google allows that in promo tiles but requires screenshots to show the real extension.

**Additional fields**

- Official URL: none (it needs a site verified in Google Search Console)
- Homepage URL: `https://www.stemlm.app`
- Support URL: `https://github.com/chayprabs/stemlm-app/issues`
- Mature content: No

## Privacy tab

**Single purpose**

```
stemlm turns STEM answers on AI chat sites (ChatGPT, Claude, Gemini and Grok) into a step-by-step study panel beside the chat, with typeset formulas, diagrams, quick checks, saved questions and PDF export.
```

**Permission justifications**

| Permission | Justification |
| --- | --- |
| `storage` | Keeps the student's settings, saved questions and the state of open study panels in the browser. |
| `unlimitedStorage` | Saved questions keep their steps and figures. A student's library can outgrow the default storage quota, and without this permission it would stop saving. Nothing leaves the browser because of it. |
| `tabs` | The toolbar popup says whether the current tab is a supported chat, and opens the study panel or a chosen chat. stemlm reuses a chat tab that is already open instead of opening a duplicate, and focuses its own Settings and Saved questions windows when they are already open. |
| `downloads` | Saves the PDF of a solution, or of several saved questions, when the student presses Download PDF. |
| `scripting` | Chrome does not run content scripts in tabs that were open before the extension was installed or updated. stemlm uses scripting.executeScript to add its own bundled content script to already-open tabs of the four supported chat sites, so the student does not have to reload them. |
| Host permissions | stemlm runs only on chatgpt.com, claude.ai, gemini.google.com and grok.com (and their www addresses). There it adds the stemlm button beside the chat's attach button, attaches the study guide to the student's message when they press it, reads the answer the chat shows, and opens the study panel beside the chat. |

**Remote code:** No, I am not using remote code. (All code is in the package. Usage statistics are a plain HTTPS request carrying event data to PostHog; no code is loaded.)

**Data usage.** Tick only **User activity** (feature-usage events: panel opened, question asked, PDF exported and the like, with a random install id and the extension version). stemlm reads chat answers and keeps saved questions only in the browser; they are never sent to the developer.

Tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** `https://www.stemlm.app/privacy`

## Distribution tab

- Payments: Free, no in-app purchases
- Visibility: Public
- Regions: All regions

## Test instructions (for the reviewer)

```
No stemlm account is needed. Open https://chatgpt.com (works signed out) or https://gemini.google.com, type a question such as "A 5 kg block slides down a 30 degree incline with friction coefficient 0.2. Find its acceleration.", press the stemlm button beside the chat's attach (+) button, then press Send. When the answer arrives, the study panel opens beside the chat with numbered steps and a diagram. The toolbar popup opens Settings and Saved questions. stemlm never sends a message by itself.
```
