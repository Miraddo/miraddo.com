import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '../lib/site';
import { getNotes } from '../lib/notes';
import { externalWriting } from '../lib/writing';

/**
 * All of the writing, not only what is hosted here.
 *
 * github.com/Miraddo/Miraddo rebuilds the profile README hourly from
 * https://miraddo.com/feed (aliased to this route). A feed containing only
 * local notes would silently replace the Medium articles listed there, so
 * external pieces are merged in and the two stay consistent.
 */
export async function GET(context: APIContext) {
  const notes = await getNotes();
  const base = context.site ?? site.url;

  const items = [
    ...notes.map((note) => ({
      title: note.data.title,
      description: note.data.summary,
      pubDate: note.data.date,
      link: new URL(`/notes/${note.id}/`, base).href,
      categories: note.data.tags,
    })),
    ...externalWriting.map((article) => ({
      title: article.title,
      // The venue is stated so a reader of the feed knows the link leaves here.
      description: `${article.summary} (Published on ${article.venue}.)`,
      pubDate: new Date(article.date),
      link: article.url,
      categories: article.tags,
    })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: `${site.name} — Writing`,
    description:
      'Notes and articles on Go, systems, networks, and the parts of software worth writing down.',
    site: base,
    items,
    customData: '<language>en</language>',
  });
}
