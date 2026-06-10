import { resolveIconKey } from './icons';

// ?no-inline forces Vite to emit a hashed asset file even for SVGs under
// assetsInlineLimit (most of the set) — masked spans reference one cached
// URL per icon instead of baking a data: URI into every occurrence.
const modules = import.meta.glob<string>('../assets/icons/**/*.svg', {
  query: '?url&no-inline',
  import: 'default',
  eager: true,
});

const ICON_URLS = new Map<string, string>(
  Object.entries(modules).map(([path, url]) => [
    path.replace(/^.*\/icons\//, '').replace(/\.svg$/, ''),
    url,
  ]),
);

const AVAILABLE = new Set(ICON_URLS.keys());

/** Resolve a taxonomy field + slug to an emitted asset URL, or null. */
export function iconUrl(field: string, slug: string): string | null {
  const key = resolveIconKey(field, slug, AVAILABLE);
  return key ? (ICON_URLS.get(key) ?? null) : null;
}
