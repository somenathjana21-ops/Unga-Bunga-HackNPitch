# Verification and release evidence

## Foundation verification

Checked locally on 9 November 2026. This is foundation evidence, not full-campaign acceptance.

| Check | Result |
| --- | --- |
| Dependency installation | npm install completed; audit reported 0 known vulnerabilities at install time. Lockfile committed-ready. |
| Asset validation | 19 runtime files validated from 55 preserved originals; selected assets total 18.8 MiB on disk, loaded by scene. |
| TypeScript | Passed strict typecheck. |
| Rules and persistence | 7 tests passed: two/four-hit death, persistent wounds, one-time recovery, rescue retry, invalid saves, blocked storage, wall/bounds checks. |
| Production build | Passed. Phaser chunk is approximately 318 KiB gzipped; Vite warns that its uncompressed chunk exceeds 500 KiB. Phaser is dynamically loaded after menu entry. |
| Production preview browser | Headless Chromium on Windows, 1366x900 and 1366x768: title art, controls dialog, difficulty labels, game load, movement, E interaction, Escape exit, three reentries, keyboard dialog. No page errors or failed HTTP responses. |
| Visual review | Title and game screenshots inspected; original K sprite is visible. Its static pose is deliberately a placeholder for missing walking art. |
| PDF checks | Both PDFs rendered with Poppler and visually reviewed; page text bounds checked. Editable Markdown sources and the generator are included. |

Local preview address while the development server is running: http://127.0.0.1:4173/ . This is not a public deployment.

Not yet checked: interactive combat/game feel, a full campaign, sound, live cloud/database policies, actual Vercel hosting, multiplayer collaboration access, and real-device performance. Those features/tasks belong to the subsequent phases.

## Required team verification before submission

- Full 20-25-minute target playthrough, measured with a new player.
- Story Mode and Real Mode combat, sustained damage, milestone recovery, every rescue death and retry.
- Save/reload at wounded, active-rescue, failed and completed states; blocked/corrupt storage.
- Audio unlock, mute/settings persistence, captions, reduced motion, skip, pause and browser focus loss.
- Actual Vercel deployment from a reviewed commit, opened from another machine.
- Live Supabase migration, auth callback, conflict UI and two-account row isolation if cloud is enabled.
- Target-laptop performance, source rights/credits and hackathon organizer requirements.

## Release record (team fills in)

Commit/tag:

Vercel URL:

Supabase environment and migration date (if enabled):

Browser/device/resolution:

New-player runtime and performance observations:

Known issues and owner:

Rollback commit:
