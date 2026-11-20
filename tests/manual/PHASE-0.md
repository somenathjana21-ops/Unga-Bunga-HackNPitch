# Phase 0 — Manual Verification

**Scope:** repository scaffold + game shell only. No gameplay is expected.
**Owner:** whoever built the scaffold (Dev 3).
**Rule:** mark a box only after you personally observed it. "The agent said it's
done" is not a pass.

Run this after `npm run check` passes, in a real desktop browser, and repeat the
browser items in a second browser before sign-off.

---

## 0. Preflight

- [ ] `node --version` reports **20 or newer**.
- [ ] `npm install` completes with no errors.
- [ ] `npx playwright install chromium` has been run once.
- [ ] `npm run check` prints `N/N checks passed, 0 failed` and exits with code 0.
- [ ] `tests/artifacts/phase-0-boot.png` exists and shows the shell status board
      (title, status rows, scaffold panel — not a blank or distorted canvas).

## 1. Serve and boot

- [ ] `npm run dev` prints a `http://127.0.0.1:PORT/` URL and stays running.
- [ ] Opening the URL shows the WANT boot screen within one second.
- [ ] Browser console is **empty of errors**. Warnings are acceptable only if
      they are the expected low-FPS or missing-audio warnings.
- [ ] DevTools → Network: no 4xx/5xx. At boot there are **no image or audio
      asset requests** (only the document, modules and the inline favicon).
- [ ] Reload works; no stale module cache issues.
- [ ] Stop the server with Ctrl+C; the process exits cleanly.

## 2. Resize and high-DPI

- [ ] Resize the window slowly from wide to narrow and back: the 16:9 design area
      stays centred and never stretches or clips content.
- [ ] Maximise and restore the window: layout stays correct.
- [ ] DevTools device toolbar at **1920×1080**, **1440×900** and **1024×768**:
      letterbox bars appear on one axis only; text remains crisp.
- [ ] At Windows display scaling 125% or 150% (or browser zoom 125%): text and
      lines remain sharp, not blurry, and the canvas still fills the window.
- [ ] No scrollbars appear at any size.
- [ ] The status row reports the correct DPR and CSS size.

## 3. Pause and resume

- [ ] Press `P`: overlay reads **PAUSED**, reason **PAUSED BY PLAYER**, and the
      frame/update counters stop.
- [ ] Press `P` again: overlay clears, counters resume, no visual jump or
      fast-forward of the scan-line animation.
- [ ] Press `Esc` while running, then `Esc` again: same behaviour as `P`.
- [ ] Switch to another tab while running: game auto-pauses (you may need to
      switch back to see the overlay). Reason mentions **TAB HIDDEN**.
- [ ] Return to the tab: game resumes automatically, no simulation time jump.
- [ ] Click another window/alt-tab while the tab is visible, then return: reason
      mentions **WINDOW LOST FOCUS**, and the game resumes on focus.
- [ ] While paused by a tab switch, pressing `P` adds the manual reason; returning
      to the tab leaves it paused until `P` is pressed again.
- [ ] Hold a movement/action key, switch tabs, return: no key remains stuck down
      (release events were cleared).
- [ ] Minimise/restore the window: it does not fast-forward or drop into a
      spiral of catch-up frames.

## 4. Fixed timestep and FPS guard

- [ ] With DevTools closed, the FPS row sits near **60** and the shell is smooth.
- [ ] DevTools → Performance → CPU throttling **6×** for at least 5 seconds:
      the FPS row drops; after **3 sustained seconds below 50** the console shows
      one `[WANT] FPS guard: … fps sustained for …` **warning**.
- [ ] Remove throttling: the guard stops, FPS returns to ~60, and no error is
      logged.
- [ ] The warning never appears while paused and is rate-limited (no spam every
      second).
- [ ] In the source, `src/core/game.js` shows: fixed `1/60` step, `MAX_FRAME_DT`
      clamp, step cap, spiral guard, and `alpha` passed to render. Confirm by
      reading the file, not by watching the screen.

## 5. Asset manifest gate

- [ ] `git grep -n "assets/" -- index.html src` reports **only**
      `src/systems/asset-manifest.js` (the `ROOT` URL). No other hits.
- [ ] `git grep -nE "\.(png|jpe?g|webp|gif|ogg|wav|mp3|m4a)" -- index.html src`
      reports only the manifest, or nothing outside it.
