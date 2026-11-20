# Task board

This is the planned ownership/dependency roadmap. **Live task status, agent claims and handoffs belong in [PROGRESS.md](../PROGRESS.md).** The initial baseline below is dated 9 November 2026; `Ready` means scoped, not implemented. Update this roadmap when assignments or scope change, rather than keeping a second competing progress log.

| Task | Owner (replace role with name) | Initial baseline | Depends on | Evidence required |
| --- | --- | --- | --- | --- |
| P0 foundation verification | A + everyone | Supplied; run locally | None | npm run check and preview on each machine |
| Assign team, remote, project access | A | Ready | None | Four collaborators, real owner handles |
| Confirm prebuilt-code/AI rules | A | Ready | None | Organizer requirements recorded |
| Walking sprites, tiles, machine art | D | Ready | Asset checklist | In-game size/contact-sheet review |
| P1 campus/dorm/camp world | A | Ready | P0 | Movement/interaction checks |
| P2 dialogue and opening | C | Ready | P1 contract | Full opening read and skip paths |
| P3 real-time combat | B | Ready | P0 | Both modes, timing, no double damage |
| P4 illustrations/audio/settings | C + D | Ready | P2 IDs | Mute/reduced motion/skip checks |
| P5 Lina rescue and ending | A + B | Ready | P1/P2/P3 | Full campaign and all rescue retries |
| P6 local Continue + Vercel | A + C | Ready | P5 | Deployed build and save/reload checks |
| P6 optional Supabase cloud | C | Deferred until local works | P6 local | Two-user isolation and conflict handling |
| P7 fresh-player QA and freeze | D + everyone | Ready | P5/P6 | Timed runs, issue log, release evidence |
| Optional Horde H0-H5 | Unassigned | Post-MVP only | Campaign accepted | See separate guide |

## Current handoff

Read [PROGRESS.md](../PROGRESS.md) for current handoffs and [VERIFICATION.md](VERIFICATION.md) for detailed evidence. Do not assume a deployment or database check has occurred.

## Team roles and event rules

The project creator confirmed A for lead/integration and B and C for support. Names and GitHub handles are pending, as are D's role and the combat owner assignment. The ownership table above is the initial plan.

Hack &lt;N&gt; Pitch 2026's Game Development track gives teams a 16-hour build window and permits Phaser and properly licensed, credited premade assets. The Game Development guidance does not explicitly address reuse of the team's existing game code. Confirm with the organizer whether the WANT foundation can be reused before relying on it for the judged build. [Organizer's Game Development guidance, page 4](https://d8it4huxumps7.cloudfront.net/uploads/attachements/files/8fadb2bf-b312-40ca-bc9d-e694244759e6.pdf#page=4)

## Issue template

```text
ID / severity (blocker, high, low):
Build/commit + browser + screen size:
Mode and checkpoint:
Steps to reproduce:
Expected / actual:
Screenshot or recording:
Owner / fix / retest result:
```
