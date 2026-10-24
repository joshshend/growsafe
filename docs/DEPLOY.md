# Deploy GrowSafe

GrowSafe is a static site (plus one small serverless function in `api/`). Vercel's free plan is enough.

## 1. Put the code on GitHub

1. On github.com, click New repository. Name it `growsafe`, set it to Public, and do not add a README, license or .gitignore (the repo already has them). Click Create.
2. In Terminal, in the CAC folder:

```sh
git status                      # should be clean; commit anything pending first
git remote add origin https://github.com/<your-username>/growsafe.git
git push -u origin main
```

If your branch is not called `main`, check with `git branch --show-current` and use that name. 3. Open the repo page logged out (private window) to confirm it is public and shows the README.

## 2. Deploy on Vercel

1. Go to vercel.com and sign in with GitHub.
2. Add New, then Project. Import the `growsafe` repo.
3. Framework Preset: Vite. Build command `npm run build`, output directory `dist` (these are also set in `vercel.json`). Click Deploy.
4. When it finishes, copy the URL (for example `https://growsafe-xxxx.vercel.app`).

## 3. Set the public URL and redeploy

1. In the Vercel project, Settings, Environment Variables. Add `VITE_PUBLIC_URL` with the Vercel URL as the value, for all environments.
2. Deployments, open the latest one, menu, Redeploy. Wait for it to finish.

This variable only matters for links made inside a native build, but set it so links are correct everywhere.

## 4. Install on iPhone

1. Open the Vercel URL in Safari (not Chrome) on the iPhone.
2. Tap Share, then Add to Home Screen, then Add.
3. Open GrowSafe from the Home Screen icon. It should open full screen with no Safari bar.

## 5. Check offline

1. Open the app from the Home Screen once while online and let it finish loading. Browse the plan, a task, and Help so they are cached.
2. Turn on Airplane Mode.
3. Close the app fully (swipe up) and open it again from the Home Screen. The plan, task sheets and Help should still load.
4. Expected to need a connection: the recall check, and opening links from other people if they point to a page you have not loaded.
5. Turn Airplane Mode off.

If a new version does not appear after a deploy, close and reopen the app twice; the service worker updates in the background.

## 6. Turn on photo scan (optional)

Photo scan needs one API key on the server. Without a key the photo option does not appear and nothing else changes.

1. Get a key: Google AI Studio (Gemini) or the Anthropic Console (Claude).
2. In the Vercel project, Settings, Environment Variables, add `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` (not both; Gemini wins if both are set) for Production and Preview. Never prefix it with `VITE_`.
3. Optional: `GEMINI_MODEL` (default `gemini-3.8-flash`), `ANTHROPIC_MODEL` (default `claude-haiku-5-5`; `claude-sonnet-5-5` is stronger), `DAILY_CAP` (default 300 scans a day across all users).
4. Redeploy (Deployments, latest, Redeploy). Keys are read when the function starts.
5. To test locally, copy `.env.example` to `.env.local`, fill in one key, and run `npm run dev`. `/api/detect` is served by a dev middleware using the same handler. `.env.local` is git-ignored.

Check the model name on https://ai.google.dev/models before the demo; if it has been retired, set `GEMINI_MODEL`.
