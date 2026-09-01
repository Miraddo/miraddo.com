// Single source of truth for identity, links, and the facts rendered as
// instrument readouts across the site. Edit here, not in the templates.

export const site = {
  name: 'Milad Poshtdari',
  handle: 'miraddo',
  url: 'https://miraddo.com',
  title: 'Milad Poshtdari',
  role: 'Senior IT Consultant',
  company: 'Lufthansa Industry Solutions',
  location: 'Hamburg, Germany',
  locationShort: 'HAMBURG · DE',
  email: 'hello@miraddo.com',
  tagline:
    'I build and improve services: large-scale web applications and enterprise systems. Go by choice, C when it matters, Kubernetes because that is where it all ends up.',
  shortTagline: 'Go and systems engineer in Hamburg.',
  /** One line, in your voice. Change it here and it changes everywhere. */
  motto: 'Understand the layer below the one you are working in.',
  description:
    'Milad Poshtdari (miraddo). Go and systems engineer in Hamburg. Senior IT consultant at Lufthansa Industry Solutions. Open source, writing, and teaching.',
  status: 'Available for conversation',
  /** Single source of truth for the repo count. Referenced, never retyped. */
  publicRepos: 45,
} as const;

export const links = [
  { label: 'GitHub', short: 'GITHUB', href: 'https://github.com/miraddo', handle: '@miraddo' },
  { label: 'LinkedIn', short: 'LINKEDIN', href: 'https://linkedin.com/in/miraddo', handle: 'in/miraddo' },
  { label: 'Medium', short: 'MEDIUM', href: 'https://medium.com/@miraddo', handle: '@miraddo' },
  { label: 'Email', short: 'EMAIL', href: 'mailto:hello@miraddo.com', handle: 'hello@miraddo.com' },
] as const;

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about/' },
  { label: 'Now', href: '/now/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'Writing', href: '/notes/' },
  { label: 'Uses', href: '/uses/' },
  { label: 'Contact', href: '/contact/' },
] as const;

// The three NOW readouts on the homepage. Keep these current. A stale
// "now" page is worse than none.
export const now = {
  updated: '2026-08-31',
  focus: 'Distributed systems and service architecture at scale.',
  learning: 'Computer science at Universität zu Lübeck. Since 2024.',
  building: 'goRAG, a RAG backend in Go. Design stage; nothing committed yet.',
  next: 'Compilers and runtime internals.',
  reading: 'Data-oriented design, network internals, compiler construction.',
} as const;

export const stack = [
  {
    label: 'Languages',
    items: [
      { name: 'Go', primary: true },
      { name: 'C' },
      { name: 'Python' },
      { name: 'SQL' },
      { name: 'Bash' },
      { name: 'JavaScript' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { name: 'Kubernetes' },
      { name: 'Docker' },
      { name: 'Terraform' },
      { name: 'AWS' },
      { name: 'Linux' },
      { name: 'Caddy' },
    ],
  },
  {
    label: 'Data & Protocol',
    items: [
      { name: 'PostgreSQL' },
      { name: 'DynamoDB' },
      { name: 'pgvector' },
      { name: 'gRPC' },
      { name: 'protobuf' },
    ],
  },
  {
    label: 'Practice',
    items: [
      { name: 'Systems design' },
      { name: 'Data-oriented design' },
      { name: 'Observability' },
      { name: 'Secure coding' },
    ],
  },
] as const;

export const certifications = [
  { name: 'Ultimate Go', issuer: 'Ardan Labs' },
  { name: 'Ultimate Docker', issuer: 'Ardan Labs' },
  { name: 'Intensive Kubernetes', issuer: 'Ardan Labs' },
  { name: 'Managing AWS Resources with Terraform', issuer: '' },
  { name: 'Writing Secure Go Code', issuer: '' },
  { name: 'Penetration Testing', issuer: '' },
] as const;

export const languages = [
  { name: 'Persian', native: 'فارسی', level: 'Native', code: 'fa', rtl: true },
  { name: 'Kurdish', native: 'Kurdî', level: 'Native', code: 'ku', rtl: false },
  { name: 'English', native: 'English', level: 'Fluent', code: 'en', rtl: false },
  { name: 'German', native: 'Deutsch', level: 'Basic', code: 'de', rtl: false },
] as const;

export const timeline = [
  {
    year: 'Since 2024',
    title: 'Universität zu Lübeck',
    detail: 'Back to first principles: computer science, alongside the day job.',
  },
  {
    year: 'Now',
    title: 'Senior IT Consultant · Lufthansa Industry Solutions',
    detail: 'Hamburg. Large-scale web applications and enterprise systems.',
  },
  {
    year: 'Earlier',
    title: 'Backend developer · Tehran',
    detail: 'Services, databases, and the habit of reading the standard library.',
  },
  {
    year: '2015',
    title: 'First public commit',
    detail: `github.com/miraddo opens. ${site.publicRepos} public repositories since.`,
  },
] as const;

export const teaching = {
  headline: 'Teaching & Community',
  body: [
    'Volunteer Python teacher at ReDI School of Digital Integration, helping newcomers to Germany write their first line of code.',
    'Contributor to the Persian-language Go community: free books, translations, and documentation, so that learning Go does not require learning English first.',
  ],
} as const;
