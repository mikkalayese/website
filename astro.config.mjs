import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// The Keystatic editor only runs on your own computer (`npm run dev`).
// It is left out of the production build, so the live site is plain static files
// served by the Cloudflare Worker, exactly like before.
const isDev = process.argv.includes('dev');

// Dev only: when you create or delete a post in Keystatic, refresh the list of post
// pages so the new post opens straight away (no server restart needed).
const refreshPostPages = () => ({
  name: 'refresh-post-pages',
  hooks: {
    'astro:server:setup': ({ server }) => {
      const postsDir = 'src/content/posts';
      const pageFile = 'src/pages/blog/[slug].astro';
      server.watcher.add(postsDir);
      const touch = (file) => {
        if (!file.replaceAll('\\', '/').includes(postsDir)) return;
        const now = new Date();
        fs.utimesSync(pageFile, now, now);
      };
      server.watcher.on('add', touch);
      server.watcher.on('unlink', touch);
    },
  },
});

export default defineConfig({
  integrations: isDev ? [react(), keystatic(), refreshPostPages()] : [],
  // Keep the existing URLs: /work-with-me.html still works on Cloudflare.
  build: { format: 'file' },
});
