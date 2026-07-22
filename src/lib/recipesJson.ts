// Pure mapping for the /recipes.json machine-readable endpoint. No
// astro:content imports so it stays unit-testable under vitest's node
// environment (same convention as myBar.ts / related.ts); the endpoint in
// src/pages/recipes.json.ts does the collection I/O and calls this.

/** The recipe fields the JSON endpoint needs — a slice of the Zod schema. */
export interface RecipeJsonInput {
  slug: string;
  title: string;
  blurb: string;
  spirits: string[];
  method: string;
  difficulty: string;
  flavors: string[];
}

export interface RecipeJsonOutput {
  title: string;
  slug: string;
  spirits: string[];
  method: string;
  difficulty: string;
  flavors: string[];
  description: string;
  url: string;
}

/**
 * Maps one recipe to the recipes.json shape (issue #150). `sitePrefix` is the
 * absolute site+base URL; empty string degrades to base-relative URLs so a
 * local build without SITE_URL/GITHUB_REPOSITORY still works. The URL path
 * matches the recipe route: bare slug, trailing slash (RecipeCard.astro —
 * `recipeUrl()` takes the full id and is wrong here, see familyMap.ts).
 */
export function recipeToJson(recipe: RecipeJsonInput, sitePrefix: string): RecipeJsonOutput {
  return {
    title: recipe.title,
    slug: recipe.slug,
    spirits: recipe.spirits,
    method: recipe.method,
    difficulty: recipe.difficulty,
    flavors: recipe.flavors,
    description: recipe.blurb,
    url: `${sitePrefix.replace(/\/$/, '')}/recipes/${recipe.slug}/`,
  };
}
