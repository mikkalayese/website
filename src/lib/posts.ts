import { createReader } from '@keystatic/core/reader';
import Markdoc from '@markdoc/markdoc';
import keystaticConfig from '../../keystatic.config';

const reader = createReader(process.cwd(), keystaticConfig);

export const PILLARS = {
  work: 'Work Hacking',
  skill: 'Skill Hacking',
  leverage: 'Leverage Hacking',
  life: 'Life Hacking',
} as const;
export type Pillar = keyof typeof PILLARS;

export interface Post {
  slug: string;
  title: string;
  summary: string;
  date: string; // YYYY-MM-DD or ''
  dateLabel: string;
  pillar: Pillar;
  pillarLabel: string;
  coverImage: string | null;
  draft: boolean;
  minutes: number;
}

// Drafts are visible while you work (`npm run dev`) and hidden on the live site.
const SHOW_DRAFTS = import.meta.env.DEV;

function readingMinutes(node: any): number {
  let words = 0;
  for (const n of node.walk()) {
    if (n.type === 'text') words += String(n.attributes.content || '').trim().split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, Math.round(words / 200));
}

function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

function toPost(slug: string, entry: any, node: any): Post {
  const pillar = (entry.pillar in PILLARS ? entry.pillar : 'work') as Pillar;
  return {
    slug,
    title: entry.title,
    summary: entry.summary || '',
    date: entry.publishedDate || '',
    dateLabel: formatDate(entry.publishedDate),
    pillar,
    pillarLabel: PILLARS[pillar],
    coverImage: entry.coverImage || null,
    draft: !!entry.draft,
    minutes: readingMinutes(node),
  };
}

/** All visible posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const all = await reader.collections.posts.all();
  const posts = await Promise.all(
    all
      .filter(({ entry }) => SHOW_DRAFTS || !entry.draft)
      .map(async ({ slug, entry }) => toPost(slug, entry, (await entry.content()).node)),
  );
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

/** One post with its body rendered to HTML. */
export async function getPost(slug: string): Promise<(Post & { html: string }) | null> {
  const entry = await reader.collections.posts.read(slug);
  if (!entry || (entry.draft && !SHOW_DRAFTS)) return null;
  const { node } = await entry.content();
  const html = Markdoc.renderers.html(Markdoc.transform(node));
  return { ...toPost(slug, entry, node), html };
}
