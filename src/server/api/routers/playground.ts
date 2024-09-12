// server/api/routers/playground.ts
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { playgrounds } from "~/server/db/schema";

export const playgroundRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello, playground router is working! ${input.text}`,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        latitude: z.number(),
        longitude: z.number(),
        publiclyAccessible: z.boolean().default(true),
        toddlerFriendly: z.boolean().default(false),
        coverImage: z.string().optional(),
        images: z.array(z.string()).optional(), // Accepts an array of image URLs
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(playgrounds).values({
        title: input.title,
        latitude: input.latitude,
        longitude: input.longitude,
        publiclyAccessible: input.publiclyAccessible,
        toddlerFriendly: input.toddlerFriendly,
        coverImage: input.coverImage,
        images: input.images,
        createdById: ctx.session.user.id,
      });
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const playground = await ctx.db.query.playgrounds.findMany({
      orderBy: (playgrounds, { desc }) => [desc(playgrounds.createdAt)],
    });

    return playground ?? null;
  }),
});
