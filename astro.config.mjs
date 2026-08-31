// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkWikilink from './src/lib/remark-wikilink.mjs';

// Drafts get pages in `astro dev` but not in `astro build`, so wikilinks must
// resolve differently in each. NODE_ENV is not set by the Astro CLI, so read
// the subcommand off argv instead.
const isDevServer = process.argv.includes('dev');

export default defineConfig({
  site: 'https://miraddo.com',
  output: 'static',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [[remarkWikilink, { includeDrafts: isDevServer }]],
    shikiConfig: {
      // Flight Deck is a light design; keep code blocks in the same family.
      theme: 'github-light',
      wrap: true,
    },
  },
  build: {
    // Caddy's file_server resolves /about -> /about/index.html cleanly.
    format: 'directory',
  },
});
