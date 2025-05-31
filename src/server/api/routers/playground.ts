// server/api/routers/playground.ts
import { z } from "zod";
import { eq } from "drizzle-orm";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { playgrounds, playgroundEquipment } from "~/server/db/schema";
import { CreatePlaygroundSchema, PlaygroundNotFoundError, ReviewPlaygroundSchema } from "~/types";
import { deleteOrphanedFiles } from "~/lib/file-cleanup";

// Update schema for playground editing
const UpdatePlaygroundSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required").max(256, "Title too long"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  publiclyAccessible: z.boolean(),
  toddlerFriendly: z.boolean(),
  equipmentIds: z.array(z.number()).default([]),
  coverImage: z.string().nullable().optional(),
  images: z.array(z.string()),
});

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
      console.log("🏗️ Creating playground with input:", {
        ...input,
        images: input.images,
        imageCount: input.images?.length ?? 0,
        equipmentCount: input.equipmentIds?.length ?? 0
      });

      // Create playground first
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
          status: "pending", // New submissions default to pending
        })
        .returning();

      if (!newPlayground) {
        throw new Error("Failed to create playground");
      }

      // Add equipment relationships if any equipment selected
      if (input.equipmentIds && input.equipmentIds.length > 0) {
        const equipmentRelations = input.equipmentIds.map(equipmentId => ({
          playgroundId: newPlayground.id,
          equipmentId: equipmentId,
        }));

        await ctx.db.insert(playgroundEquipment).values(equipmentRelations);
      }

      console.log("✅ Playground created successfully:", {
        id: newPlayground?.id,
        title: newPlayground?.title,
        images: newPlayground?.images,
        coverImage: newPlayground?.coverImage,
        imageCount: newPlayground?.images?.length ?? 0,
        equipmentCount: input.equipmentIds?.length ?? 0
      });

      return newPlayground;
    }),

  update: protectedProcedure
    .input(UpdatePlaygroundSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, equipmentIds, ...updateData } = input;

      // Get the current playground to compare image changes
      const currentPlayground = await ctx.db.query.playgrounds.findFirst({
        where: (playgrounds, { eq }) => eq(playgrounds.id, id),
      });

      if (!currentPlayground) {
        throw new PlaygroundNotFoundError(id);
      }

      // Update playground data
      const [updatedPlayground] = await ctx.db
        .update(playgrounds)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(playgrounds.id, id))
        .returning();

      if (!updatedPlayground) {
        throw new PlaygroundNotFoundError(id);
      }

      // Update equipment relationships
      if (equipmentIds !== undefined) {
        // Remove existing equipment relationships
        await ctx.db
          .delete(playgroundEquipment)
          .where(eq(playgroundEquipment.playgroundId, id));

        // Add new equipment relationships if any
        if (equipmentIds.length > 0) {
          const equipmentRelations = equipmentIds.map(equipmentId => ({
            playgroundId: id,
            equipmentId: equipmentId,
          }));

          await ctx.db.insert(playgroundEquipment).values(equipmentRelations);
        }
      }

      // Clean up orphaned files after successful update
      const oldImages = [...(currentPlayground.images ?? [])];
      if (currentPlayground.coverImage) {
        oldImages.push(currentPlayground.coverImage);
      }

      const newImages = [...(input.images ?? [])];
      if (input.coverImage) {
        newImages.push(input.coverImage);
      }

      // Don't await this to avoid blocking the response
      deleteOrphanedFiles(oldImages, newImages).catch(error => {
        console.error("Error cleaning up orphaned files:", error);
      });

      return updatedPlayground;
    }),

  review: protectedProcedure
    .input(ReviewPlaygroundSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, action, rejectionReason, ...playgroundUpdates } = input;

      // Get the current playground to compare image changes
      const currentPlayground = await ctx.db.query.playgrounds.findFirst({
        where: (playgrounds, { eq }) => eq(playgrounds.id, id),
      });

      if (!currentPlayground) {
        throw new PlaygroundNotFoundError(id);
      }

      type UpdateData = {
        status: "approved" | "rejected";
        reviewedById: string;
        reviewedAt: Date;
        updatedAt: Date;
        rejectionReason?: string;
      } & Partial<typeof playgroundUpdates>;

      const updateData: UpdateData = {
        status: action === "approve" ? "approved" : "rejected",
        reviewedById: ctx.session.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      };

      if (action === "reject" && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      // Include any playground field updates
      Object.assign(updateData, playgroundUpdates);

      const [updatedPlayground] = await ctx.db
        .update(playgrounds)
        .set(updateData)
        .where(eq(playgrounds.id, id))
        .returning();

      if (!updatedPlayground) {
        throw new PlaygroundNotFoundError(id);
      }

      // Clean up orphaned files after successful review/update
      const oldImages = [...(currentPlayground.images ?? [])];
      if (currentPlayground.coverImage) {
        oldImages.push(currentPlayground.coverImage);
      }

      const newImages = [...(playgroundUpdates.images ?? currentPlayground.images ?? [])];
      const newCoverImage = playgroundUpdates.coverImage !== undefined
        ? playgroundUpdates.coverImage
        : currentPlayground.coverImage;
      if (newCoverImage) {
        newImages.push(newCoverImage);
      }

      // Don't await this to avoid blocking the response
      deleteOrphanedFiles(oldImages, newImages).catch(error => {
        console.error("Error cleaning up orphaned files:", error);
      });

      return updatedPlayground;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const playgroundList = await ctx.db.query.playgrounds.findMany({
      where: (playgrounds, { eq }) => eq(playgrounds.status, "approved"),
      orderBy: (playgrounds, { desc }) => [desc(playgrounds.createdAt)],
      with: {
        playgroundEquipment: {
          with: {
            equipment: true,
          },
        },
      },
    });

    return playgroundList ?? null;
  }),

  getAllForAdmin: protectedProcedure.query(async ({ ctx }) => {
    const playgroundList = await ctx.db.query.playgrounds.findMany({
      orderBy: (playgrounds, { desc }) => [desc(playgrounds.createdAt)],
      with: {
        playgroundEquipment: {
          with: {
            equipment: true,
          },
        },
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return playgroundList ?? null;
  }),

  getPendingSubmissions: protectedProcedure.query(async ({ ctx }) => {
    const pendingPlaygrounds = await ctx.db.query.playgrounds.findMany({
      where: (playgrounds, { eq }) => eq(playgrounds.status, "pending"),
      orderBy: (playgrounds, { asc }) => [asc(playgrounds.createdAt)],
      with: {
        playgroundEquipment: {
          with: {
            equipment: true,
          },
        },
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return pendingPlaygrounds ?? [];
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const playground = await ctx.db.query.playgrounds.findFirst({
        where: (playgrounds, { eq }) => eq(playgrounds.id, input.id),
        with: {
          playgroundEquipment: {
            with: {
              equipment: true,
            },
          },
          createdBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewedBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!playground) {
        throw new PlaygroundNotFoundError(input.id);
      }

      return playground;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get the playground first to access its images for cleanup
      const playground = await ctx.db.query.playgrounds.findFirst({
        where: (playgrounds, { eq }) => eq(playgrounds.id, input.id),
      });

      if (!playground) {
        throw new PlaygroundNotFoundError(input.id);
      }

      // Delete the playground from database
      const [deletedPlayground] = await ctx.db
        .delete(playgrounds)
        .where(eq(playgrounds.id, input.id))
        .returning();

      if (!deletedPlayground) {
        throw new PlaygroundNotFoundError(input.id);
      }

      // Clean up all associated image files
      const allImages = [...(playground.images ?? [])];
      if (playground.coverImage) {
        allImages.push(playground.coverImage);
      }

      // Delete all images (no new images since we're deleting the playground)
      deleteOrphanedFiles(allImages, []).catch(error => {
        console.error("Error cleaning up files after playground deletion:", error);
      });

      return deletedPlayground;
    }),
});
