# Pass 3 visual scoring rubric — tightened after S3 round 1

Score each render against its source image with a boolean defect vector. Do not inspect compiler
source or the author’s spec. A defect is present when:

| Axis | Defect when… |
|---|---|
| `collision` | any two labels overlap, or a label sits on a stroke |
| `overflow` | ink leaves the frame, or is clipped |
| `legibility` | any text would render below ~9 px at card scale, or is rotated other than a 90° axis name |
| `completeness` | an object named in the spec is absent from the drawing |
| `topology` | connections/adjacency in the drawing differ from the intended figure |
| `convention` | a domain convention is violated: rail/ground orientation, sagging-positive, IEEE designator above/value below, NMR δ right-to-left, t2g below eg, or L→R signal flow |
| `proportion` | geometry misleads, such as a wrong angle or misplaced focal point |
| `density` | so much ink makes the card unreadable, or a legend is used where direct labels belong |
| `honesty` | the figure asserts something the source does not say, such as invented components or decorative filler |

Decision order and verdicts:

- `faithful`: zero defects.
- `degraded-honest`: defects only in `density` or `completeness`, and the figure still tells the truth.
- `wrong`: any `collision`, `overflow`, `legibility`, `topology`, `convention`, `proportion`, or `honesty` defect. An available render that depicts a different figure, substitutes generic geometry, or makes a source claim false is `wrong`, never `not-representable`.
- `not-representable`: no rendered image was supplied, or the supplied render is genuinely empty/non-figure. Do not use this verdict to soften an available but inaccurate drawing.

Return JSON with the input record ID, the nine boolean axes, `verdict`, and a concise evidence note.
