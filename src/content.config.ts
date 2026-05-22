import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const recipes = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './recipes' }),
  schema: z.object({
    title: z.string(),
    blurb: z.string(),

    category: z.enum(['classic', 'original', 'seasonal', 'inbox']),
    publish: z.boolean().default(true),

    glass: z.string(),
    method: z.enum(['shaken', 'stirred', 'built', 'blended']),
    method_note: z.string().optional().default(''),
    ice: z.enum(['cubed', 'large-cube', 'crushed', 'none']),
    ice_note: z.string().optional().default(''),
    difficulty: z.enum(['easy', 'medium', 'advanced']),

    spirits: z.array(z.string()).default([]),
    format: z.enum(['single', 'batch', 'punch']).default('single'),
    serves: z.number().default(1),

    flavors: z.array(z.string()).default([]),
    styles: z.array(z.string()).default([]),
    occasions: z.array(z.string()).default([]),

    attribution: z.object({
      creator: z.string().default(''),
      bar: z.string().default(''),
      year: z.string().default(''),
      source_url: z.string().default(''),
    }).default({}),

    related: z.array(z.string()).default([]),
    aliases: z.array(z.string()).default([]),

    hero_image: z.string().optional().default(''),
    gallery: z.array(z.any()).optional().default([]),
    preparations: z.array(z.string()).optional().default([]),

    created: z.coerce.date().optional(),
  }),
});

export const collections = { recipes };
