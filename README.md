# 🚀 Build My Startup

An AI-powered web application that transforms a startup idea into a structured startup blueprint.

Users enter a simple business idea, and the application uses Google's Gemini API to generate a detailed analysis covering the problem, target audience, solution, features, competitors, business model, MVP, roadmap, technology stack, and more.

🌐 **Live Demo:** https://build-my-startup.vercel.app

---

## ✨ Features

- 💡 Startup idea analysis
- 🎯 Target audience identification
- 🔍 Problem and solution analysis
- ⚡ AI-generated startup features
- 🏆 Competitor analysis
- 💰 Business model and pricing suggestions
- 📈 Market opportunity analysis
- 🚀 Go-to-market strategy
- 🧪 MVP planning
- 🗺️ Product roadmap
- 💻 Recommended technology stack
- 📊 Startup scoring
- ✅ AI-generated validation verdict

---

## 🧠 How It Works

```text
User enters startup idea
        ↓
Frontend sends request
        ↓
Vercel Serverless API
        ↓
Gemini API
        ↓
AI-generated JSON response
        ↓
JSON extraction & normalization
        ↓
Blueprint validation
        ↓
Structured startup blueprint
        ↓
Displayed on the website# 🚀 Build My Startup — V2

Describe a startup idea in plain English, click **Build My Startup**, and get back a
complete, AI-generated startup blueprint: problem, solution, features, competitors,
business model, market opportunity, go-to-market plan, MVP scope, roadmap, tech stack,
a startup score, and a final "should you build this?" verdict.

Every result is generated live by Claude for whatever idea you type — nothing is
hardcoded or pre-written.

---

## 1. What this project does

1. You type an idea into the input box and click **Build My Startup**.
2. The browser sends that idea to a small backend function (`/api/generate`).
3. The backend function calls the Claude API with a detailed prompt asking it to
   act like a startup strategist and return **structured JSON**.
4. The backend sends that JSON back to the browser.
5. The browser (`script.js`) turns the JSON into the nicely styled blueprint you see
   on the page — cards, progress bars, pricing tiers, roadmap, all of it.

The important part: **your Claude API key lives only on the backend.** The browser
never sees it, so it can never leak into GitHub, browser dev tools, or a public site.

---

## 2. How the architecture works

```
 Browser (index.html + style.css + script.js)
        │
        │  fetch POST /api/generate  { idea: "..." }
        ▼
 Serverless function (api/generate.js) — runs on Vercel, not in the browser
        │
        │  reads ANTHROPIC_API_KEY from environment variables
        ▼
 Claude API (Anthropic)
        │
        │  returns structured JSON blueprint
        ▼
 Serverless function returns that JSON to the browser
        │
        ▼
 script.js renders the blueprint on the page
```

The frontend is plain HTML/CSS/JavaScript — no build step, no framework — so it can
be hosted anywhere that serves static files, including **GitHub Pages**. The backend
is one small Node.js file that Vercel runs as a serverless function.

---

## 3. Project structure

```
build-my-startup/
│
├── index.html          The page structure (input form + empty result containers)
├── style.css            All styling
├── script.js             Validation, fetch call, staged loading animation,
│                        and code that turns the AI's JSON into HTML
│
├── api/
│   └── generate.js      The serverless backend function that calls Claude
│
├── package.json         Backend dependency (@anthropic-ai/sdk) + scripts
├── .env.example          Template showing which environment variable to set
├── .gitignore            Keeps node_modules/ and your real .env out of git
└── README.md              This file
```

---

## 4. Install dependencies

You need [Node.js](https://nodejs.org) 18 or newer, and the
[Vercel CLI](https://vercel.com/docs/cli) for local development.

```bash
cd build-my-startup
npm install          # installs @anthropic-ai/sdk
npm install -g vercel  # if you don't already have the Vercel CLI
```

---

## 5. Create an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign in (or
   create an account).
2. Open **API Keys** in the left sidebar.
3. Click **Create Key**, name it something like `build-my-startup`, and copy the
   key — it starts with `sk-ant-...`. You won't be able to see it again, so store
   it somewhere safe for now.
4. Anthropic API usage is billed separately from a Claude.ai subscription; check
   the **Billing** section of the console to add a payment method if you haven't
   used the API before.

---

## 6. Configure environment variables

Copy the example file and fill in your real key:

```bash
cp .env.example .env
```

Open `.env` and set:

```
ANTHROPIC_API_KEY=sk-ant-your-real-key-here
```

`.env` is already listed in `.gitignore`, so it will never be committed to GitHub.
**Never** paste your real key into `index.html`, `script.js`, or any file that gets
pushed to a public repo.

---

## 7. Run it locally

The Vercel CLI can run both the static frontend and the serverless function
together, with your `.env` file loaded automatically:

```bash
vercel dev
```

It will print a local URL (usually `http://localhost:3000`). Open that in your
browser, type an idea, and click **Build My Startup** — you should see the real
Claude-generated blueprint appear.

