# Optional cloud saves

The starter does not create a Supabase project, account, or table. Local play is independent of Supabase.
The migration is prepared, not executed or verified against a live database. Follow Phase 6 and `docs/DEPLOYMENT.md`.

1. Create a development Supabase project and review/apply `migrations/202611090001_campaign_saves.sql` in its SQL editor (once). Keep SQL changes versioned; never patch only the production dashboard.
2. Put the project URL and **publishable** key into `.env.local` using `.env.example`. Restart the dev server after changes. Nothing needs a service-role key.
3. Phase 6 adds an explicit optional cloud-save action with passwordless email authentication. Guest players stay local; do not require a login for the demo.
4. Configure the site URL and an exact localhost/deployed callback allowlist for the actual deployment. Avoid a broad wildcard for unrelated preview domains.
5. After authentication, use the authenticated user's ID as `user_id`. Validate `payload` using `isRunState` after every read. This table is for private saves, not trusted leaderboard scores.
6. Local and cloud saves must be compared by an explicit player choice when they conflict. Do not overwrite local progress just because login succeeded.

## Required two-user verification

Use two separate browser profiles/accounts, A and B, with the public key. A creates a save; A can read/update/delete it. B attempts to select, update, and delete A's ID: zero rows must be returned/changed. B attempts to insert under A's ID: it must fail. Reopen A and verify its payload stayed intact. A signed-out client must not read or write rows. Some blocked selects/updates return an empty result rather than an error; check the stored data. Verify payload over 64 KiB is rejected.

## Deferred

No live cloud sync UI, email flow, leaderboard, multiplayer, or online enemy simulation is implemented. Do not claim cross-device saves are available until authentication and the checks above pass.
