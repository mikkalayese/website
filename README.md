# mikka — Work-Life Hacking

Static landing page. No build step: open `index.html` or deploy the folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

## Files
- `index.html`: homepage (hero with signup → who it's for → what you get → signup → how I work → experiments → about → work-with-me line → footer signup)
- `work-with-me.html`: services page (last in nav)
- `assets/styles.css`: all styles (colour tokens at the top)
- `assets/main.js`: animations, experiment filters, signup forms

## Before launch
1. **Email list (Brevo):** see "Brevo signups" below.
2. **Placeholders:** search for `class="ph"` and fill in the highlighted `[...]` text: read times, experiment details, years of experience and so on.
3. **LinkedIn newsletter:** replace the `https://www.linkedin.com/` links.
4. **Work with me:** replace `mailto:hello@example.com` with your email or booking link.
5. **Media:** swap each `.media` placeholder for an `<img>` or `<video autoplay muted loop playsinline>` (see the comments in the HTML).
6. **Subscriber count:** once it's worth showing, uncomment the "Join [X] founders and marketers" line in the hero.

## Design tokens
Accent red `#EE3D4C` and the ice/white backgrounds are the `--accent`, `--bg`, `--bg-tint` and `--surface` variables at the top of `assets/styles.css`. Handwritten accents use Caveat (`--serif` variable, kept for its old name).

## Hero video & photo
The hero video is the YouTube embed in `.hero__media` (swap the video ID in the iframe `src`). Mikka's photo is `assets/mikka.webp` (transparent cut-out) on a `#FFF352` card in the About section.

## Brevo signups
All signup forms post to `/api/subscribe`, handled by the Cloudflare Worker in `src/worker.js`. It adds the email to the Brevo list named **"su primera lista"** (existing contacts are updated and added to the list). The list is found by name, or set `BREVO_LIST_ID` to pin it.

The Brevo API key is a **secret** and must never be committed or put in front-end code. To set it up:
1. Brevo: *SMTP & API > API keys > Generate a new API key* (the raw `xkeysib-...` value, or the base64 form from the MCP page; both work).
2. Cloudflare: *Workers & Pages > website > Settings > Variables and secrets > Add* a **Secret** named `BREVO_API_KEY`. Or run `npx wrangler secret put BREVO_API_KEY`.
3. Deploy (`npx wrangler deploy`, or push if Workers Builds is connected). The worker name in `wrangler.jsonc` is `website`; change it if your Worker is named differently.
