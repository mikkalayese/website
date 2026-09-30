# mikka — Work-Life Hacking

Static landing page. No build step: open `index.html` or deploy the folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

## Files
- `index.html`: homepage (hero with signup → who it's for → what you get → signup → how I work → experiments → about → work-with-me line → footer signup)
- `work-with-me.html`: services page (last in nav)
- `assets/styles.css`: all styles (colour tokens at the top)
- `assets/main.js`: animations, experiment filters, signup forms

## Before launch
1. **Email list:** set `NEWSLETTER_ENDPOINT` at the top of `assets/main.js` to your provider's form URL (Kit/ConvertKit, Beehiiv, Buttondown, MailerLite). All four forms post an `email` field to it.
2. **Placeholders:** search for `class="ph"` and fill in the highlighted `[...]` text: read times, experiment details, years of experience and so on.
3. **LinkedIn newsletter:** replace the `https://www.linkedin.com/` links.
4. **Work with me:** replace `mailto:hello@example.com` with your email or booking link.
5. **Media:** swap each `.media` placeholder for an `<img>` or `<video autoplay muted loop playsinline>` (see the comments in the HTML).
6. **Subscriber count:** once it's worth showing, uncomment the "Join [X] founders and marketers" line in the hero.

## Design tokens
Accent red `#EE3D4C` and the ice/white backgrounds are the `--accent`, `--bg`, `--bg-tint` and `--surface` variables at the top of `assets/styles.css`. Handwritten accents use Caveat (`--serif` variable, kept for its old name).
