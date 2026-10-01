export const site = {
  name: 'Lemniro',
  description: 'Open mathematics notes, careful proofs, and visual lectures.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://ddomology.github.io/Lemniro').replace(/\/$/, ''),
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  repository: 'https://github.com/ddomology/Lemniro',
  author: 'ddomology',
  youtube: '',
};
export const asset = (path: string) => `${site.basePath}/${path.replace(/^\//, '')}`;
export const absolute = (path = '/') => `${site.url}/${path.replace(/^\//, '')}`;
