# Kickoff prompt: first Claude Code session

Paste everything below the line into Claude Code, from the root of the `sar-console` repo, after you have saved `CLAUDE.md` there and attached the spec PDF (or placed it at `docs/spec.pdf`).

---

Read `CLAUDE.md` and `docs/spec.pdf` in full before doing anything. Then check the Figma MCP is connected by taking a screenshot of node `158:572` in file `aPOBeiNYhyyliwomVwpdiz`. If that fails, stop and tell me.

Do not commit or push anything. I make all commits myself.

Today we are doing **Milestone 1 only**. Start in plan mode and show me your plan before writing code.

**Milestone 1 scope**

1. This repo is empty. Scaffold Vite + React + TypeScript with React Router, Tailwind, Zustand, dnd-kit and Vitest.
2. Add the Figma tokens from `CLAUDE.md` to the Tailwind theme under the same names. Pull the font family, sizes and weights from `get_design_context` on node `158:572`.
3. Create the scripted data in `src/data/`: sectors, launch sites, all 38 assets by ID, and the proposed plan with a reason and source on every assignment.
4. Write `src/lib/coverage.ts` as a pure function and calibrate the contribution table so the Vitest cases in `CLAUDE.md` pass. Show me the table you ended up with.
5. Create the Zustand store: assignments by sector, staged and locked flags, a `moveUnit(unitId, toSector)` action that marks the unit as operator-set, and selectors for sector coverage, overall coverage, weakest sector and unassigned count.
6. Export from Figma: the `map/raster` layer as one image, and the four `sector/...` vectors as SVG paths in the 1440 × 1035 coordinate space.
7. Build Screen 2 at `/review` as a static screen rendered from the store: map with sectors, group markers and labels, top bar, tasking panel, legend. No drag yet.
8. Add a temporary dev-only button that calls `moveUnit('KRK-03', 'D')` so I can see every number on the screen change from one store update.

**Done means**

- `npm run dev` shows Screen 2, and side by side with the Figma screenshot of `263:5894` (the opening state, Sector D at 44%) the layout, colors, type and copy match.
- After moving KRK-03 and KRK-04 to Sector D with the dev button, the numbers match frame `158:572`: A 92, B 83, C 87, D 82, overall 86.
- `npm test` passes.
- No hex values in components, only token names.

When you finish, give me: a short list of what you built, anything in the Figma file that was ambiguous or that you had to guess, and a suggested commit message. Then stop.
