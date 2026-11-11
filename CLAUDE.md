# sar-console: Mixed-Asset Area Tasking demo

Interactive demo of an operator console for a fictional coastal flood search (SAR-1102). One operator reviews a tasking plan the autonomy proposes for 36 mixed drones, adjusts it by dragging units between sectors, launches, and watches coverage build. This is a design demo with scripted data. There is no backend and no real autonomy.

## Working rules

- **Never commit or push.** Leslie makes every commit herself. Stop at the end of each milestone, summarize what changed, and suggest a commit message.
- Work one milestone at a time (see "Milestones"). Do not start the next one without being asked.
- The Figma file is the source of truth for layout, color, type and copy. Do not invent UI copy; if a state has no Figma frame, say so and propose copy for approval.
- Ask before adding any dependency not listed under "Stack".

## Stack

- Vite + React + TypeScript, client-only (no SSR)
- React Router (real URLs per screen)
- Tailwind CSS, with tokens from the Figma variables below
- Zustand for the shared plan state
- dnd-kit for drag and drop
- Vitest for the coverage model
- Deploys to Vercel as a static site; add a `vercel.json` rewrite so deep links (`/live`) resolve to `index.html`

## Figma

File key: `aPOBeiNYhyyliwomVwpdiz` (Mixed-asset Territory Mapping). Use the Figma MCP: `get_design_context` and `get_screenshot` per frame. Frames are 1440 × 1035, dark theme.

| Frame | Node ID |
|---|---|
| Screen 1 · Area overview | `171:805` |
| Screen 1 · hover asset type (Hydra range ring) | `177:948` |
| Screen 1 · sector selected (reach card) | `177:1326` |
| Screen 1 · hover unavailable asset (tooltip) | `177:1693` |
| Screen 1 · edge: no sectors drawn | `179:1345` |
| Screen 1 · edge: sector unreachable by type | `179:1782` |
| Screen 2 · v5 (review proposed tasking) | `158:572` |
| Screen 2 · v5 · re-propose popover | `160:694` |
| Screen 2 · v5 · edge: low-coverage warning | `263:5894` |
| Screen 3 · v3 (tasking live, teal palette) | `238:2144` |
| Components page | `0:1` (main frame `1:2`) |

Design notes sit beside the frames as `note/...` frames on page `118:1271`. Read them; they explain decisions (roster grouping, color rule on the live map, label rules).

**No Figma frame exists yet for:** the expanded unit group and drag state, the "Move to sector" menu, the review-and-launch summary step, and the relay-loss incident card. Build these from existing components and the spec, and flag each one for design review.

### Tokens (Figma variables)

```
surface/app            #1f2a2e
surface/panel          #131b1e
surface/card           #1a2427
border/subtle          #2b383c
text/primary           #e4ecee
text/secondary         #a6b4b8
text/on-interaction    #0b1220
interaction/primary    #8ec5ff
status/ready           #5fd068
status/autonomous      #cdb8ff
status/operator-set    #2ec4b5
status/needs-operator  #ffb020
status/degraded        #ff6b6b
status/out-of-contact  #87959a
status/unavailable     #6b7a80
map/searched           #9fd8e0
map/zone-boundary      #5e7378
map/zone-label         #c3d3d8
map/label-pill         #1e2a2e
```

Put these in the Tailwind theme under the same names. Never hard-code a hex value in a component.

**Color rule:** purple (`status/autonomous`) marks a change the autonomy made on its own. Amber (`status/needs-operator`) marks where the operator must decide. Teal (`status/operator-set`) marks an operator choice. Everything running as planned stays neutral. Status is never carried by color alone: each state badge also has its own shape.

## Layout

- Fixed 1440 × 1035 stage, scaled to fit the viewport. Desktop only; below about 1100 px wide show a short "best viewed on desktop" note.
- **Map:** the Figma `map/raster` layer exported once as a static image, used as the background. Sectors are SVG paths exported from the Figma `sector/...` vectors, positioned in the same 1440 × 1035 coordinate space. Markers, labels and rings are React components over the SVG. No map library, no tiles, no API key.
- Right rail (384 px): roster on Screen 1, tasking table on Screen 2, sector status on Screen 3. The primary action sits at the bottom of the rail on every screen.
- Top bar is status only.

## Data (scripted, in `src/data/`)

Sectors: A · East Cooper (HIGH), B · Peninsula (MEDIUM), C · Sea Islands (MEDIUM), D · Edisto (HIGH).

Assets, always shown by ID: ROC-01 to ROC-06 (ROC-05 and ROC-06 unavailable, maintenance), HYD-01 to HYD-24, GRF-01 to GRF-04, KRK-01 to KRK-04. 38 total, 36 available.

Launch sites: Airfield (Rocs, Griffins), Staging A (Hydras, 15 km range), Marina (Krakens).

Griffins fly comms relay and are not assigned to a search sector on Screen 2 ("All sectors · Relay over every sector"). On Screen 3 each holds station over one sector: GRF-01 over A, GRF-02 over B, GRF-03 over C, GRF-04 over D.

**Proposed plan (the state the demo opens Screen 2 with):**

