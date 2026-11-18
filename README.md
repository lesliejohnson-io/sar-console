# SAR Console

Operator console for mixed-asset search and rescue: drones, ground crews and boats working one territory under a single coverage picture.

**Live demo:** [sarconsole.lesliejohnson.io/live?at=incident](https://sarconsole.lesliejohnson.io/live?at=incident)

The link lands on the moment a comms relay drops and an operator reassigns around it. That sequence is the point of the project.

---

## The problem

In a wide-area search, the assets are easy to display and the search is not. Thirty-six units on a map produce thirty-six moving dots, and a dispatcher still can't answer the only question that matters: how much ground has been covered, and where are we behind.

This console answers that first and shows the assets second.

## Design decisions

**Coverage is reported as ground searched, not units deployed.** Each sector shows a percentage swept against where the plan expected to be by now. A sector with eight drones in it can still be twenty points behind, and the interface says so rather than letting activity stand in for progress.

**Autonomy and operator action share one log.** The event feed records both, with actor and timestamp on every line, so after an incident you can read back who decided what, in order. A console that only logs what the machine did leaves the human out of the record they will be asked to account for.

**The system proposes, the operator disposes.** When a sector falls behind, the panel offers *Re-propose Sector B* alongside *Keep current plan*. The recommendation is visible and the decision stays with the person, which is the only arrangement under which an operator can calibrate how much to trust it.

**Machine state is readable at a glance.** Six states (ready, autonomous, needs operator, degraded, out of contact, unavailable), one legend, used consistently across the map and the sector panel.

## Status

This is a self-initiated design concept, not a deployed system. The mission is scripted and the telemetry is synthetic. Bearing values are proposed rather than sourced, and are flagged as such in the data file. Nothing here has been flown.

What is real is the interface and the reasoning behind it. Design decisions are recorded in the pull request history rather than summarized after the fact. Each merged PR states what changed, why it matters to an operator, and what it traded away.

## Stack

TypeScript, React, Vite, Tailwind. Deployed on Vercel.

## Related

[Calibrate](https://github.com/lesliejohnson-io/calibrate): open-source UI patterns for showing machine state, confidence, and when a human should step in. The patterns this console applies.

---

Leslie Johnson · [lesliejohnson.io](https://lesliejohnson.io) · [leslie@lesliejohnson.io](mailto:leslie@lesliejohnson.io)
