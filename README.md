# Claim What's Yours

A web app where a family describes their situation in Telugu, Hindi or English and gets back the government schemes they are likely eligible for (with the exact rule behind each match), the order in which to collect documents, and a one-page claim sheet to take to a Common Service Centre (CSC). The core engine lives in `src/lib/engine/` and evaluates scheme rules, plans document collection, runs basic name and certificate preflight checks, and scrubs sensitive numbers from free text.

## Data disclaimer

Scheme data in `data/` is unverified. Every rule, URL and `last_verified` date must be checked against official sources before anyone relies on this app. Confirm with the official office before you apply.

## Architecture

**Pages** (Next.js 16 App Router, React 19, Tailwind 4):

- `/` : language toggle, voice or typed description of the family, then a link to the questions.
- `/ask` : up to six short questions, one at a time.
- `/results` : likely and possible schemes, each with the rule-by-rule reason and the official page link.
- `/plan` : documents to collect in order, with fee and time estimates, "I already have this" checkboxes, print and copy-summary buttons.
- `/review` : admin review queue for source-change alerts.

**API routes** (`src/app/api/`):

- `GET /api/schemes` : schemes and documents from Supabase, with the `data/` JSON as fallback.
- `POST /api/extract` : turns free text into a profile. Uses the zero-key rule extractor by default, and Gemini only when `GEMINI_API_KEY` is set.
- `GET /api/cron/check-sources` : checks each scheme's `source_url` for changes and queues alerts.
- `/api/review` : reads and updates the review queue.

**Engine** (`src/lib/engine/`): rule evaluation, document graph planning, the name and certificate preflight checks, the number scrubber, and the rule extractor. It is pure TypeScript and is covered by Vitest tests.

**Data**: the JSON files in `data/` are the source of truth. `npm run seed` writes them to Supabase.

**Offline**: `public/sw.js` is a service worker. It caches the four main pages and the schemes response, so a family that already loaded the app can still see its results without a connection. The app manifest is at `public/manifest.json`.

## Local setup

```bash
npm install
```

Create a `.env.local` file in the project root with these variable **names** (set your own values; never commit them):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional: `GEMINI_API_KEY`, `CRON_SECRET`, `ADMIN_TOKEN`

Commands:

```bash
npm run dev     # start the dev server
npm test        # run the engine tests (Vitest)
npm run seed    # write data/ to Supabase
npm run build   # production build
```

## Supabase setup

1. Open the SQL Editor in your Supabase project.
2. Run `supabase/migrations/0001_init_schema.sql`, then run `supabase/migrations/0002_source_monitoring.sql`.
3. Run `NOTIFY pgrst, 'reload schema';` so the API picks up the new tables.
4. Run `npm run seed` once to load the data.

## Vercel deploy

1. Import this repository in Vercel.
2. In Project Settings, add the environment variables listed above for both **Production** and **Preview**.
3. Build command: `npm run build`.
4. Deploy.

The cron route `GET /api/cron/check-sources` can be called by a scheduler. Send the header `Authorization: Bearer <CRON_SECRET>` with the value of your `CRON_SECRET`.

## Limitations

- No monitoring for a scheme without a `source_url`.
- Voice input needs Chrome or Edge on Android. Other browsers show the typed form instead.
- The rule extractor is deliberately simple. It handles common phrasing only.
- Scheme rules, URLs and dates are placeholders until they are checked against official sources.
