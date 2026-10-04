import { config, collection, fields } from '@keystatic/core';

// Local mode: the editor reads and writes files in this repo on your computer.
// Run `npm run dev`, then open http://localhost:4321/keystatic
export default config({
  storage: { kind: 'local' },
  ui: { brand: { name: 'Mikka — Blog' } },
  collections: {
    posts: collection({
      label: 'Blog posts',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        summary: fields.text({
          label: 'Summary',
          description: 'One or two sentences. Shown on cards and in search results.',
          multiline: true,
        }),
        publishedDate: fields.date({ label: 'Published date' }),
        pillar: fields.select({
          label: 'Pillar',
          defaultValue: 'work',
          options: [
            { label: 'Work Hacking', value: 'work' },
            { label: 'Skill Hacking', value: 'skill' },
            { label: 'Leverage Hacking', value: 'leverage' },
            { label: 'Life Hacking', value: 'life' },
          ],
        }),
        coverImage: fields.image({
          label: 'Cover image',
          description: 'Landscape works best (about 1600×1000). Keep it under 1 MB.',
          directory: 'public/images/posts',
          publicPath: '/images/posts/',
        }),
        draft: fields.checkbox({
          label: 'Draft',
          description: 'Draft posts show on your computer but are hidden on the live site.',
          defaultValue: true,
        }),
        content: fields.markdoc({
          label: 'Post',
          options: { image: { directory: 'public/images/posts', publicPath: '/images/posts/' } },
        }),
      },
    }),
  },
});
