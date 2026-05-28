import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  CATEGORIES,
  METHODS,
  ICES,
  DIFFICULTIES,
  FORMATS,
  GLASSES,
  FAMILIES,
  SPIRITS,
  FLAVORS,
  OCCASIONS,
} from './taxonomy.generated';

const recipes = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './recipes' }),
  schema: z.object({
    title: z.string(),
    blurb: z.string(),

    category: z.enum(CATEGORIES),
    publish: z.boolean().default(true),

    glass: z.enum(GLASSES),
    glass_note: z.string().optional().default(''),
    method: z.enum(METHODS),
    method_note: z.string().optional().default(''),
    ice: z.enum(ICES),
    ice_note: z.string().optional().default(''),
    difficulty: z.enum(DIFFICULTIES),

    family: z.enum(FAMILIES).optional(),

    spirits: z.array(z.enum(SPIRITS)).default([]),
    format: z.enum(FORMATS).default('single'),
    serves: z.number().default(1),

    flavors: z.array(z.enum(FLAVORS)).default([]),
    tags: z.array(z.string()).default([]),
    occasions: z.array(z.enum(OCCASIONS)).default([]),

    ingredients: z.array(z.string()).default([]),
    garnish: z.string().default(''),
    float: z.string().default(''),
    steps: z.array(z.string()).default([]),
    house_made: z.object({
      name: z.string(),
      yield: z.string().optional(),
      ingredients: z.array(z.string()).optional(),
      steps: z.array(z.string()),
    }).optional(),
    batch: z.object({
      yield: z.string(),
      ingredients: z.array(z.string()).optional(),
      instructions: z.string().optional(),
    }).optional(),

    attribution: z.object({
      creator: z.string().default(''),
      bar: z.string().default(''),
      year: z.string().default(''),
      source_url: z.string().default(''),
    }).default(() => ({ creator: '', bar: '', year: '', source_url: '' })),

    related: z.array(z.string()).default([]),
    aliases: z.array(z.string()).default([]),

    hero_image: z.string().optional().default(''),
    gallery: z.array(z.any()).optional().default([]),
    preparations: z.array(z.string()).optional().default([]),

    created: z.coerce.date().optional(),
  }),
});

const sections = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './sections' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(99),
    summary: z.string().optional(),
  }),
});

export const collections = { recipes, sections };