- [ ] In the console: `WANT.assets.summary()` shows `loaded: 0` at boot.
- [ ] `WANT.assets.resolve("characters.k.sprites")` returns an absolute URL under
      `/assets/characters/k/`.
- [ ] `WANT.assets.summary().planned` equals the total ID count (all planned
      until Group B delivers files).
- [ ] `WANT.assets.resolve("not.real")` throws a clear "Unknown asset id" error
      (loud typos, not silent fallbacks).
- [ ] `WANT.assets.load("characters.k.sprites")` resolves to `null` with one
      console **warning** (file not delivered yet) and does not crash the shell.
      This intentionally creates a 404; reload afterwards to confirm the boot
      path still has zero asset requests.

## 6. Audio stub

- [ ] Before any click/keypress, the AUDIO row reads **STANDBY · CLICK TO
      UNLOCK** and the console shows no autoplay warning.
- [ ] Click the page once: AUDIO changes to **RUNNING** (or remains suspended if
      the browser blocks — note which browser).
- [ ] `WANT.audio.getState()` shows context state, `volumes` with `master`,
      `music`, `sfx`, and `buses: ["master","music","sfx"]`.
- [ ] `WANT.audio.toggleMute()` returns `true` then `false`; no exception.
- [ ] `WANT.audio.setBusVolume("music", 0.3)` then `getState()` reflects `0.3`.
- [ ] `WANT.audio.play("audio.sfx.uiConfirm")` resolves to `null` and logs a
      warning because the file is not delivered yet — **no crash, no unhandled
      rejection**.
- [ ] No audio file path appears in `src/systems/audio.js` (it only uses IDs).

## 7. Folder and document skeleton

Compare against Guidebook §5. All of these exist with exact names:

- [ ] `src/core`, `src/world`, `src/story`, `src/combat`, `src/ui`, `src/systems`
- [ ] `assets/characters`, `assets/backgrounds`, `assets/portraits`,
      `assets/illustrations`, `assets/audio/sfx`, `assets/audio/music`,
      `assets/vfx`
- [ ] `docs/`, `tests/manual/`
- [ ] Empty directories contain `.gitkeep` so a clean clone keeps them.
- [ ] `docs/decisions.md` records: engine choice + why, module system, folder
      conventions, worktree workflow, timing/pause rules, tooling.
- [ ] `docs/asset-ledger.md` has the table header and the add-asset procedure.
- [ ] `README.md` quick-start commands are the ones that actually work.
- [ ] `package.json` has `dev`, `check`, `check:shell`; runtime dependencies are
      still zero (Playwright is a devDependency).
- [ ] `Guidebook.md`, `Prompts.md` and `WANT-Playthrough.pdf` are committed so a
      clean clone has the source of truth.

## 8. Git and push

- [ ] `git status` is clean on the phase branch after the scaffold commit.
- [ ] `git log --oneline` shows the Phase 0 scaffold commit.
- [ ] `git ls-tree -r --name-only HEAD` includes `index.html`, `src/main.js`,
      `src/core/game.js`, `src/systems/asset-manifest.js`,
      `src/systems/audio.js`, `docs/decisions.md`, `docs/asset-ledger.md`,
      `tests/manual/PHASE-0.md`.
- [ ] The branch is pushed: `git push -u origin phase/0-scaffold` succeeds, and
      the remote branch is visible on GitHub.
- [ ] A teammate can clone the repo, run `npm install`, `npm run dev`, and see
      the shell with no extra steps.
- [ ] No `node_modules/`, `tests/artifacts/`, secrets or generated logs are
      committed.

## 9. Cross-browser sign-off

Repeat sections 1–4 in a second browser.

| Browser | Version | Sections 1–4 pass | Notes |
|---|---|---|---|
| Chrome / Edge | | [ ] | |
| Second browser (Firefox?) | | [ ] | |

- [ ] Canvas text is legible in both browsers.
- [ ] Pause/resume and auto-pause behave identically.
- [ ] No browser-specific console error.

## 10. Report

Post in the team channel, short:

```
P-A0 BUILD — <name>
npm run check: PASS (N/N), screenshot attached
Manual: Chrome PASS / <second browser> PASS
Blocked: none
Bugs: none
Branch: phase/0-scaffold @ <sha>
Next: orchestration merge + tag v0.0
```

If anything fails, do **not** tick it. Report the failing item with the exact
command, browser, viewport, and console output.
