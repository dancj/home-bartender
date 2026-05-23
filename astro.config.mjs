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

  vite: {
    plugins: [tailwindcss()],
  },
});