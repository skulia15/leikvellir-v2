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
} from "~/server/db/schema";
import {
  AddPhotosSchema,
  CreatePlaygroundSchema,
  PlaygroundNotFoundError,
  ReviewPlaygroundSchema,
  CreateEditSuggestionSchema,
  UpdatePlaygroundSchema,
  ReviewEditSuggestionSchema,
  UpdateMySubmissionSchema,
  UpdateMyEditSuggestionSchema,
} from "~/types";
import { MAX_PLAYGROUND_IMAGES } from "~/lib/image-url";
import { deleteOrphanedFiles } from "~/lib/file-cleanup";
import { buildPlaygroundBlurData } from "~/lib/image-blur";
import { logDbError, logger } from "~/lib/logging/logger";
import { getUserById, type UserCache } from "~/server/api/current-user";
import {
  notifyNewEditSuggestion,
  notifyNewSubmission,
} from "~/server/notifications/discord";
import type { db as dbType } from "~/server/db";

interface AdminCheckContext {
  db: typeof dbType;
  userCache?: UserCache;
}

/** Check whether the current user has admin or super_admin role. */
async function isAdmin(ctx: AdminCheckContext, userId: string): Promise<boolean> {
  const currentUser = await getUserById(ctx, userId);
  return currentUser?.role === "admin" || currentUser?.role === "super_admin";
}

/** Verify the current user has admin or super_admin role. Throws FORBIDDEN if not. */
async function requireAdmin(ctx: AdminCheckContext, userId: string) {
  if (!(await isAdmin(ctx, userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can perform this action",
    });
  }
}

/** Check whether the given userId belongs to a non-banned admin or super_admin. */
async function isAdminUser(
  ctx: AdminCheckContext,
  userId: string | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const currentUser = await getUserById(ctx, userId);
  return Boolean(
    currentUser &&
      !currentUser.isBanned &&
      (currentUser.role === "admin" || currentUser.role === "super_admin"),
  );
}

/**
 * Sentinel value stored in playgroundEditSuggestions.coverImage to distinguish
 * an explicit cover-image removal from an untouched nullable column (null).
 */
const REMOVE_COVER_IMAGE_SENTINEL = "";

/**
 * Merge kept existing images with any newly added images when removeImages flags are supplied.
 */
function mergeEditSuggestionImages(
  existingImages: string[],
  suggestedImages: string[] | undefined,
  removeImages: boolean[] | undefined,
): { images: string[] | undefined; imagesRemovedCount: number } {
  if (!removeImages || removeImages.length === 0 || existingImages.length === 0) {
    return { images: suggestedImages, imagesRemovedCount: 0 };
  }

  const imagesToKeep = existingImages.filter(
    (_, index) => index >= removeImages.length || !removeImages[index],
  );
  const imagesRemovedCount = existingImages.length - imagesToKeep.length;

  if (imagesRemovedCount === 0) {
    return { images: suggestedImages, imagesRemovedCount: 0 };
  }

  const newlyAddedImages = (suggestedImages ?? []).filter(
    (img) => img.trim() !== "" && !existingImages.includes(img),
  );

  return {
    images: Array.from(new Set([...imagesToKeep, ...newlyAddedImages])),
    imagesRemovedCount,
  };
}

function collectImages(
  images?: string[] | null,
  coverImage?: string | null,
): string[] {
  const result = [...(images ?? [])];
  if (coverImage) {
    result.push(coverImage);
  }
  return result;
}

