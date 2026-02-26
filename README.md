# Home Gym Tracker

Personal weekly workout plan with check-offs, exercise swapping, and share-as-copy. Hosted on Railway.

## Stack
- Node.js + Express
- Supabase (Postgres + Auth with magic link)
- Vanilla HTML/CSS/JS (no build step)

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. In SQL Editor, run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_exercise_library.sql`
3. Enable Email auth: Authentication → Providers → Email (magic link)
4. Copy your project URL and keys from Settings → API

## Run Locally

1. Copy `.env.example` to `.env` and add your Supabase credentials
2. Run:
```bash
npm install
npm run dev
```

Open http://localhost:3000

Without Supabase config, the app shows a static plan. With config, sign in via magic link to get your interactive plan.

## Deploy

### First-time setup (GitHub + Railway)

1. **Create a GitHub repo** at [github.com/new](https://github.com/new):
   - Name: `home-gym-tracker`
   - Visibility: Public or Private
   - Do not initialize with README

2. **Push to GitHub** (replace `YOUR_USERNAME` with your GitHub username):
   ```bash
   git remote set-url origin https://github.com/YOUR_USERNAME/home-gym-tracker.git
   git push -u origin main
   ```

3. **Deploy on Railway** at [railway.app](https://railway.app):
   - New Project → Deploy from GitHub repo
   - Select your repo
   - Add environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL` (your Railway URL)

Pushes to `main` auto-deploy via Railway.
