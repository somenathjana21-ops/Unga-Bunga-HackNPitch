# Four people, one working game

## Ownership

| Role | Owns | Avoids editing without agreement |
| --- | --- | --- |
| A - lead/integrator (suggested: project creator) | World, story routing, rescue integration, core state, shared config and release | B's combat internals while B is working |
| B - gameplay | CombatScene, enemy behavior, projectiles, dodge/counter, combat tests | main.ts, dialogue, migrations |
| C - support coder | Dialogue/media renderer, menus, local-save UI; optional cloud later | Core state schema or dependencies without A |
| D - content/QA | Maps/art/audio sourcing, dialogue proofreading, credits, playtest reports | Unreviewed generated code in shared systems |

These are suggested roles, not assumptions about anyone's ability. Put real names and GitHub handles in `TASK_BOARD.md`; use C/D flexibly. One person is always accountable for a task even when AI does most of its typing.

## Set up the shared repository

1. Create a GitHub repository and invite all teammates. Keep it private unless the organizer requires public access. Push the initialized local repository to the actual remote.
2. Each teammate uses a separate local clone. Do not share a live repository through OneDrive.
3. Protect `main`: passing CI and one teammate review. If repository rulesets are unavailable, enforce this manually.
4. Put real handles in `.github/CODEOWNERS`. Invite teammates to Vercel instead of sharing passwords; limit database-admin access to A and a backup.
5. Use Node 24 and `npm ci`. A handles dependencies and the lockfile.

## Everyday branch workflow

```sh
git switch main
git pull --ff-only
git switch -c feat/p3-dodge-counter
# Implement one assigned slice, then run checks.
npm run check
git add src/game/combat tests
git commit -m "Add timed counter after a perfect dodge"
git push -u origin feat/p3-dodge-counter
```

Stage your actual task files; the example paths belong to future Phase 3. Exclude unrelated work and environment files. Open a pull request, complete its checklist, and get a teammate's review plus a targeted playtest before merging.

Before a branch grows stale, commit your own work, fetch origin, and merge `origin/main` into the feature branch. Resolve conflicts with the relevant owner. Never let an AI choose one entire side of a shared state/config file without understanding both edits. Rerun tests and the affected player journey after resolving conflicts. Do not force-push `main`.

## Prevent AI agents from colliding

- Give every AI session the task ID, branch, allowed files, current decision log, and acceptance criteria.
- Never ask two AI sessions to implement the same subsystem in one working copy at once. Separate branches alone do not isolate working files in the same folder; use separate clones or worktrees.
- Agree on shared types before concurrent work. If B needs a new event/state field, put the exact proposed interface in the task and ask A to integrate it once.
- Use the reusable prompt preface from the guidebook. Tell each model what the other people currently own.
- End the session with a written handoff. Treat generated code as a draft until checks and actual input testing pass.
- Do not merge a second implementation of dialogue, input, save state or audio just because another AI produced it.

## Copyable task brief

```text
Task ID / phase:
Owner / branch:
Player-visible result:
Allowed files:
Shared interfaces needed:
Files owned by others:
Inputs and assets:
Acceptance checks:
Timebox and fallback:
```

## Copyable handoff

```text
Task / branch / commit:
What now works:
Files and interfaces changed:
Checks run (results and environment):
Manual steps verified:
Known bugs or missing assets:
Next smallest task and its owner:
```

## Daily integration rhythm

Morning: confirm ownership. Midday: merge and play one working slice. Evening: run the whole available route and update the board. Day 3 must include the rescue/ending; Day 4 permits fixes only. Tag a release candidate. If a late change breaks it, revert and rebuild. Prepare both the Vercel URL and a local production preview with downloaded media and no required cloud login.
