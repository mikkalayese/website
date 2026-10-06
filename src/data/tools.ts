// Free tools & resources shown on /marketing-tools.
// "page" tools open a page on this site; "freebie" tools ask for an email first,
// add it to the Brevo freebies list (ID 6, set in wrangler.jsonc), then open the doc.
export interface Tool {
  id: string;
  title: string;
  description: string;
  action: string;
  kind: 'page' | 'freebie';
  href: string;
  icon: 'quote' | 'prompts' | 'playbook';
}

export const TOOLS: Tool[] = [
  {
    id: 'quote-template',
    title: 'Image quote template',
    description: 'Turn a line you love into a scroll-stopping social post. Type it, pick your colours, download the image.',
    action: 'Open the template',
    kind: 'page',
    href: '/social-media-post-quote',
    icon: 'quote',
  },
  {
    id: 'master-prompts',
    title: 'Master prompts for social media',
    description: 'The AI prompts I use to plan, write and repurpose social posts. Copy, paste, adapt to your brand.',
    action: 'Get the prompts',
    kind: 'freebie',
    href: 'https://docs.google.com/document/d/14czy5WlPrXS9aawVMqJ5e3oEgmVX0YbzIDhtWdIO2f4/edit?usp=sharing',
    icon: 'prompts',
  },
  {
    id: 'marketing-playbook',
    title: 'My marketing playbook',
    description: 'The step-by-step system I use to plan, launch and measure marketing without a big team.',
    action: 'Get the playbook',
    kind: 'freebie',
    href: 'https://docs.google.com/document/d/1woojWm7l2vYdFBjO3pec3bHXVZODhYmnGRhSHgzKsnQ/edit?usp=sharing',
    icon: 'playbook',
  },
];
