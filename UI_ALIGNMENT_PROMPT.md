# stemLM Extension UI Alignment — Master Implementation Prompt

> **Purpose:** Hand this document to any designer or coding agent tasked with making the **stemlm-app browser extension** look and feel like it was **shipped by the same team that built [stemlm.app](https://www.stemlm.app)**.  
> **Sources of truth (read all before touching UI):**
> - Live site: https://www.stemlm.app
> - Official repo: https://github.com/chayprabs/stemlm
> - `DESIGN_SYSTEM.md` in that repo (canonical tokens + rules)
> - `components/hero.tsx` — **the hero side panel mockup is the #1 visual target for the extension study panel**
> - `components/workspace-app.tsx` — secondary target for popup/options/dense workspace UI
> - `components/database-teaser.tsx` — live demo animation + panel stepper patterns

---

## 0. Mission (read first)

You are **not** designing a generic purple “AI study tool.” You are **porting the stemlm.app product skin** into a Chrome extension that runs as a **split-screen side panel on Gemini**.

The extension must feel like:
- The **right half of the hero demo** on the homepage (chat on left, stemLM panel on right)
- The **workspace demo** at `/workspace` (cards, mono keys, teal CTAs)
- The **DESIGN_SYSTEM.md** rules (teal, flat, precise, no gradients in product UI)

**Success criteria:** A user who has seen stemlm.app opens the extension and thinks: *“This is the same product — just inside Gemini.”*

**Non-goals:** Do not invent a new color system, new logo, new typography, or new layout language.

---

## 1. Brand identity (non-negotiable)

| Field | Value |
|-------|-------|
| Product name | `stemLM` |
| Wordmark | lowercase `stem` + uppercase `LM` |
| Forbidden spellings | `StemLM`, `STEMLM`, `stem lm`, `Stemlm` |
| Tagline (marketing) | “Solve STEM problems the right way, every time” |
| Hero headline pattern | “The **structured** way to solve STEM problems with AI.” (`structured` in teal) |
| Personality | Precise · Structured · Intelligent · Clean · Trustworthy |
| Positioning | A **structured thinking layer** on top of AI — not the AI itself |

### Voice & microcopy tone
- **Sentence case** everywhere (not Title Case), except taxonomy keys like `STEM-PHY-03-07-02`
- Short, confident, student-facing: *“Framework matched in response.”* not *“Successfully parsed capsule!”*
- Avoid developer jargon in UI: say *“Reading response”* not *“MutationObserver fired”*
- Loading states reference the **marketing flow**: *“Injecting framework…”*, *“Reading response…”*, *“Framework matched · Physics”*

---

## 2. Logo & icon mark

### Wordmark
```
stemLM
^^^^    ^^
dark    teal (#0EA5A0)
```
- `stem`: `#0F1117` (light surfaces) or `#F0F0F2` (dark surfaces)
- `LM`: **always** `#0EA5A0`
- Font: **Geist weight 500** on marketing site; **Inter weight 500** acceptable in extension if Geist not bundled
- Letter-spacing: `-0.02em` to `-0.03em` on wordmark

### Icon mark (StemMark) — branching fork SVG
From `hero.tsx` `StemMark()`:
- 48×48 viewBox, readable at 14–16px
- Central square (top) + two lower squares at 40% opacity
- Three lines branching down — represents subject → chapter → topic → subtopic
- Fill/stroke: `#0EA5A0` on light; `currentColor` when on teal button
- **Never:** atoms, beakers, brains, circuit-board clipart, gradients inside mark

### Logo.tsx variant (homepage hero)
- Uses **Space Mono** for large marketing logo with blinking cursor on `LM` in `#2dd4bf`
- **Extension should NOT use Space Mono or blinking cursor** — that’s landing-page drama only
- Extension uses static Inter/Geist wordmark + StemMark icon

### Safe space
- Minimum padding = 1× icon height around mark
- No drop shadow on logo
- No rotation/skew

---

## 3. Color system — complete token table

### 3.1 Primary accent (the brand color)
| Token | Hex | Usage |
|-------|-----|-------|
| `accent` | `#0EA5A0` | CTAs, active tabs, logo LM, links, diagram strokes, inject button |
| `accent-hover` | `#0D9490` | Hover on primary buttons |
| `accent-dim` | `#0EA5A015` | Badge backgrounds, selected rows, step number chips (8% teal) |
| `accent-fg` | `#F0F0F2` | Text on teal buttons (not pure white) |

> **CRITICAL:** The old extension purple (`#7c6bff`, `#6d5efc`, `#5b46e0`) is **banned**. If you see any purple in CSS/TSX, it is a bug.

### 3.2 Light mode (extension panel default — matches hero side panel)
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-light` | `#F8F9FC` | Page/popup background, outer demo chrome |
| `surface-light` | `#FFFFFF` | Panel background, cards |
| `border-light` | `#E2E8F0` | All borders, dividers |
| `text-1-light` | `#0F1117` | Headings, primary text |
| `text-2-light` | `#64748B` | Body secondary, captions |
| `text-3-light` | `#8A8A9A` | Muted labels (e.g. “SIDE PANEL”) |
| `text-4-light` | `#94A3B8` | Section labels, timestamps |
| `diagram-bg` | `#F1F5F5` | Diagram well background (hero panel) |
| `composer-chrome` | `#F1F5F5` | Demo outer frame around chat+panel |

### 3.3 Dark mode (DESIGN_SYSTEM.md — extension “dark theme” toggle)
| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#0C0C0F` | Panel background |
| `surface` | `#141418` | Cards |
| `surface-2` | `#1A1A22` | Elevated/hover surfaces |
| `border` | `#1E1E24` | Borders |
| `border-2` | `#2A2A35` | Emphasized borders, dashed connectors |
| `text-1` | `#F0F0F2` | Primary text |
| `text-2` | `#8A8A9A` | Secondary text |
| `text-3` | `#4A4A5A` | Placeholders, disabled |

### 3.4 Semantic colors
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#22C55E` | Extraction status dot, reviewed state, “✓ Attached” |
| `amber` | `#F59E0B` | Formula highlights, insight callouts, takeaways **only** |
| `amber-dim` | `#F59E0B15` | Amber tint backgrounds |
| `error` | `#EF4444` | Errors, destructive actions, problem section × marks |

### 3.5 Color rules (violations = off-brand)
1. **No gradients** on buttons, cards, panel backgrounds, text, or logos (marketing waitlist section uses gradients — **do not copy that into extension**)
2. **No box shadows** except focus rings (`0 0 0 1.5px #0EA5A0`)
3. **No pure `#000000` or `#FFFFFF`** — use tokens (`#0F1117`, `#F0F0F2`, `#FFFFFF` only as card surface token)
4. **Max 2 accent colors per screen:** teal + either amber (insight) or green (success) — never teal + purple + green competing
5. **Amber is annotation only** — never amber buttons or nav
6. **Teal is not blue, not Gemini blue** — do not use `#4285f4` anywhere

---

## 4. Typography — complete spec

### Font families
| Role | Font | Weights | Extension import |
|------|------|---------|------------------|
| UI / body | Inter | 400, 500 | Google Fonts or bundled |
| Wordmark | Geist (ideal) or Inter | 500 | Same |
| Mono | JetBrains Mono | 400, 500 | Taxonomy keys, formulas, step indices |

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap');
```

### Size scale (use exactly — from DESIGN_SYSTEM.md + hero)
| Token | Size | Line-height | Where used in extension |
|-------|------|-------------|-------------------------|
| `text-2xs` | 8–9px | 1.45 | “SIDE PANEL”, replay countdown in demo |
| `text-xs` | 10–11px | 1.5 | Extraction labels, step values, chips, metadata |
| `text-sm` | 12–13px | 1.6 | Step titles, body in cards, button labels |
| `text-base` | 15px | 1.7 | Default panel body |
| `text-lg` | 18px | 1.5 | Popup headings |
| `text-xl` | 22px | 1.3 | Section titles (options) |

### Weight rules
- **400** — all body paragraphs, step explanations
- **500** — headings, labels, buttons, wordmark, tab labels
- **NEVER 600, 700, 800** in extension UI (marketing nav violates this — ignore for extension)

### Letter-spacing
- Headings ≥18px: `-0.3px` to `-0.5px`
- Section eyebrows (uppercase labels): `tracking: 0.06em–0.1em` (e.g. `EXTRACTION STATUS`)
- Body: `0`

### Monospace usage (JetBrains Mono **only** for)
- Framework keys: `STEM-PHY-03-07-02`, `STEM-ECE-04-02-07`
- Step indices in chips: `01`, `02`, `03`
- Formula lines inside gray boxes
- Inline `code` in markdown

### Italic
- **Only** for follow-up quote text and math variables — nowhere else

---

## 5. Spacing & layout grid

Base unit: **4px**. All padding/margin should be multiples of 4.

| Token | px | Extension usage |
|-------|-----|-----------------|
| space-1 | 4 | Icon gaps |
| space-2 | 8 | Compact padding, inject button gap |
| space-3 | 12 | Panel section padding |
| space-4 | 16 | Card padding, body padding |
| space-5 | 20 | Card padding (workspace) |
| space-6 | 24 | Section gaps |
| space-8 | 32 | Header padding vertical |

### Border radius
| Token | px | Usage |
|-------|-----|-------|
| radius-sm | 6 | Badges, inject pill, step chips, small buttons |
| radius-md | 10 | Buttons, inputs, tabs |
| radius-lg | 14 | Cards, panel sections |
| radius-xl | 20 | Large marketing cards only |
| full | 9999 | Subject selector pill, send button circle |

### Borders
- **Always 0.5px or 1px solid** — prefer `0.5px` on light panel (hero uses `#E2E8F0`)
- Dividers between header sections: full-width `border-bottom: 0.5px solid #E2E8F0`

---

## 6. Component library — pixel-perfect specs

### 6.1 Primary button (teal)
From `workspace-app.tsx` `primary` class:
```
background: #0EA5A0
color: #F0F0F2
font-size: 13–14px
font-weight: 500
padding: 10px 16px (py-3 px-4)
border-radius: 10px (rounded-md)
hover: #0D9490
transition: 150ms colors
NO shadow, NO gradient
```
**Extension surfaces:** Popup “Open study panel”, empty state CTA, step nav “Next”, selection popover.

### 6.2 Secondary button
```
background: transparent
border: 0.5px solid #E2E8F0
color: #64748B
font-size: 13px
font-weight: 500
padding: 10px 16px
border-radius: 10px
hover: border-color #0EA5A0, color #0F1117
```

### 6.3 Ghost / icon button
```
32×32px hit area
border-radius: 6px
color: #64748B
hover: background #F8F9FC, color #0F1117
focus: 1.5px ring #0EA5A0
```
Icons: 16px, stroke 1.5px (Lucide-compatible inline SVGs).

### 6.4 Inject button (composer — **hero exact spec**)
From `hero.tsx` lines 559–564:
```
Label: "✦ stemLM" (unicode star U+2726, not emoji)
background: #0EA5A0
color: white
font-size: 10px
font-weight: 500
padding: 6px 10px (py-1.5 px-2.5)
border-radius: 6px
height: ~26px
NO circle FAB — must be horizontal pill
```
States:
- **Idle:** `✦ stemLM` teal pill + small `Auto` subject chip below/right
- **Injecting:** spinner + “Injecting...” text in teal (no button)
- **Done:** `✓ Attached` in teal + send button turns dark `#0F1117`
- **Panel open:** `✓ stemLM` green `#22C55E` or check + “stemLM”

Subject chip below inject:
```
border: 1px solid #E2E8F0
background: white
font-size: 9–10px
font-weight: 500
border-radius: 999px
padding: 2px 8px
```

### 6.5 Cards
Workspace card (`workspace-app.tsx`):
```
background: #FFFFFF
border: 0.5px solid #E2E8F0
border-radius: 14px
padding: 20px 24px (p-5 / p-6)
NO box-shadow
```
Built-for card variant:
```
background: #F8F9FC
border: 1px solid #E2E8F0
border-radius: 14px
padding: 14px 24px
```

### 6.6 Section eyebrow label
Repeated pattern across site:
```
font-size: 11px
font-weight: 500
text-transform: uppercase
letter-spacing: 1px (0.06–0.1em)
color: #0EA5A0
optional: 60px horizontal rule in #E2E8F0 to the right
```
Examples: `The extension`, `The problem`, `Built for`, `EXTRACTION STATUS`, `SIDE PANEL`

### 6.7 Badges & taxonomy keys
```
background: #0EA5A015
color: #0EA5A0
font-family: JetBrains Mono
font-size: 9–11px
font-weight: 500
padding: 2px 6px (hero) or 3px 8px (design system)
border-radius: 6px
```
Examples: `STEM-PHY-03-07-02`, `STEM-ECE-04-02-07`

### 6.8 Status row (extraction)
From hero panel lines 620–632:
```
Section label: "EXTRACTION STATUS" — 9px uppercase #94A3B8
Row: green dot 6px #22C55E + text 10px #64748B
  "Hidden framework key found in response." (extension: "Framework matched in response.")
Below: mono badge with framework key
```

### 6.9 Step list item (hero panel — **core pattern**)
From hero lines 653–669:
```
Container:
  background: #F8F9FC
  border: 1px solid #E2E8F0
  border-radius: 6px
  padding: 10px
Row 1:
  [01] badge — mono 9px, bg #0EA5A015, text #0EA5A0, padding 2px 6px
  title — 11px font-medium #0F1117
Row 2:
  value/formula — mono 10px #64748B
Gap between steps: 8px (space-y-2)
```

### 6.10 Step timeline (how-it-works marketing)
Alternative layout for **progress rail**:
```
Number circle: 36–40px, border 1px #0EA5A0, white fill, teal number 13–14px weight 500
Vertical connector: 1px solid #E2E8F0 (not dashed in marketing — design system says dashed for extension dark mode)
```

### 6.11 Formula block
Workspace / hero:
```
background: #F8F9FC
border: none or 0.5px #E2E8F0
border-radius: 6px (rounded-md)
padding: 8px 12px
font-family: JetBrains Mono
font-size: 11–12px
color: #0EA5A0 (hero/workspace) — formula text in teal mono
```
Amber equation cards (diagrams only):
```
fill: #F59E0B15
stroke: #F59E0B
```

### 6.12 Takeaway / insight block
```
border-left: 2px solid #F59E0B
background: #FFFFFF or #F8F9FC
padding: 8px 12px
label "Takeaway": 9px uppercase #F59E0B weight 500
body: 13px #64748B
```

### 6.13 Quick-check cards
From workspace-app self-check section:
```
background: #F8F9FC
border: 1px solid #E2E8F0
border-radius: 14px
padding: 20px
label: "Check N" — 11px #64748B
question: 13px #0F1117 weight 500
reveal button: secondary style full-width
answer: 13px #64748B, tip in mono teal
```

### 6.14 Tabs (Steps / Solution)
**Do NOT use** heavy segmented control with gray background (old extension).
**Use** hero-style outline tabs:
```
inactive: border 0.5px #E2E8F0, text #64748B, bg transparent
active: border 0.5px #0EA5A0, bg #0EA5A015, text #0EA5A0
font-size: 12px, weight 500, padding 6px 12px, radius 6px
```

### 6.15 Inputs & selects (options page)
```
background: #F8F9FC
border: 0.5px solid #E2E8F0
border-radius: 10px
padding: 10px 14px
font-size: 13–14px
focus: border #0EA5A0, ring 1.5px #0EA5A0
```

### 6.16 Toggle switch
```
track off: #E2E8F0
track on: #0EA5A0
knob: white circle, no heavy shadow (minimal)
```

### 6.17 Loading state
Copy from hero/demo:
- Title: **“Reading response”** or **“Injecting framework…”**
- Subtitle: **“Matching framework and building step cards”**
- Skeleton: flat `#F1F5F5` blocks on `#F8F9FC`, **no shimmer gradient** (design system bans decorative gradients; subtle opacity pulse OK)
- Icon: StemMark in teal, gentle opacity pulse

### 6.18 Empty state
```
StemMark in #0EA5A015 rounded square
Title: "Study workspace" — 15px weight 500
Body: 13px #64748B, max-width 320px
CTA: primary teal button
Hint: 12px #94A3B8
```

---

## 7. Screen-by-screen extension mapping

### 7.1 Gemini composer — inject control
**Reference:** `hero.tsx` composer bar (lines 552–595)

| Element | Spec |
|---------|------|
| Position | Inside composer action row, immediately left of send button |
| Component | `✦ stemLM` teal pill, NOT circular FAB |
| Subject | Small `Auto` pill, opens dropdown menu |
| Menu | White card, border `#E2E8F0`, radius 10px, items 13px weight 500, active item `#0EA5A015` bg |
| Light-DOM CSS | `composer-slot.ts` must mirror pill styles — host page cannot look “foreign” |

**Dropdown items:** `Auto · recommended`, then subject list — same order as classifier subjects.

### 7.2 Split study panel — **primary surface**
**Reference:** `hero.tsx` right panel when `isSplit === true` (lines 599–679)

#### Panel chrome
```
width: 45% of demo (extension: user-resizable 25–75% viewport)
background: #FFFFFF
border-left: 0.5px solid #E2E8F0
NO box-shadow on panel edge (hero has none on inner panel)
font-family: Inter
```

#### Header row 1
```
Left: stem (dark) + LM (teal) — 12px weight 500
Right: "SIDE PANEL" — 8–9px uppercase #94A3B8 tracking-wider
Far right: icon buttons (theme, save, PDF, close) — 16px icons
```

#### Header row 2 — Extraction status (MANDATORY)
```
Label: EXTRACTION STATUS
Status: ● green + "Framework matched in response."
Badge: STEM-{SUBJECT}-{TOPIC} mono teal on dim teal bg
```
Generate key from capsule meta if parser doesn't provide one — format must **look** like marketing keys.

#### Header row 3 — Topic title
```
Topic string from @meta — 15px weight 500 #0F1117
Subject chip: teal dim badge (optional if in extraction block)
```

#### Header row 4 — Tabs + progress
```
Tabs: Steps | Solution (outline style above)
Right: "2/5 reviewed" — 11px #94A3B8
```

#### Body layout — **recommended restructure**
Hero shows **diagram on top, then all steps listed vertically**. Current extension uses rail + single step card. To fully match marketing:

**Option A (closest to hero):** Diagram well (110px min-height, `#F1F5F5` bg) → scrollable step list (all steps visible) → tapping step expands detail.

**Option B (acceptable hybrid):** Left rail with `01` `02` mono badges + main area with hero-style card for active step.

Either way, each step row MUST use hero chip pattern (section 6.9).

#### Diagram well
```
min-height: 110px (hero flex-[0_0_110px])
background: #F1F5F5
border-bottom: 0.5px solid #E2E8F0
padding: 8px 12px
centered SVG — strokes primarily #0EA5A0, labels #8A8A9A, dimensions in diagrams per globals.css `.diagram-*` classes
```

#### Footer progress bar (hero)
```
2px height bar at bottom of demo panel
fill: #0EA5A0 animating width — optional polish for loading
```

#### Resize handle
```
3px wide grip, #E2E8F0 default, #0EA5A0 on hover
no shadow
```

### 7.3 Selection popover
```
Position: fixed near selection
Button: primary teal, 12px, "Ask in chat" + reply icon
NO purple gradient (old bug)
```

### 7.4 Toolbar popup (320px wide)
**Reference:** `workspace-app.tsx` sidebar density + nav simplicity

```
Background: #F8F9FC
Wordmark at top — no decorative gradient dot
Subtitle: 13px #64748B
Status chip when on Gemini: #0EA5A015 bg, teal text "On Gemini — ready"
Primary CTA: teal full-width button
Secondary: outline button with icon
Saved sessions: white cards, border #E2E8F0, hover border teal
Section title: 11px uppercase #64748B
Footer link: teal text 13px weight 500
```

### 7.5 Options page
**Reference:** workspace cards + `built-for` section spacing

```
Max-width: 576px centered
Page bg: #F8F9FC
Section cards: white, border #E2E8F0, radius 14px
Section title: 11px uppercase #64748B
Row label: 14px weight 500
Row hint: 13px #64748B
```

### 7.6 PDF export
```
Header: stem + LM wordmark (no gradient dot)
Border-bottom: 0.5px #E2E8F0
Step numbers: mono badges #0EA5A015 / teal text — NOT circles
Formulas: #F8F9FC box, mono teal
Takeaways: amber left border
Inter 400/500 only
```

---

## 8. Diagram & SVG styling (from globals.css)

When rendering diagrams in panel or exporting:
```css
.diagram-wire, .diagram-resistor { stroke: #2A2A35; stroke-width: 1.5; }
.diagram-green-stroke, .diagram-image { stroke: #0EA5A0; }
.diagram-object-fill { fill: #0EA5A015; }
.diagram-amber-box { fill: #F59E0B15; stroke: #F59E0B; }
.diagram-label { fill: #4A4A5A; font-family: JetBrains Mono; font-size: 11px; }
```
Light diagram container background: `#F8FAFC` or `#F1F5F5`.

---

## 9. Motion & interaction

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Hover colors | 150ms | ease |
| Panel slide-in | 250–350ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Step transition | 250ms | opacity + translateY(8px) |
| Inject pulse (idle) | 2s infinite | scale 1→1.02, marketing only |

Rules:
- **Never animate** `width`, `height`, or `color` — only `opacity` and `transform`
- Wrap animations in `prefers-reduced-motion: no-preference`
- Panel open: slide from right (spring ok but keep subtle)

---

## 10. Icons

- Style: **Lucide** equivalent — 1.5px stroke, round caps
- Sizes: 16px inline, 20px nav, 24px empty state
- Color: `currentColor` inherited from text token — never hardcode except StemMark fill
- **No emojis in UI** — use `✦` `✓` unicode sparingly in inject button only (hero does this)

---

## 11. Dark theme behavior

When user toggles dark in extension settings, switch to DESIGN_SYSTEM dark tokens (section 3.3):
- Panel bg `#0C0C0F`, cards `#141418`
- Text `#F0F0F2` / `#8A8A9A`
- Borders `#1E1E24`
- Teal accent unchanged `#0EA5A0`
- Step connectors: **1px dashed `#2A2A35`**

Dark mode is **not** on the marketing homepage — it’s extension-only. Both themes must feel like the same product.

---

## 12. Gap analysis — current extension vs this spec

Use this checklist when auditing. Mark each item pass/fail:

### Brand & tokens
- [ ] Zero purple hex codes remain in `assets/*.css`, `src/**/*.tsx`, `pdf.ts`, `composer-slot.ts`
- [ ] Zero `linear-gradient` in extension UI (panel, popup, options, buttons)
- [ ] Zero `box-shadow` except focus rings
- [ ] `--slm-accent` is exactly `#0EA5A0`

### Composer inject
- [ ] Pill `✦ stemLM` not circle FAB
- [ ] 10px font, 6px radius, teal bg
- [ ] Injecting/attached states match hero copy

### Study panel structure
- [ ] “SIDE PANEL” label present
- [ ] “EXTRACTION STATUS” block with green dot + mono framework key
- [ ] Diagram well above steps (hero layout)
- [ ] Step rows use `01` mono chips on `#0EA5A015`
- [ ] Formula in mono teal on `#F8F9FC`

### Typography
- [ ] No font-weight 600+ in CSS
- [ ] JetBrains Mono on keys, indices, formulas
- [ ] Inter 400 body, 500 labels

### Components still often wrong
- [ ] Session pills: teal dim when active, not gradient
- [ ] Progress rail: mono badges not circles
- [ ] Quick-check: workspace card style
- [ ] Loading: no purple shimmer gradient
- [ ] Popup primary button: flat teal not gradient

### Files to audit line-by-line
```
assets/tailwind.css
assets/panel.css
assets/pages.css
entrypoints/content/style.css
src/lib/composer-slot.ts
src/lib/pdf.ts
src/components/OverlayButton.tsx
src/components/PanelHeader.tsx
src/components/Panel.tsx
src/components/StepCard.tsx
src/components/ProgressRail.tsx
src/components/Loading.tsx
src/components/EmptyState.tsx
src/components/QuickCheck.tsx
src/components/FollowupBar.tsx
src/components/SelectionPopover.tsx
entrypoints/popup/App.tsx
entrypoints/options/App.tsx
```

---

## 13. Implementation order (for coding agent)

1. **Tokens first** — replace all CSS variables in `tailwind.css` to match section 3; grep entire repo for purple/gradient/shadow
2. **Composer inject** — `OverlayButton.tsx` + `composer-slot.ts` to hero pill spec
3. **Panel header** — extraction status + SIDE PANEL + framework key
4. **Panel body layout** — diagram well + hero step list (restructure `Panel.tsx` if needed)
5. **Step card** — mono badges, formula/takeaway blocks per sections 6.9–6.12
6. **Rail / navigation** — mono index badges, teal active state
7. **Popup & options** — workspace card patterns
8. **PDF** — wordmark + mono step numbers
9. **Dark theme pass** — DESIGN_SYSTEM dark tokens
10. **QA** — side-by-side screenshot with stemlm.app hero demo at 1280px width

---

## 14. QA protocol

### Visual comparison
1. Open https://www.stemlm.app — capture hero demo with side panel open (projectile question, step 3 visible)
2. Open Gemini with extension — inject same question — capture panel
3. Overlay screenshots at 45% panel width
4. Diff colors with eyedropper: panel bg `#FFFFFF`, borders `#E2E8F0`, accent `#0EA5A0`

### Token grep (must return zero hits in extension UI code)
```
#7c6bff #6d5efc #5b46e0 #8c7dff
linear-gradient
box-shadow (except focus/ring)
font-weight: [67]00
font-weight: 800
```

### Functional checks
- Inject shows `✦ stemLM` pill
- Panel shows extraction block after capture
- Steps use `01` `02` format
- PDF prints teal wordmark
- Dark toggle switches to `#0C0C0F` panel

---

## 15. Copy deck (use verbatim where noted)

| Location | Text |
|----------|------|
| Panel label | `SIDE PANEL` |
| Extraction label | `EXTRACTION STATUS` |
| Extraction success | `Framework matched in response.` |
| Loading title | `Reading response` |
| Loading sub | `Matching framework and building step cards` |
| Inject idle | `✦ stemLM` |
| Inject done | `✓ Attached` (composer) / `✓ stemLM` (button) |
| Empty title | `Study workspace` |
| Empty body | `Type your question in Gemini, then tap ✦ stemLM beside send.` |
| Popup status | `On Gemini — ready` |
| Tab 1 | `Steps` |
| Tab 2 | `Solution` |
| Reviewed badge | `Reviewed` |
| Quick-check reveal | `Reveal answer` |

---

## 16. What NOT to copy from marketing site

These exist on stemlm.app but are **intentionally excluded** from extension UI:

| Marketing element | Why exclude |
|-------------------|-------------|
| Waitlist section gradients/blur orbs | Violates flat design system |
| `box-shadow` on waitlist cards | Banned in product UI |
| Space Mono + blinking cursor logo | Landing page only |
| `font-semibold` / 600 weight in nav | Too heavy for product |
| University logo strip | Not extension context |
| ChatGPT window chrome (traffic lights) | Gemini host looks different |
| Private beta badges | Unless extension is in beta again |

---

## 17. One-paragraph agent kickoff prompt

Copy-paste this to start work:

> Redesign the stemlm-app Chrome extension UI to be visually indistinguishable from the stemlm.app product. Use https://github.com/chayprabs/stemlm `DESIGN_SYSTEM.md` and `components/hero.tsx` side panel as canonical references. Replace all purple (#7c6bff) with teal (#0EA5A0). Remove all gradients and box shadows from extension surfaces. Implement the hero composer inject pill (`✦ stemLM`, 10px, 6px radius). Rebuild the split panel to match the hero side panel: wordmark + “SIDE PANEL”, EXTRACTION STATUS with green dot and `STEM-*` mono badge, diagram well on `#F1F5F5`, step rows with `01` mono chips on `#0EA5A015`, formulas in JetBrains Mono teal on `#F8F9FC`. Use Inter 400/500 and JetBrains Mono only. Popup/options follow `workspace-app.tsx` card patterns. Follow `UI_ALIGNMENT_PROMPT.md` in the repo for every pixel spec and run the section 14 QA grep before finishing.

---

*Document version: 2026-06-05 · aligned to stemlm @ main (DESIGN_SYSTEM.md + hero.tsx + workspace-app.tsx)*
