import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

const ghRepo = process.env.GITHUB_REPOSITORY;
const [ghOwner, ghName] = ghRepo ? ghRepo.split('/') : [];

const site = process.env.SITE_URL ?? (ghOwner ? `https://${ghOwner}.github.io` : undefined);
const base = process.env.SITE_BASE ?? (ghName ? `/${ghName}` : undefined);

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',

  // The "family" taxonomy was renamed to "root" (see feat-roots-rename).
  // Preserve the old public URLs so existing links/bookmarks don't 404.
  // Astro applies `base` to the redirect *source* but not the destination,
  // so prefix targets manually (`base` is '' locally, '/home-bartender' in CI).
  redirects: Object.fromEntries(
    [
      ['/families/', '/roots/'],
      ['/by-family/old-fashioned/', '/by-root/old-fashioned/'],
      ['/by-family/martini/', '/by-root/martini/'],
      ['/by-family/daiquiri/', '/by-root/daiquiri/'],
      ['/by-family/sidecar/', '/by-root/sidecar/'],
      ['/by-family/whiskey-highball/', '/by-root/whiskey-highball/'],
    ].map(([from, to]) => [from, `${base ?? ''}${to}`]),
  ),

  vite: {
    plugins: [tailwindcss()],
  },
});