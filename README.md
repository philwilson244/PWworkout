# Home Gym Tracker

Personal weekly workout plan — hosted on Railway.

## Stack
- Node.js + Express
- Vanilla HTML/CSS/JS (no build step)

## Run Locally
```bash
npm install
npm run dev
```

Open http://localhost:3000

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
   - Select `home-gym-tracker`
   - Railway auto-detects Node.js and deploys

Pushes to `main` auto-deploy via Railway.
