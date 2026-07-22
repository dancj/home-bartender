import type { APIRoute } from 'astro';
import { publishedRecipes } from '../lib/recipes';
import { recipeToJson } from '../lib/recipesJson';

// Static-build JSON endpoint (issue #150): the whole published collection in
// one request for LLMs/agents. `site` is undefined in local dev (no SITE_URL /
// GITHUB_REPOSITORY) — recipeToJson degrades to base-relative URLs then.
export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const sitePrefix = site ? `${String(site).replace(/\/$/, '')}${base}` : base;
  const recipes = await publishedRecipes();
  const body = recipes.map((r) =>
    recipeToJson(
      {
        slug: r.id.split('/').pop() ?? r.id,
        title: r.data.title,
        blurb: r.data.blurb,
        spirits: r.data.spirits,
        method: r.data.method,
        difficulty: r.data.difficulty,
        flavors: r.data.flavors,
      },
      sitePrefix,
    ),
  );
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
