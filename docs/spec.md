# Spec: Mixed-Asset Area Tasking

Nov 1, 2026 · Leslie Johnson

> Converted from `Spec Mixed-Asset Area Tasking.pdf`. One section differs from the PDF: "Detailed state: Relay link lost" was re-scripted on Nov 11, 2026 to match the Figma frames (Sector B and HYD-07 to HYD-13, instead of Sector D and HYD-08 to HYD-16). Where this spec and the Figma file disagree on layout, the Figma file wins; see `CLAUDE.md`.

## Context and problem

One operator must assign 38 mixed autonomous assets to a flooded coastal region in under 5 minutes, and trust that the plan covers the area before launch.

The scenario is fictional. A Category 4 hurricane made landfall 14 hours ago. Across a 1,200 km² coastal region, cell towers are down, roads are flooded, and people are stranded on rooftops and in cut-off neighborhoods. The search looks for people who need rescue and maps flood depth so ground and boat crews can reach them. A two-person team runs the search: one mission operator and one supervisor.

The hard part is that the assets are not interchangeable. They differ in range, endurance, sensors, speed, and link quality. Today an operator assigns them one by one, which is slow and leaves coverage gaps no one notices until the debrief.

This feature lets the operator draw sectors, see what each asset can actually do there, accept or adjust a tasking plan the autonomy proposes, and confirm coverage before anything moves.

## Goals, non-goals, and success criteria

### Goals

- The operator can see, at a glance, which sectors are covered, by what, and how well.
- The autonomy proposes a full tasking plan; the operator can accept it whole, change any assignment, or lock assets out.
- Gaps and weak coverage are visible before launch, not after.
- Every change the autonomy makes to the plan is explained in one line the operator can read.

### Non-goals

- Live flight control of individual assets.
- Route-level path planning (the autonomy owns it; this screen shows the result).
- Anything involving weapons, targeting, or engagement.

### Success criteria

- Tasking 38 assets takes under 5 minutes, down from about 20 today.
- The operator can name the weakest-covered sector without hunting for it.
- Zero assets launch with an assignment the operator did not see.

## Users and asset roster

The mission operator makes every tasking decision; the supervisor watches the same view and can veto before launch.

The operator is trained, under time pressure, and working on a large desktop display, often in a dim room. They trust the autonomy when it shows its reasoning and distrust it when assets move without explanation.

All asset types are invented for this sample.

| Asset type | Count | Sensor | Endurance | Range from base | Strength | Limit |
|---|---|---|---|---|---|---|
| Roc (fixed-wing) | 6 | Wide-area EO/IR | 18 h | 400 km | Covers large sectors fast | Low detail per pass |
| Hydra (quadrotor) | 24 | High-res camera | 45 min | 15 km | Close inspection | Must launch from a forward staging site |
| Griffin (VTOL) | 4 | Radar + relay | 6 h | 120 km | Extends comms range | Few available |
| Kraken (surface drone) | 4 | Sonar + camera | 30 h | 80 km | Goes where crewed boats can't safely | Slow, about 12 knots |

Total: 38 assets, 36 available. Two Rocs are in maintenance and must appear as unavailable. On screen, every unit is shown by its ID, not its class name: ROC-01 to ROC-06, HYD-01 to HYD-24, GRF-01 to GRF-04, KRK-01 to KRK-04.

## Screen 1: Area overview

The operator sees the search box, its sectors, and every available asset on one screen, before anything is assigned.

### Layout

- **Map (about 70% of width):** the 1,200 km² storm zone split into sectors. The operator can draw, split, or merge sectors. Each sector shows a priority (high, medium, low) set from population density and flood depth, plus pins for calls for help received before the towers went down.
- **Asset roster (right rail):** grouped by type, with count available and count unavailable. Each row shows status, endurance left, and link strength.
- **Mission bar (top):** mission name, time since last contact, weather window, and one primary action: "Propose tasking."

### Interactions

- Hovering an asset type shows its reach on the map as a range ring from its launch point.
- Selecting a sector shows which asset types can reach it, and which can't.
- Unavailable assets stay visible but greyed out, with the reason on hover.

### Open design questions

- How to show sector priority without competing with coverage color on later screens.
- How the roster stays scannable with 38 rows.

## Screen 2: Review proposed tasking (key decision)

The autonomy proposes an assignment for all 36 available assets; the operator reviews it, changes what they disagree with, and approves.

### Layout

- **Map:** each sector is filled by expected coverage (percent of the sector searched in the next 2 hours). Assigned assets show as grouped markers per sector.
- **Tasking table (right rail, replaces the roster):** one row per sector: priority, assets assigned by type, expected coverage, and a one-line reason ("KRK-02 and KRK-03 added: flood depth too high for ground crews").
- **Coverage summary (top):** overall coverage, the weakest sector named, and assets left unassigned.
- **Actions:** "Approve and launch" (primary), "Re-propose," and "Clear plan."

