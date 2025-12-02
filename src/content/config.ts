import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    schema: docsSchema({
      extend: z.object({
        date: z.date().optional().or(z.string()),
        tags: z.array(z.string()).optional(),
      }),
    }),
  }),
};
