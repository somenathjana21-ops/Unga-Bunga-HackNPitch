# Vercel and Supabase setup

The repository is prepared for these services. No remote resources have been created, no migration has been applied, and no deployment URL exists yet.

## 1. Verify the local production build

```sh
npm ci
npm run check
npm run preview
```

Test the printed preview URL. The build output is `dist`. The asset-copy step runs before builds, so the original `assets/characters` files and manifest must be present in the repository. Do not commit generated `public/assets`, `dist` or `node_modules`.

## 2. Publish through Vercel

1. Push the reviewed branch to the team's GitHub repository.
2. In Vercel, import that repository and set the project root to the folder containing `package.json`.
3. Use the Vite preset, Node 24, build command `npm run build`, output `dist`, install command `npm ci`. `vercel.json` supplies the framework/build/output settings.
4. Deploy a preview first. It needs no environment variables for local-only play.
5. Open it on a second machine/browser. Test title art, game loading, keyboard input, scene media, refresh, sound and Continue. Inspect missing-file and console errors.
6. After the release checklist passes, merge the release candidate to the configured production branch and verify the production URL as a separate check.

The current app uses a single URL and in-game scenes; no catch-all route rewrite is needed. If future browser routes are introduced, add and test routing behavior deliberately.

Official reference: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## 3. Prepare optional Supabase cloud saves

1. Create a development project under a team-owned organization. Keep production and development credentials distinguishable.
2. Review/apply the prepared migration from `supabase/migrations` once. Follow `supabase/README.md`; it has not been validated on a live service yet.
3. Copy `.env.example` to `.env.local`. Add only the project URL and a **publishable key**. The optional client factory intentionally requires the `sb_publishable_` key form.
4. Implement the Phase 6 explicit cloud-save option and passwordless email flow. Set the actual localhost and deployed callback URLs in Supabase Auth. Test email delivery before promising it at the venue.
5. Add the same two public environment values in Vercel for the intended preview/production environments and redeploy. Vite reads them at build time; changing dashboard variables does not update an already-built bundle.
6. Perform the A/B user-isolation checks in `supabase/README.md`, plus local/cloud conflict and network-loss tests. Keep cloud UI disabled until those pass.

Never put a service-role/secret key in the frontend, source files, chat prompts, or `VITE_` variables. RLS protects each authenticated user's rows; being a public browser key does not make a table publicly readable. Source references: [Supabase API keys](https://supabase.com/docs/guides/api/api-keys), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## 4. Save behavior and network loss

Guest play is the default and uses local storage. Cloud sync is optional; it is not needed to start or finish the campaign. A failed upload shows an honest non-blocking status, preserves the local save, and can be retried. Do not say "saved to cloud" before an acknowledged successful write.

When local and cloud progress differ, show their checkpoint/time and ask which to load. Avoid automatic newest-wins across unsynchronized clocks. Cancel leaves local progress untouched. Validate schema/content after every cloud read and handle future versions without silently overwriting them.

## 5. Venue fallback and release record

- Prepare the production build and a local `npm run preview` on the demo laptop before travel. The local server can serve the complete bundled game without an internet connection; this does not promise an offline-capable installed web app or service worker.
- Test startup with internet disconnected, using locally bundled media and no required cloud sign-in.
- Keep a second laptop/browser available and a short gameplay recording as presentation backup, not a replacement for testing.
- Record the release commit, deployed URL, build date, browsers tested, known issues, and rollback commit in `VERIFICATION.md`.

References checked 9 November 2026. Dashboard labels can change; use the linked official documentation when configuring the actual projects.
