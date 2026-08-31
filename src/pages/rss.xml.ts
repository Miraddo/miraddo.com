import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '../lib/site';
import { getNotes } from '../lib/notes';

export async function GET(context: APIContext) {
  const notes = await getNotes();

  return rss({
    title: `${site.name} — Notes`,
    description: 'Linked notes on Go, systems, networks, and the parts of software worth writing down.',
    site: context.site ?? site.url,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.summary,
      pubDate: note.data.date,
      link: `/notes/${note.id}/`,
      categories: note.data.tags,
    })),
    customData: '<language>en</language>',
  });
}
