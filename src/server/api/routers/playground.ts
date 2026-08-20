// server/api/routers/playground.ts
import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  playgrounds,
  playgroundEquipment,
  playgroundEditSuggestions,
  playgroundEditSuggestionEquipment,
  users,
} from "~/server/db/schema";
import {
  CreatePlaygroundSchema,
  PlaygroundNotFoundError,
  ReviewPlaygroundSchema,
  CreateEditSuggestionSchema,
  UpdatePlaygroundSchema,
  ReviewEditSuggestionSchema,
  UpdateMySubmissionSchema,
  UpdateMyEditSuggestionSchema,
} from "~/types";
import { deleteOrphanedFiles } from "~/lib/file-cleanup";
import { logDbError, logger } from "~/lib/logging/logger";
import type { db as dbType } from "~/server/db";

/** Verify the current user has admin or super_admin role. Throws FORBIDDEN if not. */
async function requireAdmin(db: typeof dbType, userId: string) {
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can perform this action",
    });
  }
}


export const playgroundRouter = createTRPCRouter({

  create: protectedProcedure
    .input(CreatePlaygroundSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      logger.info("Creating playground", {
        component: "PlaygroundRouter",
        action: "create_playground",
        userId,
        metadata: {
          title: input.title,
          imageCount: input.images?.length ?? 0,
          equipmentCount: input.equipmentIds?.length ?? 0,
        },
      });

      try {
        // Create playground first
        const [newPlayground] = await ctx.db
          .insert(playgrounds)
          .values({
            title: input.title,
            latitude: input.latitude,
            longitude: input.longitude,
            municipality: input.municipality,
            publiclyAccessible: input.publiclyAccessible,
            toddlerFriendly: input.toddlerFriendly,
            // School ground properties
            isSchoolGround: input.isSchoolGround,
            schoolType: input.schoolType,
            // Amenity properties
            hasSeating: input.hasSeating,
            hasPicnicTable: input.hasPicnicTable,
            hasFencing: input.hasFencing,
            hasGarbageCan: input.hasGarbageCan,
            hasBathroomNearby: input.hasBathroomNearby,
            hasSoftPlayArea: input.hasSoftPlayArea,
            coverImage: input.images[0] ?? null, // First image as cover
            images: input.images,
            createdById: userId,
            status: "pending", // New submissions default to pending
          })
          .returning();

        if (!newPlayground) {
          const error = new Error("Failed to create playground - no record returned");
          logDbError("playground_insert", error, {
            component: "PlaygroundRouter",
            action: "create_playground",
            userId,
          });
          throw error;
        }

        // Add equipment relationships if any equipment selected
        if (input.equipmentIds && input.equipmentIds.length > 0) {
          const equipmentRelations = input.equipmentIds.map(equipmentId => ({
            playgroundId: newPlayground.id,
            equipmentId: equipmentId,
          }));

          await ctx.db.insert(playgroundEquipment).values(equipmentRelations);
        }

        logger.info("Playground created successfully", {
          component: "PlaygroundRouter",
          action: "create_playground_success",
          userId,
          metadata: {
            playgroundId: newPlayground.id,
            title: newPlayground.title,
            imageCount: newPlayground.images?.length ?? 0,
            equipmentCount: input.equipmentIds?.length ?? 0,
          },
        });

        return newPlayground;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logDbError("playground_creation", err, {
          component: "PlaygroundRouter",
          action: "create_playground",
          userId,
          metadata: {
            title: input.title,
            imageCount: input.images?.length ?? 0,
          },
        });
        throw err;
      }
    }),

  update: protectedProcedure
    .input(UpdatePlaygroundSchema)
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx.db, ctx.session.user.id);
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
      await requireAdmin(ctx.db, ctx.session.user.id);
      const { id, action, rejectionReason, equipmentIds, ...playgroundUpdates } = input;

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

      // Update equipment relationships if equipmentIds provided
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

  /**
   * Public map/list payload. Every approved playground is sent at once and the
   * result is serialized twice (RSC flight + HTML), so columns nobody renders
   * here are excluded: moderation fields are admin-only, and the equipment
   * image/description are only shown on the detail page, which uses `getById`.
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    const playgroundList = await ctx.db.query.playgrounds.findMany({
      where: (playgrounds, { eq }) => eq(playgrounds.status, "approved"),
      orderBy: (playgrounds, { desc }) => [desc(playgrounds.createdAt)],
      columns: {
        reviewedById: false,
        reviewedAt: false,
        rejectionReason: false,
        submitAnonymously: false,
        updatedAt: false,
      },
      with: {
        playgroundEquipment: {
          columns: {
            playgroundId: true,
            equipmentId: true,
          },
          with: {
            equipment: {
              columns: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return playgroundList ?? null;
  }),

  getAllForAdmin: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx.db, ctx.session.user.id);
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
    await requireAdmin(ctx.db, ctx.session.user.id);
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
      logger.debug("Fetching playground by ID", {
        component: "PlaygroundRouter",
        action: "get_playground_by_id",
        metadata: { playgroundId: input.id },
      });

      try {
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
          logger.warn("Playground not found", {
            component: "PlaygroundRouter",
            action: "playground_not_found",
            metadata: { playgroundId: input.id },
          });
          throw new PlaygroundNotFoundError(input.id);
        }

        logger.debug("Playground fetched successfully", {
          component: "PlaygroundRouter",
          action: "get_playground_by_id_success",
          metadata: {
            playgroundId: playground.id,
            title: playground.title,
            status: playground.status,
          },
        });

        return playground;
      } catch (error) {
        if (error instanceof PlaygroundNotFoundError) {
          throw error; // Re-throw custom errors
        }

        const err = error instanceof Error ? error : new Error(String(error));
        logDbError("playground_fetch_by_id", err, {
          component: "PlaygroundRouter",
          action: "get_playground_by_id",
          metadata: { playgroundId: input.id },
        });
        throw err;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx.db, ctx.session.user.id);
      // Get the playground first to access its images for cleanup
      const playground = await ctx.db.query.playgrounds.findFirst({
        where: (playgrounds, { eq }) => eq(playgrounds.id, input.id),
      });

      if (!playground) {
        throw new PlaygroundNotFoundError(input.id);
      }

      // Delete edit suggestions first (FK has no cascade in existing DB)
      await ctx.db
        .delete(playgroundEditSuggestions)
        .where(eq(playgroundEditSuggestions.playgroundId, input.id));

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

  createEditSuggestion: protectedProcedure
    .input(CreateEditSuggestionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const {
        playgroundId,
        equipmentIds,
        removeImages,
        removeCoverImage,
        ...suggestionData
      } = input;

      logger.info("Creating edit suggestion", {
        component: "PlaygroundRouter",
        action: "create_edit_suggestion",
        userId,
        metadata: {
          playgroundId,
          equipmentCount: equipmentIds?.length ?? 0,
        },
      });

      try {
        // Check if the playground exists and is approved
        const existingPlayground = await ctx.db.query.playgrounds.findFirst({
          where: (playgrounds, { eq, and }) =>
            and(
              eq(playgrounds.id, playgroundId),
              eq(playgrounds.status, "approved")
            ),
        });

        if (!existingPlayground) {
          throw new Error("Playground not found or not approved for editing");
        }

        // Process image removal
        let imagesToKeep = [...(existingPlayground.images || [])];
        let coverImageValue = suggestionData.coverImage;

        // Handle explicit cover image removal
        if (removeCoverImage) {
          coverImageValue = null;
        }

        // Handle additional image removal
        if (removeImages && removeImages.length > 0 && existingPlayground.images) {
          imagesToKeep = existingPlayground.images.filter((_, index) =>
            index >= removeImages.length || !removeImages[index]
          );

          // Only update if there's an actual change
          if (imagesToKeep.length !== existingPlayground.images.length) {
            suggestionData.images = imagesToKeep;
          }
        }

        // Create the edit suggestion
        const [newSuggestion] = await ctx.db
          .insert(playgroundEditSuggestions)
          .values({
            playgroundId,
            ...suggestionData,
            coverImage: coverImageValue,
            equipmentIds,
            createdById: userId,
            status: "pending",
          })
          .returning();

        if (!newSuggestion) {
          throw new Error("Failed to create edit suggestion");
        }

        // Add equipment relationships if any equipment changes suggested
        if (equipmentIds && equipmentIds.length > 0) {
          const equipmentRelations = equipmentIds.map(equipmentId => ({
            suggestionId: newSuggestion.id,
            equipmentId: equipmentId,
          }));

          await ctx.db.insert(playgroundEditSuggestionEquipment).values(equipmentRelations);
        }

        logger.info("Edit suggestion created successfully", {
          component: "PlaygroundRouter",
          action: "create_edit_suggestion_success",
          userId,
          metadata: {
            suggestionId: newSuggestion.id,
            playgroundId,
            equipmentCount: equipmentIds?.length ?? 0,
            imagesRemoved: (existingPlayground.images?.length || 0) - imagesToKeep.length,
            coverImageRemoved: removeCoverImage,
          },
        });

        return newSuggestion;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logDbError("edit_suggestion_creation", err, {
          component: "PlaygroundRouter",
          action: "create_edit_suggestion",
          userId,
          metadata: { playgroundId },
        });
        throw err;
      }
    }),

  reviewEditSuggestion: protectedProcedure
    .input(ReviewEditSuggestionSchema)
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx.db, ctx.session.user.id);
      const userId = ctx.session.user.id;
      const { id, action, rejectionReason } = input;

      logger.info("Reviewing edit suggestion", {
        component: "PlaygroundRouter",
        action: "review_edit_suggestion",
        userId,
        metadata: {
          suggestionId: id,
          reviewAction: action,
        },
      });

      try {
        // Get the edit suggestion with the original playground
        const editSuggestion = await ctx.db.query.playgroundEditSuggestions.findFirst({
          where: (suggestions, { eq }) => eq(suggestions.id, id),
          with: {
            playground: {
              with: {
                playgroundEquipment: {
                  with: {
                    equipment: true,
                  },
                },
              },
            },
            suggestionEquipment: {
              with: {
                equipment: true,
              },
            },
          },
        });

        if (!editSuggestion) {
          throw new Error("Edit suggestion not found");
        }

        if (editSuggestion.status !== "pending") {
          throw new Error("Edit suggestion has already been reviewed");
        }

        // Update the edit suggestion status
        const [updatedSuggestion] = await ctx.db
          .update(playgroundEditSuggestions)
          .set({
            status: action === "approve" ? "approved" : "rejected",
            reviewedById: userId,
            reviewedAt: new Date(),
            rejectionReason: action === "reject" ? rejectionReason : null,
          })
          .where(eq(playgroundEditSuggestions.id, id))
          .returning();

        if (!updatedSuggestion) {
          throw new Error("Failed to update edit suggestion");
        }

        // If approved, apply the changes to the playground
        if (action === "approve") {
          const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          // Apply all non-null changes from the suggestion
          if (editSuggestion.title !== null) updateData.title = editSuggestion.title;
          if (editSuggestion.latitude !== null) updateData.latitude = editSuggestion.latitude;
          if (editSuggestion.longitude !== null) updateData.longitude = editSuggestion.longitude;
          if (editSuggestion.municipality !== null) updateData.municipality = editSuggestion.municipality;
          if (editSuggestion.publiclyAccessible !== null) updateData.publiclyAccessible = editSuggestion.publiclyAccessible;
          if (editSuggestion.toddlerFriendly !== null) updateData.toddlerFriendly = editSuggestion.toddlerFriendly;
          if (editSuggestion.isSchoolGround !== null) updateData.isSchoolGround = editSuggestion.isSchoolGround;
          if (editSuggestion.schoolType !== null) updateData.schoolType = editSuggestion.schoolType;
          if (editSuggestion.hasSeating !== null) updateData.hasSeating = editSuggestion.hasSeating;
          if (editSuggestion.hasPicnicTable !== null) updateData.hasPicnicTable = editSuggestion.hasPicnicTable;
          if (editSuggestion.hasFencing !== null) updateData.hasFencing = editSuggestion.hasFencing;
          if (editSuggestion.hasGarbageCan !== null) updateData.hasGarbageCan = editSuggestion.hasGarbageCan;
          if (editSuggestion.hasBathroomNearby !== null) updateData.hasBathroomNearby = editSuggestion.hasBathroomNearby;
          if (editSuggestion.hasSoftPlayArea !== null) updateData.hasSoftPlayArea = editSuggestion.hasSoftPlayArea;
          if (editSuggestion.coverImage !== null) updateData.coverImage = editSuggestion.coverImage;
          if (editSuggestion.images !== null) updateData.images = editSuggestion.images;

          // Update the playground
          await ctx.db
            .update(playgrounds)
            .set(updateData)
            .where(eq(playgrounds.id, editSuggestion.playgroundId));

          // Update equipment if changed
          if (editSuggestion.equipmentIds !== null) {
            // Remove existing equipment relationships
            await ctx.db
              .delete(playgroundEquipment)
              .where(eq(playgroundEquipment.playgroundId, editSuggestion.playgroundId));

            // Add new equipment relationships if any
            if (editSuggestion.equipmentIds.length > 0) {
              const equipmentRelations = editSuggestion.equipmentIds.map(equipmentId => ({
                playgroundId: editSuggestion.playgroundId,
                equipmentId: equipmentId,
              }));

              await ctx.db.insert(playgroundEquipment).values(equipmentRelations);
            }
          }
        }

        logger.info("Edit suggestion reviewed successfully", {
          component: "PlaygroundRouter",
          action: "review_edit_suggestion_success",
          userId,
          metadata: {
            suggestionId: id,
            reviewAction: action,
            playgroundId: editSuggestion.playgroundId,
          },
        });

        return updatedSuggestion;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logDbError("edit_suggestion_review", err, {
          component: "PlaygroundRouter",
          action: "review_edit_suggestion",
          userId,
          metadata: { suggestionId: id },
        });
        throw err;
      }
    }),

  getPendingEditSuggestions: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx.db, ctx.session.user.id);
    const pendingSuggestions = await ctx.db.query.playgroundEditSuggestions.findMany({
      where: (suggestions, { eq }) => eq(suggestions.status, "pending"),
      orderBy: (suggestions, { asc }) => [asc(suggestions.createdAt)],
      with: {
        playground: {
          with: {
            playgroundEquipment: {
              with: {
                equipment: true,
              },
            },
          },
        },
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        suggestionEquipment: {
          with: {
            equipment: true,
          },
        },
      },
    });

    return pendingSuggestions ?? [];
  }),

  getAllEditSuggestions: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx.db, ctx.session.user.id);
    const allSuggestions = await ctx.db.query.playgroundEditSuggestions.findMany({
      orderBy: (suggestions, { desc }) => [desc(suggestions.createdAt)],
      with: {
        playground: {
          with: {
            playgroundEquipment: {
              with: {
                equipment: true,
              },
            },
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
        suggestionEquipment: {
          with: {
            equipment: true,
          },
        },
      },
    });

    return allSuggestions ?? [];
  }),

  // ============================================
  // User's own submissions management endpoints
  // ============================================

  getMySubmissions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const submissions = await ctx.db.query.playgrounds.findMany({
      where: (playgrounds, { eq }) => eq(playgrounds.createdById, userId),
      orderBy: (playgrounds, { desc }) => [desc(playgrounds.createdAt)],
      with: {
        playgroundEquipment: {
          with: {
            equipment: true,
          },
        },
      },
    });

    return submissions ?? [];
  }),

  getMyEditSuggestions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const suggestions = await ctx.db.query.playgroundEditSuggestions.findMany({
      where: (suggestions, { eq }) => eq(suggestions.createdById, userId),
      orderBy: (suggestions, { desc }) => [desc(suggestions.createdAt)],
      with: {
        playground: {
          columns: {
            id: true,
            title: true,
            coverImage: true,
          },
        },
        suggestionEquipment: {
          with: {
            equipment: true,
          },
        },
      },
    });

    return suggestions ?? [];
  }),

  updateMySubmission: protectedProcedure
    .input(UpdateMySubmissionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id, equipmentIds, ...updateData } = input;

      logger.info("Updating own submission", {
        component: "PlaygroundRouter",
        action: "update_my_submission",
        userId,
        metadata: { playgroundId: id },
      });

      // Verify ownership and pending status
      const playground = await ctx.db.query.playgrounds.findFirst({
        where: (playgrounds, { eq, and }) =>
          and(
            eq(playgrounds.id, id),
            eq(playgrounds.createdById, userId),
            eq(playgrounds.status, "pending")
          ),
      });

      if (!playground) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playground not found, already reviewed, or you don't have permission to edit it",
        });
      }

      // Get current images for cleanup
      const oldImages = [...(playground.images ?? [])];
      if (playground.coverImage) {
        oldImages.push(playground.coverImage);
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update playground",
        });
      }

      // Update equipment relationships
      await ctx.db
        .delete(playgroundEquipment)
        .where(eq(playgroundEquipment.playgroundId, id));

      if (equipmentIds.length > 0) {
        const equipmentRelations = equipmentIds.map(equipmentId => ({
          playgroundId: id,
          equipmentId: equipmentId,
        }));

        await ctx.db.insert(playgroundEquipment).values(equipmentRelations);
      }

      // Clean up orphaned files
      const newImages = [...(input.images ?? [])];
      if (input.coverImage) {
        newImages.push(input.coverImage);
      }

      deleteOrphanedFiles(oldImages, newImages).catch(error => {
        console.error("Error cleaning up orphaned files:", error);
      });

      logger.info("Own submission updated successfully", {
        component: "PlaygroundRouter",
        action: "update_my_submission_success",
        userId,
        metadata: { playgroundId: id },
      });

      return updatedPlayground;
    }),

  updateMyEditSuggestion: protectedProcedure
    .input(UpdateMyEditSuggestionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id, playgroundId, equipmentIds, removeImages, removeCoverImage, ...suggestionData } = input;

      logger.info("Updating own edit suggestion", {
        component: "PlaygroundRouter",
        action: "update_my_edit_suggestion",
        userId,
        metadata: { suggestionId: id },
      });

      // Verify ownership and pending status
      const suggestion = await ctx.db.query.playgroundEditSuggestions.findFirst({
        where: (suggestions, { eq, and }) =>
          and(
            eq(suggestions.id, id),
            eq(suggestions.createdById, userId),
            eq(suggestions.status, "pending")
          ),
        with: {
          playground: true,
        },
      });

      if (!suggestion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Edit suggestion not found, already reviewed, or you don't have permission to edit it",
        });
      }

      // Process image removal (same logic as createEditSuggestion)
      let imagesToKeep = [...(suggestion.playground?.images || [])];
      let coverImageValue = suggestionData.coverImage;

      if (removeCoverImage) {
        coverImageValue = null;
      }

      if (removeImages && removeImages.length > 0 && suggestion.playground?.images) {
        imagesToKeep = suggestion.playground.images.filter((_, index) =>
          index >= removeImages.length || !removeImages[index]
        );

        if (imagesToKeep.length !== suggestion.playground.images.length) {
          suggestionData.images = imagesToKeep;
        }
      }

      // Update the suggestion
      const [updatedSuggestion] = await ctx.db
        .update(playgroundEditSuggestions)
        .set({
          ...suggestionData,
          coverImage: coverImageValue,
          equipmentIds,
          updatedAt: new Date(),
        })
        .where(eq(playgroundEditSuggestions.id, id))
        .returning();

      if (!updatedSuggestion) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update edit suggestion",
        });
      }

      // Update equipment relationships
      await ctx.db
        .delete(playgroundEditSuggestionEquipment)
        .where(eq(playgroundEditSuggestionEquipment.suggestionId, id));

      if (equipmentIds && equipmentIds.length > 0) {
        const equipmentRelations = equipmentIds.map(equipmentId => ({
          suggestionId: id,
          equipmentId: equipmentId,
        }));

        await ctx.db.insert(playgroundEditSuggestionEquipment).values(equipmentRelations);
      }

      logger.info("Own edit suggestion updated successfully", {
        component: "PlaygroundRouter",
        action: "update_my_edit_suggestion_success",
        userId,
        metadata: { suggestionId: id },
      });

      return updatedSuggestion;
    }),

  addPhotos: protectedProcedure
    .input(z.object({ id: z.number(), images: z.array(z.string().url()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id, images } = input;

      const playground = await ctx.db.query.playgrounds.findFirst({
        where: (p, { eq }) => eq(p.id, id),
      });

      if (!playground) {
        throw new PlaygroundNotFoundError(id);
      }

      const existingImages = playground.images ?? [];
      const newImages = [...existingImages, ...images];
      // Set cover image if none exists yet
      const coverImage = playground.coverImage ?? images[0] ?? null;

      await ctx.db
        .update(playgrounds)
        .set({ images: newImages, coverImage, updatedAt: new Date() })
        .where(eq(playgrounds.id, id));
    }),
});