| Sector | Units | Expected coverage | Reason line |
|---|---|---|---|
| A | ROC-01, HYD-01–06 | 92% | HYD-01–06 on rooftops: densest areas, most help calls |
| B | ROC-02, HYD-07–13, KRK-01–04 | 89% | KRK-01–04 added: water too deep for ground crews |
| C | ROC-03, HYD-14–20 | 87% | ROC-03 alone: open marsh, few structures to inspect closely |
| D | ROC-04, HYD-21–24 | 44% | HYD-21–24 on rooftops: neighborhoods cut off by flooding |

Sector D opens below the 60% target with the low-coverage warning from frame `263:5894` ("Hydras at max range from Staging A: little time on station"). The opening figure is 44%, 16 points below the 60% target; the warning text is computed from the coverage model, never hard-coded. The demo's main move is the operator dragging KRK-03 and KRK-04 from Sector B to Sector D, which produces the state in frame `158:572`: B 83%, D 82%, overall 86%, and "Set by operator · moved from Sector B · 08:41" on the moved units.

Every assignment carries its own reason and a `source` of `autonomy` or `operator`. A unit the operator moves switches to `operator` with "Set by operator · moved from Sector X · HH:MM".

## Relay-loss incident (Screen 3, scripted)

This replaces the version in the spec PDF, which used different unit and sector numbers. One incident card instead of separate alerts.

- **Trigger:** GRF-02, on station over Sector B, loses its link. HYD-07 to HYD-13, which relay through it, go out of contact and hold at their last positions.
- **Root cause first:** "GRF-02 relay link lost", pinned to the top of the event feed.
- **Grouped effects:** HYD-07 to HYD-13 out of contact, holding. Collapsed under the root cause, expandable.
- **Impact:** Sector B's expected coverage drops from 83% to the value the coverage model gives for ROC-02 + KRK-01–02 alone. Compute it; do not hard-code it.
- **Options, side by side, no default selected:**
  - a. Move GRF-03 from Sector C to cover Sector B. Restores contact in about 6 minutes, but leaves Sector C's relay thin.
  - b. Return HYD-07 to HYD-13 to staging and re-propose tasking for Sector B.
- **Always available:** pause Sector B, or hold all affected units.
- **Map:** a steady, high-contrast ring around GRF-02 plus a shape cue, no blinking. Out-of-contact Hydras at last-known position, dimmed, with time since last contact. Dashed lines where the autonomy is moving other units to compensate.
- **Grouping rule:** only alerts caused by the root event are grouped. An unrelated failure appears as its own alert.
- **After resolution:** the event feed logs the root cause, the option chosen, who chose it and the time.

## Coverage model (`src/lib/coverage.ts`)

Pure function, no randomness: `coverage(sector, units) = 100 × (1 − Π(1 − c[type][sector]))` across the units in that sector, rounded to a whole percent. `c` is a per-type, per-sector contribution table, so the same type is worth less where it works badly (Hydras in Sector D at max range). Overall coverage is the unweighted mean of the four sectors. Weakest is the minimum.

Calibrate `c` so these hold, and lock them with Vitest:

- A (ROC-01 + 6 HYD) = 92
- B (ROC-02 + 7 HYD + 4 KRK) = 89
- B (ROC-02 + 7 HYD + 2 KRK) = 83
- Overall at open = 78; overall after both Krakens move = 86
- C (ROC-03 + 7 HYD) = 87
- D (ROC-04 + 4 HYD) = 44
- D (ROC-04 + 4 HYD + 2 KRK) = 82
- Moving any unit out of a sector never raises that sector's coverage

## Interactions

**Drag between sectors (Screen 2), the core interaction**
- Assigned units show as one group marker per type per sector (for example `HYD · ×6`).
- Clicking a group fans it out into individual markers with IDs. The operator drags one unit. Escape or clicking empty map collapses the group.
- While dragging: valid target sectors highlight, and the target shows a preview of its new coverage. A sector the type can't reach shows the reason and refuses the drop.
- On drop: the map label, sector fill, tasking-table row, coverage meter and top-bar summary (overall, weakest, unassigned) all update in the same frame. The unit is marked "Set by operator".
- If the drop leaves a HIGH sector under 60%, show the inline warning on that sector's card with the coverage cost. Never block the operator.
- Any operator change to a sector marked "✓ Staged" returns it to "Stage sector", so nothing launches unseen.

**Keyboard path**
- Each unit row in the tasking table has a "Move to sector…" menu listing the sectors with the coverage each would have after the move. Grouped rows (HYD-21–24) expand to individual units first.
- Also enable dnd-kit's keyboard sensor on the map markers.
- Announce every move through an `aria-live` region: "KRK-03 moved from Sector B to Sector D. Sector D coverage 68%."
- Visible focus rings everywhere. Respect `prefers-reduced-motion`. No blinking.

## Routes

- `/overview`: Screen 1. `?state=empty` shows the no-sectors edge case.
- `/review`: Screen 2.
- `/review/launch`: summary step listing every unit that will launch, by sector, with operator changes marked.
- `/live`: Screen 3. Coverage fills on a scripted timer; the relay-loss incident fires at a fixed point. `?at=incident` jumps straight to it.
- A small "Restart demo" control resets the store.

## Milestones

1. Scaffold, tokens, data, coverage model with tests, and a static Screen 2 that matches frame `158:572` from store data.
2. Drag between sectors with live coverage, operator-set marking, the under-60% warning, and the keyboard path.
3. Screen 1 (including the empty state) and the flow 1 → 2 → launch summary.
4. Screen 3: coverage filling, event feed, and the relay-loss incident card.
5. Polish, accessibility pass, Vercel deploy config.
