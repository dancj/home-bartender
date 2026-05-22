import { getCollection, type CollectionEntry } from 'astro:content';

export type Recipe = CollectionEntry<'recipes'>;

export async function publishedRecipes(): Promise<Recipe[]> {
  return getCollection('recipes', ({ data }) => data.publish !== false);
}

export async function unpublishedRecipes(): Promise<Recipe[]> {
  return getCollection('recipes', ({ data }) => data.publish === false);
}

export function recipeUrl(id: string, base: string): string {
  return `${base.replace(/\/$/, '')}/recipes/${id}/`;
}
