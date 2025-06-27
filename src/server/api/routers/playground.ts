// server/api/routers/playground.ts
import { z } from "zod";
import { eq } from "drizzle-orm";

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
} from "~/server/db/schema";
import {
  CreatePlaygroundSchema,
  PlaygroundNotFoundError,
  ReviewPlaygroundSchema,
  CreateEditSuggestionSchema,
  UpdatePlaygroundSchema,
  ReviewEditSuggestionSchema,
} from "~/types";
import { deleteOrphanedFiles } from "~/lib/file-cleanup";
import { logDbError, logger } from "~/lib/logging/logger";


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
      const userId = ctx.session.user.id;
      const { id, action, rejectionReason, finalValues } = input;

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

          // Use finalValues if provided (admin modifications), otherwise use original suggestion values
          const valuesToApply = finalValues || editSuggestion;
          
          // Apply all non-null changes from the final values (admin-approved modifications)
          if (valuesToApply.title !== null && valuesToApply.title !== undefined) updateData.title = valuesToApply.title;
          if (valuesToApply.latitude !== null && valuesToApply.latitude !== undefined) updateData.latitude = valuesToApply.latitude;
          if (valuesToApply.longitude !== null && valuesToApply.longitude !== undefined) updateData.longitude = valuesToApply.longitude;
          if (valuesToApply.municipality !== null && valuesToApply.municipality !== undefined) updateData.municipality = valuesToApply.municipality;
          if (valuesToApply.publiclyAccessible !== null && valuesToApply.publiclyAccessible !== undefined) updateData.publiclyAccessible = valuesToApply.publiclyAccessible;
          if (valuesToApply.toddlerFriendly !== null && valuesToApply.toddlerFriendly !== undefined) updateData.toddlerFriendly = valuesToApply.toddlerFriendly;
          if (valuesToApply.isSchoolGround !== null && valuesToApply.isSchoolGround !== undefined) updateData.isSchoolGround = valuesToApply.isSchoolGround;
          if (valuesToApply.schoolType !== null && valuesToApply.schoolType !== undefined) updateData.schoolType = valuesToApply.schoolType;
          if (valuesToApply.hasSeating !== null && valuesToApply.hasSeating !== undefined) updateData.hasSeating = valuesToApply.hasSeating;
          if (valuesToApply.hasPicnicTable !== null && valuesToApply.hasPicnicTable !== undefined) updateData.hasPicnicTable = valuesToApply.hasPicnicTable;
          if (valuesToApply.hasFencing !== null && valuesToApply.hasFencing !== undefined) updateData.hasFencing = valuesToApply.hasFencing;
          if (valuesToApply.hasGarbageCan !== null && valuesToApply.hasGarbageCan !== undefined) updateData.hasGarbageCan = valuesToApply.hasGarbageCan;
          if (valuesToApply.hasBathroomNearby !== null && valuesToApply.hasBathroomNearby !== undefined) updateData.hasBathroomNearby = valuesToApply.hasBathroomNearby;
          if (valuesToApply.hasSoftPlayArea !== null && valuesToApply.hasSoftPlayArea !== undefined) updateData.hasSoftPlayArea = valuesToApply.hasSoftPlayArea;
          if (valuesToApply.coverImage !== null && valuesToApply.coverImage !== undefined) updateData.coverImage = valuesToApply.coverImage;
          if (valuesToApply.images !== null && valuesToApply.images !== undefined) updateData.images = valuesToApply.images;

          // Update the playground
          await ctx.db
            .update(playgrounds)
            .set(updateData)
            .where(eq(playgrounds.id, editSuggestion.playgroundId));

          // Update equipment if changed
          if (valuesToApply.equipmentIds !== null && valuesToApply.equipmentIds !== undefined) {
            // Remove existing equipment relationships
            await ctx.db
              .delete(playgroundEquipment)
              .where(eq(playgroundEquipment.playgroundId, editSuggestion.playgroundId));

            // Add new equipment relationships if any
            if (valuesToApply.equipmentIds.length > 0) {
              const equipmentRelations = valuesToApply.equipmentIds.map(equipmentId => ({
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
});
