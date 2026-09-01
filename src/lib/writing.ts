// Writing published somewhere other than this site.
//
// These are real, already-public articles. They belong on the site because a
// visitor judging whether this person writes should see them, and they belong
// in the feed because github.com/Miraddo/Miraddo runs an hourly action that
// rebuilds the profile README from https://miraddo.com/feed. If that feed
// carried only locally-hosted notes, the next run would replace three real
// Medium posts with one colophon entry.
//
// Add new external pieces here. Notes written on this site come from the
// content collection and do not need an entry.
//
// TODO(milad): the `summary` lines below were inferred from each article's
// title and Medium tags, NOT from reading the articles. Rewrite them in your
// own words. They render on the home page, on /notes/, and in the feed.

export interface ExternalArticle {
  title: string;
  url: string;
  /** ISO date, used for sorting and for the feed's pubDate. */
  date: string;
  venue: string;
  summary: string;
  tags: string[];
}

export const externalWriting: ExternalArticle[] = [
  {
    title: 'Local AI with Podman AI Lab',
    url: 'https://medium.com/@miraddo/discovering-instructlab-a-journey-into-local-ai-with-podman-ai-lab-ba80fa68316a',
    date: '2024-10-24',
    venue: 'Medium',
    summary: 'Running models locally with Podman AI Lab and InstructLab, without sending anything to a hosted API.',
    tags: ['ai', 'local-ai', 'instructlab'],
  },
  {
    title: 'AI is not ChatGPT',
    url: 'https://medium.com/@miraddo/ai-is-not-chatgpt-67a9a23ccdff',
    date: '2024-05-27',
    venue: 'Medium',
    summary: 'One product became the name of an entire field. What that conflation hides about machine learning.',
    tags: ['ai', 'machine-learning', 'deep-learning'],
  },
  {
    title: 'Rejection will kill motivation',
    url: 'https://medium.com/@miraddo/rejection-will-kill-motivation-fdf68b01561c',
    date: '2024-01-13',
    venue: 'Medium',
    summary: 'On hiring processes, and what repeated rejection does to people trying to get into the field.',
    tags: ['career'],
  },
];

/** Newest first. */
export const externalByDate = [...externalWriting].sort((a, b) => b.date.localeCompare(a.date));