async function cleanupOrphanedImages(
  oldImages: string[],
  newImages: string[],
  context: { action: string; playgroundId?: number; suggestionId?: number },
): Promise<void> {
  if (oldImages.length === 0) return;

  try {
    await deleteOrphanedFiles(oldImages, newImages);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error cleaning up orphaned files",
      {
        component: "PlaygroundRouter",
        action: context.action,
        metadata: {
          playgroundId: context.playgroundId,
          suggestionId: context.suggestionId,
        },
      },
      err,
    );
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
        const coverImage = input.images[0] ?? null;
        const { coverImageBlur, imageBlurData } = await buildPlaygroundBlurData(
          coverImage,
          input.images,
        );

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
            submitAnonymously: input.submitAnonymously,
            coverImage, // First image as cover
            images: input.images,
            coverImageBlur,
            imageBlurData,
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

        // Ping the admin channel so pending submissions don't need polling.
        // Never throws - a failed notification must not fail the submission.
        await notifyNewSubmission({
          playgroundId: newPlayground.id,
          title: newPlayground.title,
          municipality: newPlayground.municipality,
          imageCount: newPlayground.images?.length ?? 0,
          equipmentCount: input.equipmentIds?.length ?? 0,
          submitterName: ctx.session.user.name,
          submitAnonymously: input.submitAnonymously,
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
      await requireAdmin(ctx, ctx.session.user.id);
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

      // Clean up orphaned files after successful update.
      // Preserve current coverImage when omitted from partial update so it is not deleted.
      const oldImages = collectImages(
        currentPlayground.images,
        currentPlayground.coverImage,
      );
      const effectiveCoverImage =
        input.coverImage !== undefined
          ? input.coverImage
          : currentPlayground.coverImage;
      const newImages = collectImages(input.images, effectiveCoverImage);

      await cleanupOrphanedImages(oldImages, newImages, {
        action: "update_playground_cleanup",
        playgroundId: id,
      });

      return updatedPlayground;
    }),

  review: protectedProcedure
    .input(ReviewPlaygroundSchema)
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx, ctx.session.user.id);
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

      // Clear image references when rejecting so deleted blobs aren't left dangling
      if (action === "reject") {
        updateData.images = [];
        updateData.coverImage = null;
        Object.assign(updateData, { coverImageBlur: null, imageBlurData: {} });
      } else if (
        playgroundUpdates.images !== undefined ||
        playgroundUpdates.coverImage !== undefined
      ) {
        // Refresh placeholders whenever the photos change. Existing entries are
        // passed through so untouched images are not re-downloaded.
        const nextImages = playgroundUpdates.images ?? currentPlayground.images ?? [];
        const nextCover = playgroundUpdates.coverImage !== undefined
          ? playgroundUpdates.coverImage
          : currentPlayground.coverImage;

        Object.assign(
          updateData,
          await buildPlaygroundBlurData(
            nextCover,
            nextImages,
            currentPlayground.imageBlurData ?? {},
          ),
        );
      }

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
      if (action === "reject") {
        const allSubmissionImages = [
          ...collectImages(currentPlayground.images, currentPlayground.coverImage),
          ...collectImages(playgroundUpdates.images, playgroundUpdates.coverImage),
        ];

        await cleanupOrphanedImages(allSubmissionImages, [], {
          action: "review_playground_reject_cleanup",
          playgroundId: id,
        });
      } else {
        const oldImages = collectImages(
          currentPlayground.images,
          currentPlayground.coverImage,
        );
        const newCoverImage =
          playgroundUpdates.coverImage !== undefined
            ? playgroundUpdates.coverImage
            : currentPlayground.coverImage;
        const newImages = collectImages(
          playgroundUpdates.images ?? currentPlayground.images,
          newCoverImage,
        );

        await cleanupOrphanedImages(oldImages, newImages, {
          action: "review_playground_cleanup",
          playgroundId: id,
        });
      }

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
        // The cover's placeholder ships (cards render it); the per-image map
        // only matters on the detail page, which loads via `getById`.
        imageBlurData: false,
      },
      with: {
        // Only the join rows. The equipment records themselves come from
        // `equipment.getCatalog`, which ships the 39 distinct rows once rather
        // than inlining them into all 659 links - that duplication was 40% of
        // this payload, and it is parse time on a phone.
        playgroundEquipment: {
          columns: {
            playgroundId: true,
            equipmentId: true,
          },
        },
      },
    });

    return playgroundList ?? null;
  }),

  /**
   * Name and municipality of every approved playground, for the SEO structured
   * data on /playgrounds. Deliberately separate from `getAll`: that payload
   * carries images, placeholders and equipment joins, none of which end up in
   * the JSON-LD, and pulling it just to map three fields made the page shell
   * wait on the whole thing.
   */
  getSummaries: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.playgrounds.findMany({
      where: (playgrounds, { eq }) => eq(playgrounds.status, "approved"),
      orderBy: (playgrounds, { desc }) => [desc(playgrounds.createdAt)],
      columns: {
        id: true,
        title: true,
        municipality: true,
      },
    });
  }),

  getAllForAdmin: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx, ctx.session.user.id);
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
    await requireAdmin(ctx, ctx.session.user.id);
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Playground with id ${input.id} not found`,
          });
        }

        const sessionUserId = ctx.session?.user?.id;
        const isCreator = Boolean(
          sessionUserId && playground.createdById === sessionUserId,
        );
        const needsAdminCheck =
          Boolean(sessionUserId) &&
          !isCreator &&
          (playground.status !== "approved" ||
            playground.submitAnonymously ||
            playground.rejectionReason != null);
        const isAdmin = needsAdminCheck
          ? await isAdminUser(ctx, sessionUserId)
          : false;
        const isAuthorizedForPrivateFields = isAdmin || isCreator;

        if (playground.status !== "approved" && !isAuthorizedForPrivateFields) {
          logger.warn("Playground not found or not publicly accessible", {
            component: "PlaygroundRouter",
            action: "playground_not_found",
            metadata: { playgroundId: input.id },
          });
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Playground with id ${input.id} not found`,
          });
        }

        const shouldRedactCreator =
          playground.submitAnonymously && !isAuthorizedForPrivateFields;

        const {
          createdBy,
          reviewedBy: _reviewedBy,
          ...playgroundRest
        } = playground as typeof playground & { reviewedBy?: unknown };

        const sanitizedCreatedBy =
          shouldRedactCreator || !createdBy
            ? null
            : {
                id: createdBy.id,
                name: createdBy.name,
              };

        logger.debug("Playground fetched successfully", {
          component: "PlaygroundRouter",
          action: "get_playground_by_id_success",
          metadata: {
            playgroundId: playground.id,
            title: playground.title,
            status: playground.status,
          },
        });

        return {
          ...playgroundRest,
          createdById: shouldRedactCreator ? null : playgroundRest.createdById,
          rejectionReason: isAuthorizedForPrivateFields
            ? playgroundRest.rejectionReason
            : null,
          createdBy: sanitizedCreatedBy,
        };
      } catch (error) {
        if (
          error instanceof TRPCError ||
          error instanceof PlaygroundNotFoundError
        ) {
          throw error; // Re-throw expected tRPC / custom errors
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
      await requireAdmin(ctx, ctx.session.user.id);
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
      const allImages = collectImages(playground.images, playground.coverImage);

      // Delete all images (no new images since we're deleting the playground)
      await cleanupOrphanedImages(allImages, [], {
        action: "delete_playground_cleanup",
        playgroundId: input.id,
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

        // Process image removal & merge with newly added images
        const coverImageValue = removeCoverImage
          ? REMOVE_COVER_IMAGE_SENTINEL
          : suggestionData.coverImage;

        const { images: mergedImages, imagesRemovedCount } = mergeEditSuggestionImages(
          existingPlayground.images ?? [],
          suggestionData.images,
          removeImages,
        );
        if (mergedImages !== undefined) {
          suggestionData.images = mergedImages;
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
            imagesRemoved: imagesRemovedCount,
            coverImageRemoved: removeCoverImage,
          },
        });

        // Every optional key the submitter actually sent is a suggested change;
        // playgroundId and the anonymity flag are metadata, not changes.
        const changedFields = Object.entries(input)
          .filter(([key, value]) =>
            value !== undefined &&
            key !== "playgroundId" &&
            key !== "submitAnonymously"
          )
          .map(([key]) => key);

        // Ping the admin channel so pending suggestions don't need polling.
        // Never throws - a failed notification must not fail the suggestion.
        await notifyNewEditSuggestion({
          suggestionId: newSuggestion.id,
          playgroundId,
          playgroundTitle: existingPlayground.title,
          changedFields,
          submitterName: ctx.session.user.name,
          submitAnonymously: input.submitAnonymously ?? false,
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
      await requireAdmin(ctx, ctx.session.user.id);
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

        // If approved, apply the changes to the playground (preferring admin finalValues overrides)
        if (action === "approve") {
          const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          const resolveField = <T>(
            override: T | undefined,
            suggested: T | null | undefined,
          ): T | undefined => {
            if (override !== undefined) return override;
            if (suggested !== null && suggested !== undefined) return suggested;
            return undefined;
          };

          const title = resolveField(finalValues?.title, editSuggestion.title);
          if (title !== undefined) updateData.title = title;

          const latitude = resolveField(finalValues?.latitude, editSuggestion.latitude);
          if (latitude !== undefined) updateData.latitude = latitude;

          const longitude = resolveField(finalValues?.longitude, editSuggestion.longitude);
          if (longitude !== undefined) updateData.longitude = longitude;

          const municipality = resolveField(finalValues?.municipality, editSuggestion.municipality);
          if (municipality !== undefined) updateData.municipality = municipality;

          const publiclyAccessible = resolveField(
            finalValues?.publiclyAccessible,
            editSuggestion.publiclyAccessible,
          );
          if (publiclyAccessible !== undefined) updateData.publiclyAccessible = publiclyAccessible;

          const toddlerFriendly = resolveField(
            finalValues?.toddlerFriendly,
            editSuggestion.toddlerFriendly,
          );
          if (toddlerFriendly !== undefined) updateData.toddlerFriendly = toddlerFriendly;

          const isSchoolGround = resolveField(
            finalValues?.isSchoolGround,
            editSuggestion.isSchoolGround,
          );
          if (isSchoolGround !== undefined) updateData.isSchoolGround = isSchoolGround;

          const schoolType = resolveField(finalValues?.schoolType, editSuggestion.schoolType);
          if (schoolType !== undefined) updateData.schoolType = schoolType;

          const hasSeating = resolveField(finalValues?.hasSeating, editSuggestion.hasSeating);
          if (hasSeating !== undefined) updateData.hasSeating = hasSeating;

          const hasPicnicTable = resolveField(
            finalValues?.hasPicnicTable,
            editSuggestion.hasPicnicTable,
          );
          if (hasPicnicTable !== undefined) updateData.hasPicnicTable = hasPicnicTable;

          const hasFencing = resolveField(finalValues?.hasFencing, editSuggestion.hasFencing);
          if (hasFencing !== undefined) updateData.hasFencing = hasFencing;

          const hasGarbageCan = resolveField(
            finalValues?.hasGarbageCan,
            editSuggestion.hasGarbageCan,
          );
          if (hasGarbageCan !== undefined) updateData.hasGarbageCan = hasGarbageCan;

          const hasBathroomNearby = resolveField(
            finalValues?.hasBathroomNearby,
            editSuggestion.hasBathroomNearby,
          );
          if (hasBathroomNearby !== undefined) updateData.hasBathroomNearby = hasBathroomNearby;

          const hasSoftPlayArea = resolveField(
            finalValues?.hasSoftPlayArea,
            editSuggestion.hasSoftPlayArea,
          );
          if (hasSoftPlayArea !== undefined) updateData.hasSoftPlayArea = hasSoftPlayArea;

          // Support explicit cover image removal (via finalValues.coverImage === null/"" or sentinel "")
          if (finalValues?.coverImage !== undefined) {
            updateData.coverImage =
              finalValues.coverImage === REMOVE_COVER_IMAGE_SENTINEL
                ? null
                : finalValues.coverImage;
          } else if (editSuggestion.coverImage !== null) {
            updateData.coverImage =
              editSuggestion.coverImage === REMOVE_COVER_IMAGE_SENTINEL
                ? null
                : editSuggestion.coverImage;
          }

          const images = resolveField(finalValues?.images, editSuggestion.images);
          if (images !== undefined) updateData.images = images;

          if (editSuggestion.coverImage !== null || editSuggestion.images !== null) {
            Object.assign(
              updateData,
              await buildPlaygroundBlurData(
                editSuggestion.coverImage ?? editSuggestion.playground?.coverImage,
                editSuggestion.images ?? editSuggestion.playground?.images ?? [],
                editSuggestion.playground?.imageBlurData ?? {},
              ),
            );
          }

          // Update the playground
          await ctx.db
            .update(playgrounds)
            .set(updateData)
            .where(eq(playgrounds.id, editSuggestion.playgroundId));

          // Update equipment if changed (preferring admin finalValues.equipmentIds)
          const resolvedEquipmentIds = resolveField(
            finalValues?.equipmentIds,
            editSuggestion.equipmentIds,
          );
          if (resolvedEquipmentIds !== undefined) {
            // Remove existing equipment relationships
            await ctx.db
              .delete(playgroundEquipment)
              .where(eq(playgroundEquipment.playgroundId, editSuggestion.playgroundId));

            // Add new equipment relationships if any
            if (resolvedEquipmentIds.length > 0) {
              const equipmentRelations = resolvedEquipmentIds.map(equipmentId => ({
                playgroundId: editSuggestion.playgroundId,
                equipmentId: equipmentId,
              }));

              await ctx.db.insert(playgroundEquipment).values(equipmentRelations);
            }
          }

          // Clean up any images removed by the approved edit suggestion (or dropped via finalValues)
          // while preserving everything still referenced by the live playground.
          const candidateImagesToClean = [
            ...collectImages(
              editSuggestion.playground?.images,
              editSuggestion.playground?.coverImage,
            ),
            ...collectImages(editSuggestion.images, editSuggestion.coverImage),
          ];
          const resolvedCoverImage =
            "coverImage" in updateData
              ? (updateData.coverImage as string | null)
              : editSuggestion.playground?.coverImage;
          const livePlaygroundImages = collectImages(
            images !== undefined ? images : editSuggestion.playground?.images,
            resolvedCoverImage,
          );

          await cleanupOrphanedImages(
            candidateImagesToClean,
            livePlaygroundImages,
            {
              action: "review_edit_suggestion_approve_cleanup",
              playgroundId: editSuggestion.playgroundId,
              suggestionId: id,
            },
          );
        } else {
          // Clean up any newly uploaded blobs on the rejected edit suggestion
          // without deleting URLs still referenced by the live playground.
          const suggestionImages = collectImages(
            editSuggestion.images,
            editSuggestion.coverImage,
          );
          const livePlaygroundImages = collectImages(
            editSuggestion.playground?.images,
            editSuggestion.playground?.coverImage,
          );

          await cleanupOrphanedImages(suggestionImages, livePlaygroundImages, {
            action: "review_edit_suggestion_reject_cleanup",
            playgroundId: editSuggestion.playgroundId,
            suggestionId: id,
          });
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
    await requireAdmin(ctx, ctx.session.user.id);
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
    await requireAdmin(ctx, ctx.session.user.id);
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

  /**
   * Whether the user has anything under "My submissions". The nav only needs a
   * boolean to decide if that menu entry shows, so this asks for a single id
   * from each table instead of pulling full rows with their equipment joins
   * the way getMySubmissions/getMyEditSuggestions do.
   */
  hasMySubmissions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [submission, suggestion] = await Promise.all([
      ctx.db.query.playgrounds.findFirst({
        where: (playgrounds, { eq }) => eq(playgrounds.createdById, userId),
        columns: { id: true },
      }),
      ctx.db.query.playgroundEditSuggestions.findFirst({
        where: (suggestions, { eq }) => eq(suggestions.createdById, userId),
        columns: { id: true },
      }),
    ]);

    return Boolean(submission ?? suggestion);
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
      const oldImages = collectImages(playground.images, playground.coverImage);

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

      // Clean up orphaned files, preserving existing coverImage if omitted
      const effectiveCoverImage =
        input.coverImage !== undefined
          ? input.coverImage
          : playground.coverImage;
      const newImages = collectImages(input.images, effectiveCoverImage);

      await cleanupOrphanedImages(oldImages, newImages, {
        action: "update_my_submission_cleanup",
        playgroundId: id,
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

      // Process image removal & merge with newly added images (same logic as createEditSuggestion)
      const coverImageValue = removeCoverImage
        ? REMOVE_COVER_IMAGE_SENTINEL
        : suggestionData.coverImage;

      const { images: mergedImages } = mergeEditSuggestionImages(
        suggestion.playground?.images ?? [],
        suggestionData.images,
        removeImages,
      );
      if (mergedImages !== undefined) {
        suggestionData.images = mergedImages;
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

      // Clean up any blobs removed from the pending edit suggestion
      // without deleting URLs still referenced by the live playground.
      const previousSuggestionImages = collectImages(
        suggestion.images,
        suggestion.coverImage,
      );
      const stillReferencedImages = [
        ...collectImages(updatedSuggestion.images, updatedSuggestion.coverImage),
        ...collectImages(
          suggestion.playground?.images,
          suggestion.playground?.coverImage,
        ),
      ];

      await cleanupOrphanedImages(
        previousSuggestionImages,
        stillReferencedImages,
        {
          action: "update_my_edit_suggestion_cleanup",
          playgroundId,
          suggestionId: id,
        },
      );

      logger.info("Own edit suggestion updated successfully", {
        component: "PlaygroundRouter",
        action: "update_my_edit_suggestion_success",
        userId,
        metadata: { suggestionId: id },
      });

      return updatedSuggestion;
    }),

  addPhotos: protectedProcedure
    .input(AddPhotosSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, images } = input;
      const userId = ctx.session.user.id;

      const playground = await ctx.db.query.playgrounds.findFirst({
        where: (p, { eq, and }) => and(eq(p.id, id), eq(p.status, "approved")),
      });

      if (!playground || playground.status !== "approved") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approved playground not found",
        });
      }

      const existingImages = playground.images ?? [];
      const uniqueNewImages = [...new Set(images)].filter(
        (img) => !existingImages.includes(img),
      );

      if (uniqueNewImages.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All submitted photos already exist on this playground",
        });
      }

      if (existingImages.length + uniqueNewImages.length > MAX_PLAYGROUND_IMAGES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A playground cannot have more than ${MAX_PLAYGROUND_IMAGES} images`,
        });
      }

      const combinedImages = [...existingImages, ...uniqueNewImages];
      const callerIsAdmin = await isAdmin(ctx, userId);

      if (callerIsAdmin) {
        // Admins can directly update live approved playgrounds
        const coverImage = playground.coverImage ?? uniqueNewImages[0] ?? null;
        const blurData = await buildPlaygroundBlurData(
          coverImage,
          combinedImages,
          playground.imageBlurData ?? {},
        );

        await ctx.db
          .update(playgrounds)
          .set({
            images: combinedImages,
            coverImage,
            ...blurData,
            updatedAt: new Date(),
          })
          .where(eq(playgrounds.id, id));

        logger.info("Admin added photos directly to playground", {
          component: "PlaygroundRouter",
          action: "add_photos_direct",
          userId,
          metadata: { playgroundId: id, addedCount: uniqueNewImages.length },
        });

        return { status: "approved" as const };
      }

      // Non-admin photo additions must go through the edit suggestion moderation queue
      const suggestedCoverImage = playground.coverImage
        ? null
        : (uniqueNewImages[0] ?? null);

      const [suggestion] = await ctx.db
        .insert(playgroundEditSuggestions)
        .values({
          playgroundId: id,
          images: combinedImages,
          coverImage: suggestedCoverImage,
          createdById: userId,
          status: "pending",
        })
        .returning();

      logger.info("Non-admin photo addition routed to edit suggestions", {
        component: "PlaygroundRouter",
        action: "add_photos_suggestion",
        userId,
        metadata: {
          playgroundId: id,
          suggestionId: suggestion?.id,
          addedCount: uniqueNewImages.length,
        },
      });

      if (suggestion) {
        await notifyNewEditSuggestion({
          suggestionId: suggestion.id,
          playgroundId: id,
          playgroundTitle: playground.title,
          changedFields: suggestedCoverImage ? ["images", "coverImage"] : ["images"],
          submitterName: ctx.session.user.name,
          submitAnonymously: false,
        });
      }

      return { status: "pending" as const, suggestionId: suggestion?.id };
    }),
});
