# SnapBite

A calorie/meal tracking app: daily calorie ring + macros, water tracker,
meal history, and adjustable goals with presets.

## What changed from the Claude artifact version

The artifact preview used Claude's built-in `window.storage` API. That
only exists inside Claude's chat UI, so for a real deployment this
project swaps it for a small `localStorage` wrapper
(`src/lib/storage.js`) with the exact same shape. Data now lives in
each visitor's browser. If you want data to sync across devices, swap
that file for calls to your own backend later — nothing else in the
app needs to change.

Meal logging is manual entry (name/calories/macros). Automatic
photo-based calorie estimation needs a backend + an AI vision model —
not something a static frontend can do on its own. Ask me if you want
to add that next (it usually means a small serverless function that
calls a vision API).

## Run it locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Deploy for free (Vercel)

1. Push this folder to a GitHub repo (create one on github.com, then):
   ```bash
   git init
   git add .
   git commit -m "SnapBite"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to https://vercel.com, sign in with GitHub.
3. Click **Add New → Project**, select your repo.
4. Vercel auto-detects Vite — leave the defaults (`npm run build`,
   output dir `dist`) and click **Deploy**.
5. You'll get a public URL like `snapbite.vercel.app` within a minute.

Netlify works the same way if you'd rather use that instead.

## Adding paid subscriptions for your customers (Stripe)

Since you're already set up with Stripe, the usual pattern is:

- Add a "Subscribe" button that calls a small serverless function
  (Vercel supports these natively in an `/api` folder) which creates a
  Stripe Checkout session.
- Stripe redirects back to your app on success.
- A webhook (another small function) marks that user as subscribed in
  your database.

This needs a bit of backend, even if serverless — happy to build that
out with you once the app itself is deployed and you're ready for it.
