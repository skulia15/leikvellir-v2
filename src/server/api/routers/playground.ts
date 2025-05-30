// server/api/routers/playground.ts
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { playgrounds } from "~/server/db/schema";
import { CreatePlaygroundSchema, PlaygroundNotFoundError } from "~/types";

export const playgroundRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello, playground router is working! ${input.text}`,
      };
    }),

  create: protectedProcedure
    .input(CreatePlaygroundSchema)
    .mutation(async ({ ctx, input }) => {
      const [newPlayground] = await ctx.db
        .insert(playgrounds)
        .values({
          title: input.title,
          latitude: input.latitude,
          longitude: input.longitude,
          publiclyAccessible: input.publiclyAccessible,
          toddlerFriendly: input.toddlerFriendly,
          coverImage: input.images[0] ?? null, // First image as cover
          images: input.images,
          createdById: ctx.session.user.id,
        })
        .returning();

      return newPlayground;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const playgrounds = await ctx.db.query.playgrounds.findMany({
      orderBy: (playgrounds, { desc }) => [desc(playgrounds.createdAt)],
    });

    return playgrounds ?? null;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const playground = await ctx.db.query.playgrounds.findFirst({
        where: (playgrounds, { eq }) => eq(playgrounds.id, input.id),
      });

      if (!playground) {
        throw new PlaygroundNotFoundError(input.id);
      }

      return playground;
    }),
});