If you don't want to install the Vercel CLI, you can still open `index.html`
directly in a browser to look at the design, but the **Build My Startup** button
won't work until a backend is running somewhere (locally via `vercel dev`, or
deployed as described below), because there's no server to answer
`/api/generate`.

---

## 8. Deploy the backend to Vercel

1. Push this project to a GitHub repository (see step 10 for what to keep out of it).
2. Go to [vercel.com](https://vercel.com), sign in, and click **Add New → Project**.
3. Import your GitHub repository.
4. In the project's **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your real key
   - (optional) `ALLOWED_ORIGIN` = your GitHub Pages URL, e.g.
     `https://yourusername.github.io`, to restrict who can call your API
5. Click **Deploy**.

Vercel will give you a URL like `https://build-my-startup.vercel.app`. Visit it —
if you deploy the whole project (frontend + `api/`) to Vercel, the site works
immediately with no extra configuration, since `script.js` calls `/api/generate`
as a relative path by default.

---

## 9. Deploy the frontend to GitHub Pages (optional split setup)

If you'd rather host the frontend on GitHub Pages and only the backend on Vercel:

1. Push the project to GitHub.
2. In your repo, go to **Settings → Pages**, and set the source to your main branch
   (root folder, since `index.html` is already at the top level).
3. GitHub will give you a URL like `https://yourusername.github.io/build-my-startup/`.
4. Open `index.html` and find this line near the bottom:

   ```html
   <script>window.BUILD_MY_STARTUP_API_BASE = '';</script>
   ```

   Change it to point at your Vercel deployment:

   ```html
   <script>window.BUILD_MY_STARTUP_API_BASE = 'https://build-my-startup.vercel.app';</script>
   ```

5. Commit and push. Your GitHub Pages site will now call your Vercel backend
   across origins.
6. Make sure `ALLOWED_ORIGIN` in your Vercel environment variables matches your
   GitHub Pages origin exactly (e.g. `https://yourusername.github.io`), so the
   backend's CORS headers allow the request.

---

## 10. Security considerations

- **Never** commit `.env` or paste your real API key into any HTML/CSS/JS file.
  `.gitignore` already excludes `.env`, `.vercel/`, and `node_modules/`.
- The API key is only ever read via `process.env.ANTHROPIC_API_KEY` inside
  `api/generate.js`, which runs on Vercel's servers, not in the browser.
- `api/generate.js` never echoes raw server errors, stack traces, or environment
  details back to the browser — it always returns a short, generic error message
  and logs the real error server-side (visible in your Vercel function logs).
- Consider setting `ALLOWED_ORIGIN` to your exact frontend origin once deployed,
  instead of leaving it as `*`, so random sites can't call your backend and spend
  your API credits.
- The idea input is length-limited (both in the browser and on the server) to
  keep requests reasonably sized.
- If you plan to make this public, consider adding basic rate limiting (e.g. via
  Vercel's Edge Config, Upstash Redis, or a simple in-memory counter) so one
  visitor can't run up a large API bill.

---

## 11. Troubleshooting

**"The server is not configured correctly" error** — `ANTHROPIC_API_KEY` isn't set
in your environment. Check your `.env` file locally, or your Vercel project's
environment variables in production (and redeploy after adding it).

**Button does nothing / network error in split setup** — check that
`BUILD_MY_STARTUP_API_BASE` in `index.html` points at your real Vercel URL, and
that `ALLOWED_ORIGIN` on the backend matches your GitHub Pages origin.

**"The AI response could not be understood"** — this means Claude's reply didn't
parse as the expected JSON. It's rare, but if you see it often, check your Vercel
function logs for the raw response and consider lowering `MAX_TOKENS` competition
or simplifying the prompt.

---

Have fun — and remember the AI-generated "Startup Score" and verdict are exactly
that: an AI's opinion, not investment advice.
