# mikka — Work-Life Hacking

An [Astro](https://astro.build) site with a blog written in [Keystatic](https://keystatic.com) (local mode), served as static files by a Cloudflare Worker. Newsletter signups go to Brevo through the same Worker.

```
src/pages/            index, work-with-me, blog (list + one page per post)
src/layouts/Base.astro   nav + footer shared by every page
src/components/       PostCard, PostSignup
src/content/posts/    your blog posts (written by Keystatic, one file each)
public/assets/        styles.css, main.js, images
public/images/posts/  blog cover and inline images (written by Keystatic)
keystatic.config.ts   the blog's fields (title, summary, pillar, cover, draft, body)
src/worker.js         Cloudflare Worker: /api/subscribe (Brevo) and /api/status
wrangler.jsonc        Worker config (serves ./dist)
```

## One-time setup (on your computer)
1. Install **Node.js 22 LTS** (nodejs.org) and **Git** (or GitHub Desktop).
2. Clone the repo, then in the project folder run: `npm install`

## Write a post
1. Run `npm run dev`
2. Open **http://localhost:4321/keystatic** and click **Blog posts → Create**.
3. Fill in Title, Summary, Published date, Pillar and Cover image, then write the post.
4. New posts start as **Draft**. Drafts show on your computer (with a "Draft" badge) but are hidden on the live site. **Untick Draft** when you want it live.
5. Click **Create** (or **Save** when editing). Preview it at **http://localhost:4321/blog**.

## Publish
Commit and push to `main` (GitHub Desktop: write a summary, **Commit to main**, **Push origin**). Cloudflare rebuilds and the post is live in about a minute, on `/blog`, in the homepage "Latest posts" section (newest 3), and on its own page `/blog/your-post`.

Tips: pull before you start writing; keep images under about 1 MB.

## Commands
| | |
|---|---|
| `npm run dev` | Site + Keystatic editor on localhost:4321 |
| `npm run build` | Build the static site into `dist/` (the editor is not included) |
| `npx wrangler dev` | After a build: run the site exactly as Cloudflare serves it (incl. `/api/*`) |

The signup form shows an error in `npm run dev` because `/api/subscribe` only exists in the Worker; use `npx wrangler dev` to test it.

## Cloudflare
The deploy command stays `npx wrangler deploy`. `wrangler.jsonc` runs `npm run build` itself before every deploy, so no extra build command is needed in the dashboard. If the build complains about the Node version, add the build variable `NODE_VERSION` = `22` (Workers & Pages → **marketing** → Settings → Build).

## Brevo signups
All signup forms post to `/api/subscribe` (`src/worker.js`), which adds the email to the Brevo list **"newsletter sign ups"** (ID 5). Existing contacts are updated and added to the list.

The Brevo API key is a **secret** and must never be committed. In Cloudflare: Workers & Pages → **marketing** → Settings → Variables and secrets → add a **Secret** named exactly `BREVO_API_KEY`. `/api/status` shows whether the key and list are working (it never shows the key).

## Design tokens
Accent red `#EE3D4C`, ice/white backgrounds and fonts are the CSS variables at the top of `public/assets/styles.css`. Handwritten accents use Caveat (the `--serif` variable keeps its old name).
