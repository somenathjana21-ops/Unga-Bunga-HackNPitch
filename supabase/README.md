# Optional cloud saves

The starter does not create a Supabase project, account, or table. Local play is independent of Supabase.
The migrations are prepared, not executed or verified against a live database. Follow Phase 6 and `docs/DEPLOYMENT.md`.

1. Create a development Supabase project and review/apply `migrations/202611090001_campaign_saves.sql` in its SQL editor (once). Keep SQL changes versioned; never patch only the production dashboard.
2. For **Multiplayer Horde Duel**, also apply `migrations/202611210001_horde_duels.sql`. It creates `horde_duels` and `horde_duel_players`, denies direct table access, and exposes only token-gated RPCs (`create_horde_duel`, `join_horde_duel`, `get_horde_duel`, `submit_horde_duel_score`). No Realtime publication is needed: the results screen polls the room every four seconds.
3. Put the project URL and **publishable** key into `.env.local` using `.env.example`. Restart the dev server after changes. Nothing needs a service-role key.
4. Phase 6 adds an explicit optional cloud-save action with passwordless email authentication. Guest players stay local; do not require a login for the demo.
5. Configure the site URL and an exact localhost/deployed callback allowlist for the actual deployment. Avoid a broad wildcard for unrelated preview domains.
6. After authentication, use the authenticated user's ID as `user_id`. Validate `payload` using `isRunState` after every read. This table is for private saves, not trusted leaderboard scores.
7. Local and cloud saves must be compared by an explicit player choice when they conflict. Do not overwrite local progress just because login succeeded.

## Horde duel security notes

- The 6-character code is the room capability. Treat it like an invite link; anyone with the code can read the room's names and scores.
- Each seat is created with a random `client_token` returned only to that seat. Score submission requires the token, is allowed once, and cannot overwrite the other seat.
- Scores are reported by the client, not simulated on a server. This is a friendly duel, not an anti-cheat authority. Do not reuse it for prizes or rankings that need trust.
- Rooms expire after 24 hours. Expired rooms still read back for display but reject new joins.
- Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, the client falls back to a localStorage pass-and-play backend; no network call is made.

## Required two-user verification

Use two separate browser profiles/accounts, A and B, with the public key. A creates a save; A can read/update/delete it. B attempts to select, update, and delete A's ID: zero rows must be returned/changed. B attempts to insert under A's ID: it must fail. Reopen A and verify its payload stayed intact. A signed-out client must not read or write rows. Some blocked selects/updates return an empty result rather than an error; check the stored data. Verify payload over 64 KiB is rejected.

For the duel, with A and B in separate profiles: A creates a room, B joins by code, both submit a run, and the results screen declares the higher score (or the combined team score). Verify B cannot submit twice, cannot submit for A's seat, and that a third join returns `ROOM_FULL`.

## Deferred

No live cloud sync UI, email flow, leaderboard, or online enemy simulation is implemented. Horde multiplayer is the asynchronous shared-code score duel above, not same-arena co-op or real-time PvP. Do not claim cross-device saves are available until authentication and the checks above pass.
