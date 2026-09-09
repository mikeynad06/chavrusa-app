# ChavrusaApp — Things You Need to Do Yourself

1. **Add a `.gitignore`** — there isn't one in the repo at all. `.env` and `node_modules` happen to be untracked right now, but that's luck, not protection. Add one before your next commit (at minimum: `.env`, `node_modules/`, `dist/`, `build/`).

2. **Push local commits to GitHub** — you're 6 commits ahead of `origin/main` on `mikeynad06/chavrusa-app`. Nothing has been pushed since the initial commit. Decide when you want that history public/backed up and run the push.

3. **Rotate/generate a real `JWT_SECRET` for production** — the one in `backend/.env` is presumably a dev value. Generate a strong secret before any real deployment and store it securely (not in git).

4. **Provision a real PostgreSQL database** for staging/production — `DATABASE_URL` currently points wherever your local dev DB is. You'll need to stand up an actual Postgres instance (Railway, Supabase, RDS, etc.) and run Prisma migrations against it.

5. **Pick and wire up a real email provider** — `notifications.service.ts` currently just `console.log`s notifications instead of sending real emails (request-claimed and topic/location match alerts). You'll need to choose a provider (SendGrid, Resend, Postmark, etc.), create an account, get API keys, and add them to env config.

6. **Decide on a hosting/deployment target** for both backend (NestJS) and frontend (Vite/React) — e.g. Railway/Render/Fly for the API, Vercel/Netlify for the frontend. No deployment config exists yet.

7. **Buy/point a domain** (if you want one) once hosting is decided.

8. **Fix the `UserLocation.location` schema bug at the data level** — it's a raw `String` instead of the `Location` enum, so a value like `"Tel Aviv"` won't match `"TEL_AVIV"` in notification queries. If any real user data already has inconsistent values, you'll need to review/clean it before a migration can safely convert the column type.

9. **Decide on legal basics** if this becomes real: privacy policy / terms of use (you're collecting user emails, locations, learning preferences), given the About/Haskamas pages suggest this is meant for a real community.