### Interactions

- Drag an asset between sectors, or change a count, and coverage updates live.
- Lock an asset or a sector, so the autonomy won't change it on re-propose.
- Every operator change is marked as "set by operator"; every autonomy choice keeps its reason.
- If an operator change drops a high-priority sector below 60% coverage, show a warning in place. Don't block the operator.
- Approval needs a final summary step that lists what will launch, so nothing launches unseen.

### Open design questions

- How to tell operator choices from autonomy choices without adding clutter.
- How strong the low-coverage warning should be: inline, banner, or both.

## Screen 3: Tasking live

After approval, the operator watches actual coverage build against the plan and sees right away when they diverge.

### Layout

- **Map:** searched areas fill in over time; planned-but-not-yet-searched areas stay outlined. Assets show their live position.
- **Sector status list (right rail):** planned versus actual coverage for each sector, with a clear flag when a sector falls behind.
- **Event feed (bottom, collapsible):** a timestamped log of autonomy changes, each with its reason ("HYD-14 returned for battery; HYD-19 reassigned to Sector C").

### Interactions

- Selecting a feed event highlights the assets and sector involved.
- When a sector falls more than 15% behind plan, the operator gets a prompt to re-propose tasking for that sector only.
- If a person or group is spotted, a "Possible sighting" card appears with the source asset, image, and confidence. The operator confirms or dismisses it.

## Edge cases and states

Each state below needs its own frame or a variant in Figma; these are where the design is judged.

| State | Screen | What the operator must see |
|---|---|---|
| Not enough assets for full coverage | 2 | Which sectors go uncovered and why, before approval |
| Asset becomes unavailable during review | 2 | The change, the reason, and the affected sector, without the plan reshuffling silently |
| Operator overrides drop a high-priority sector below 60% | 2 | An in-place warning with the coverage cost; approval still allowed |
| Autonomy can't reach a sector (out of range) | 1, 2 | Sector marked unreachable by type, with the reason |
| Link to a Griffin relay drops | 3 | Which assets are now out of contact, and their last-known position |
| Supervisor vetoes the plan | 2 | Who vetoed, the note, and the plan returned to draft |
| Possible sighting with low confidence | 3 | Confidence shown plainly, image first, confirm or dismiss |
| Empty state: no sectors drawn | 1 | One clear next step: draw or import sectors |

## Components, open questions, and deliverables

Build a small, reusable component set, then use it on all three screens.

### Components

- Sector shape with priority and coverage states
- Asset marker by type, with status variants (available, assigned, unavailable, out of contact)
- Roster row and tasking table row
- Reason line (autonomy versus operator, with source)
- Coverage meter (planned versus actual)
- Inline warning and confirmation summary
- Event feed item and sighting card

### Product questions to raise (not design details)

- Can the supervisor change the plan, or only veto it?
- What coverage threshold counts as "good enough" to launch?
- Should locked assets ever be moved by the autonomy in an emergency?

### Deliverables checklist

- [ ] Screens 1–3 at desktop size, dark theme
- [ ] The 8 edge-case states as frames or variants
- [ ] Component page with variants
- [ ] Annotations for engineering on Screen 2
- [ ] One coded interaction on Vercel: drag an asset between sectors, with coverage updating live

## Detailed state: Relay link lost (Screen 3)

When one Griffin relay drops, the operator sees one incident card instead of separate alerts for each unit.

**Trigger:** GRF-02, on station over Sector B, loses its link. HYD-07 to HYD-13, which relay through it, go out of contact and hold at their last positions.

### Incident card

- **Root cause:** GRF-02 relay link lost, shown first and pinned to the top of the event feed.
- **Grouped effects:** HYD-07 to HYD-13 out of contact, holding. Collapsed under the root cause and expandable.
- **Impact:** Sector B's expected coverage drops from 83% to the coverage ROC-02 and KRK-01–02 give alone (computed by the coverage model).
- **Options, side by side, no default selected:**
  - a. Move GRF-03 from Sector C to cover Sector B. Restores contact in about 6 minutes, but leaves Sector C's relay thin.
  - b. Return HYD-07 to HYD-13 to staging and re-propose tasking for Sector B.
- **Always available:** pause Sector B, or hold all affected units.

### Map treatment

- A steady, high-contrast ring around GRF-02, plus a shape cue. No blinking.
- Out-of-contact Hydras shown at their last-known position, dimmed, with time since last contact.
- Dashed lines show where the autonomy is moving other units to compensate.

**Grouping rule:** only alerts caused by the root event are grouped. Any unrelated failure during the incident appears as its own alert.

**After resolution:** the event feed logs the root cause, the option chosen, who chose it, and the time.
