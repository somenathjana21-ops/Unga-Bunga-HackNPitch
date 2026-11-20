# WANT

A story-led browser game about the wrong person choosing to help.

**Status: Phase 0 foundation ready. The full campaign is planned, not implemented.**

## Start here

Joining the team? Start with [Clone and verify Phase 0](#clone-and-verify-phase-0).

Use Node.js 24 LTS and npm. In this folder:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. No Supabase account or environment variables are needed for the preview.
`npm run dev` prepares the selected artwork automatically. Never edit the generated `public/assets` copies.

```sh
npm run check   # assets, TypeScript, rules/save tests, production build
npm run preview # serve the production build after npm run build
```

## What works now

- A title menu using the existing K poster, difficulty selection, and keyboard-accessible controls dialog.
- A Phaser exploration test room using K's existing 48px interaction sprite, four-direction tile movement, walls, and an interaction marker.
- Tested campaign-state helpers for persistent damage, milestone healing, rescue death/retry, and validated local-save reads/writes. These helpers are ready for campaign wiring; the movement preview does not save campaign progress.
- An asset inventory and repeatable runtime-copy step, a pinned dependency lockfile, CI workflow, and Vercel build configuration.
- A prepared optional Supabase client and private-save migration. Cloud authentication/sync is **not connected**.

## What the team builds next

Story scenes, real-time combat, the rescue mission, cutscenes, audio, campaign save/continue UI, optional cloud saves, and deployment. The existing character sheets are interaction poses, not directional walk animations.

## Read in this order

**Every AI agent starts with [PROGRESS.md](PROGRESS.md)** and follows [AGENTS.md](AGENTS.md). Claim the task before editing; update progress, checks, blockers and the next action during work and before handoff. This is the live implementation record; the documents below describe the plan.

1. [Decisions](docs/DECISIONS.md) - agreed scope and rules.
2. [Development guidebook](docs/GUIDEBOOK.md) - phases, copyable build/review prompts, manual checks, four-day schedule.
3. [Full playthrough](docs/PLAYTHROUGH.md) - events, dialogue, interactions, cutscenes, and ending. Printable version: `output/pdf/WANT-Playthrough.pdf`.
4. [Combat design](docs/COMBAT_DESIGN.md) and [architecture](docs/ARCHITECTURE.md).
5. [Team workflow](docs/TEAM_WORKFLOW.md), [asset checklist](docs/ASSET_CHECKLIST.md), and [deployment](docs/DEPLOYMENT.md).
6. [Optional horde mode](docs/OPTIONAL_HORDE_GUIDE.md) - separate post-MVP phases, prompts, and acceptance checks.

The printable development handbook is `output/pdf/WANT-Development-Guidebook.pdf`; edit the Markdown sources, then regenerate with `python scripts/build-pdfs.py` in a Python environment with ReportLab installed.

## Constraints

Desktop keyboard/mouse, one 20-25-minute campaign, one success ending, two difficulties. No numeric levels or endless hordes in the four-day campaign. Phone support belongs to later improvements.

Original source PDFs and all 55 original images remain in place. See [verification](docs/VERIFICATION.md) for local results and the remaining release checks.

## Clone and verify Phase 0

The shared GitHub repository already contains the project history on `main`. Once you have access, clone it into your own local folder outside shared or synced storage. Git sets up `origin` automatically.

```sh
git clone --branch main https://github.com/somenathjana21-ops/want.git
cd want
git rev-parse --short HEAD
```

With Node.js 24 LTS and npm, install from the lockfile, run the foundation checks, then serve the build produced by those checks. The preview works without an `.env` file or Supabase credentials.

```sh
node --version
npm --version
npm ci
npm run check
npm run preview
```

`npm run check` validates runtime assets, checks TypeScript, runs the rules and save tests, and builds for production. Open the local URL printed by `npm run preview` and check the following.

1. K's poster appears on the title screen. Use Tab and Enter to open and dismiss the controls dialog. Verify the descriptions and room labels for Story Mode and Real Mode.
2. K appears in the room. Move with WASD and the arrow keys, check that walls stop movement, and hold two directions to confirm K stays on the grid without moving diagonally.
3. Press E near the amber marker and again from farther away. Only the nearby press should show K's line. Use Escape to return to the menu and re-enter several times.

Record your commit, environment, and check results in [PROGRESS.md](PROGRESS.md). At kickoff, assign owners in the [task board](docs/TASK_BOARD.md), confirm the organizer's rules on prebuilt work, and agree on shared interfaces before claiming implementation work. See the [Phase 0 guide](docs/GUIDEBOOK.md#phase-0---verify-and-assign-foundation-supplied) and the [branch workflow](docs/TEAM_WORKFLOW.md#everyday-branch-workflow).
