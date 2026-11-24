// server/api/routers/playground.ts
import { z } from "zod";
import { and, eq, ilike, or, sql } from "drizzle-orm";
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
  EditSuggestionStatusSchema,
  PlaygroundStatusSchema,
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
import { calculateDistance } from "~/lib/geo-utils";
import { logDbError, logger } from "~/lib/logging/logger";
import { type Session } from "next-auth";
import { revalidatePublicPlaygroundPages } from "~/server/cache/revalidate";
import {
  notifyNewEditSuggestion,
  notifyNewSubmission,
} from "~/server/notifications/discord";

interface AdminCheckContext {
  session: Session | null;
}

/**
 * Whether the session user is a non-banned admin or super_admin. Role and ban state come from
 * the database session (users row loaded per request), so no extra query is needed.
 */
function isSessionAdmin(ctx: AdminCheckContext): boolean {
  const user = ctx.session?.user;
  return Boolean(
    user && !user.isBanned && (user.role === "admin" || user.role === "super_admin"),
  );
}

const DEFAULT_ADMIN_PAGE_LIMIT = 200;
const MAX_ADMIN_PAGE_LIMIT = 500;

const AdminPlaygroundListInputSchema = z
  .object({
    limit: z.number().int().min(1).max(MAX_ADMIN_PAGE_LIMIT).optional(),
    offset: z.number().int().min(0).optional(),
    status: PlaygroundStatusSchema.optional(),
    search: z.string().trim().min(1).max(200).optional(),
  })
  .optional();

const AdminEditSuggestionListInputSchema = z
  .object({
    limit: z.number().int().min(1).max(MAX_ADMIN_PAGE_LIMIT).optional(),
    offset: z.number().int().min(0).optional(),
    status: EditSuggestionStatusSchema.optional(),
    playgroundId: z.number().int().positive().optional(),
  })
  .optional();

function dedupeIds(ids: number[]): number[] {
  return [...new Set(ids)];
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function playgroundNotFoundError(id: number): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: `Playground with id ${id} not found`,
  });
}

function isPgForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: unknown; cause?: { code?: unknown } };
  return err.code === "23503" || err.cause?.code === "23503";
}

/** Rethrow TRPCErrors as-is; map FK violations (e.g. unknown equipment ids) to BAD_REQUEST. */
function mapMutationError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }
  if (isPgForeignKeyViolation(error)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more referenced records (such as equipment IDs) do not exist",
    });
  }
  throw error instanceof Error ? error : new Error(String(error));
}

/** Verify the current user has admin or super_admin role. Throws FORBIDDEN if not. */
function requireAdmin(ctx: AdminCheckContext) {
  if (!isSessionAdmin(ctx)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can perform this action",
    });
  }
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
      const uniqueEquipmentIds = dedupeIds(input.equipmentIds ?? []);

      logger.info("Creating playground", {
        component: "PlaygroundRouter",
        action: "create_playground",
        userId,
        metadata: {
          title: input.title,
          imageCount: input.images?.length ?? 0,
          equipmentCount: uniqueEquipmentIds.length,
        },
      });

      try {
        const coverImage = input.images[0] ?? null;
        // Built before the transaction: it downloads the images, and holding a
        // pooled connection open across network fetches would starve the pool.
        const { coverImageBlur, imageBlurData } = await buildPlaygroundBlurData(
          coverImage,
          input.images,
        );

        const newPlayground = await ctx.db.transaction(async (tx) => {
          const [created] = await tx
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

          if (!created) {
            const error = new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create playground",
            });
            logDbError("playground_insert", error, {
              component: "PlaygroundRouter",
              action: "create_playground",
              userId,
            });
            throw error;
          }

          // Same transaction, so an invalid equipment id rolls back the playground too
          if (uniqueEquipmentIds.length > 0) {
            await tx.insert(playgroundEquipment).values(
              uniqueEquipmentIds.map((equipmentId) => ({
                playgroundId: created.id,
                equipmentId,
              })),
            );
          }

          return created;
        });

        logger.info("Playground created successfully", {
          component: "PlaygroundRouter",
          action: "create_playground_success",
          userId,
          metadata: {
            playgroundId: newPlayground.id,
            title: newPlayground.title,
            imageCount: newPlayground.images?.length ?? 0,
            equipmentCount: uniqueEquipmentIds.length,
          },
        });

        // Ping the admin channel so pending submissions don't need polling.
        // Never throws - a failed notification must not fail the submission.
        await notifyNewSubmission({
          playgroundId: newPlayground.id,
          title: newPlayground.title,
          municipality: newPlayground.municipality,
          imageCount: newPlayground.images?.length ?? 0,
          equipmentCount: uniqueEquipmentIds.length,
          submitterName: ctx.session.user.name,
          submitAnonymously: input.submitAnonymously,
        });

        return newPlayground;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        if (isPgForeignKeyViolation(error)) {
          mapMutationError(error);
        }
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
      requireAdmin(ctx);
      const { id, equipmentIds, ...updateData } = input;

      let result;
      try {
        result = await ctx.db.transaction(async (tx) => {
          // Get the current playground to compare image changes
          const currentPlayground = await tx.query.playgrounds.findFirst({
            where: (p, { eq: eqFn }) => eqFn(p.id, id),
          });

          if (!currentPlayground) {
            throw playgroundNotFoundError(id);
          }

          const [updatedPlayground] = await tx
            .update(playgrounds)
            .set({
              ...updateData,
              updatedAt: new Date(),
            })
            .where(eq(playgrounds.id, id))
            .returning();

          if (!updatedPlayground) {
            throw playgroundNotFoundError(id);
          }

          // Delete + reinsert in the same transaction so a bad equipment id
          // cannot leave the playground with its equipment wiped.
          if (equipmentIds !== undefined) {
            const uniqueEquipmentIds = dedupeIds(equipmentIds);

            await tx
              .delete(playgroundEquipment)
              .where(eq(playgroundEquipment.playgroundId, id));

            if (uniqueEquipmentIds.length > 0) {
              await tx.insert(playgroundEquipment).values(
                uniqueEquipmentIds.map((equipmentId) => ({
                  playgroundId: id,
                  equipmentId,
                })),
              );
            }
          }

          return { currentPlayground, updatedPlayground };
        });
      } catch (error) {
        mapMutationError(error);
      }

      const { currentPlayground, updatedPlayground } = result;

      // Clean up orphaned files after the transaction commits.
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

      revalidatePublicPlaygroundPages(id);
      return updatedPlayground;
    }),

  review: protectedProcedure
    .input(ReviewPlaygroundSchema)
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const { id, action, rejectionReason, equipmentIds, ...playgroundUpdates } = input;

      // Read outside the transaction: placeholder generation below downloads
      // images and must not hold a pooled connection. The conditional
      // `status = 'pending'` update is what makes the review itself atomic.
      const currentPlayground = await ctx.db.query.playgrounds.findFirst({
        where: (p, { eq: eqFn }) => eqFn(p.id, id),
      });

      if (!currentPlayground) {
        throw playgroundNotFoundError(id);
      }

      if (currentPlayground.status !== "pending") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Playground has already been reviewed",
        });
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

      let updatedPlayground;
      try {
        updatedPlayground = await ctx.db.transaction(async (tx) => {
          // Conditional guard: a concurrent review loses instead of overwriting
          const [updated] = await tx
            .update(playgrounds)
            .set(updateData)
            .where(and(eq(playgrounds.id, id), eq(playgrounds.status, "pending")))
            .returning();

          if (!updated) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Playground has already been reviewed",
            });
          }

          if (equipmentIds !== undefined) {
            const uniqueEquipmentIds = dedupeIds(equipmentIds);

            await tx
              .delete(playgroundEquipment)
              .where(eq(playgroundEquipment.playgroundId, id));

            if (uniqueEquipmentIds.length > 0) {
              await tx.insert(playgroundEquipment).values(
                uniqueEquipmentIds.map((equipmentId) => ({
                  playgroundId: id,
                  equipmentId,
                })),
              );
            }
          }

          return updated;
        });
      } catch (error) {
        mapMutationError(error);
      }

      // Clean up orphaned files after the transaction commits
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

      revalidatePublicPlaygroundPages(id);
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

  getNearby: publicProcedure
    .input(
      z.object({
        id: z.number(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        limit: z.number().int().min(1).max(20).default(3),
      }),
    )
    .query(async ({ ctx, input }) => {
      const candidates = await ctx.db.query.playgrounds.findMany({
        columns: {
          id: true,
          title: true,
          municipality: true,
          coverImage: true,
          coverImageBlur: true,
          latitude: true,
          longitude: true,
        },
        where: (playgrounds, { and, eq, ne }) =>
          and(
            eq(playgrounds.status, "approved"),
            ne(playgrounds.id, input.id),
          ),
        orderBy: (playgrounds) => [
          sql`(
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(${input.latitude})) * cos(radians(${playgrounds.latitude})) *
                cos(radians(${playgrounds.longitude}) - radians(${input.longitude})) +
                sin(radians(${input.latitude})) * sin(radians(${playgrounds.latitude}))
              ))
            )
          ) ASC`,
        ],
        limit: input.limit,
      });

      return (candidates ?? [])
        .filter((p) => p.id !== input.id)
        .map((p) => ({
          id: p.id,
          title: p.title,
          municipality: p.municipality,
          coverImage: p.coverImage,
          coverImageBlur: p.coverImageBlur,
          latitude: p.latitude,
          longitude: p.longitude,
          distance: calculateDistance(
            input.latitude,
            input.longitude,
            p.latitude,
            p.longitude,
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, input.limit);
    }),

  getAllForAdmin: protectedProcedure
    .input(AdminPlaygroundListInputSchema)
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const conditions = [];

      if (input?.status) {
        conditions.push(eq(playgrounds.status, input.status));
      }
      if (input?.search) {
        const pattern = `%${escapeLikePattern(input.search)}%`;
        conditions.push(
          or(ilike(playgrounds.title, pattern), ilike(playgrounds.municipality, pattern)),
        );
      }

      const playgroundList = await ctx.db.query.playgrounds.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (p, { desc }) => [desc(p.createdAt)],
        limit: input?.limit ?? DEFAULT_ADMIN_PAGE_LIMIT,
        offset: input?.offset ?? 0,
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
    requireAdmin(ctx);
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
          ? isSessionAdmin(ctx)
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
        if (error instanceof TRPCError) {
          throw error;
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
      requireAdmin(ctx);

      const { playground, deletedPlayground } = await ctx.db.transaction(async (tx) => {
        // Get the playground first to access its images for cleanup
        const existing = await tx.query.playgrounds.findFirst({
          where: (p, { eq: eqFn }) => eqFn(p.id, input.id),
        });

        if (!existing) {
          throw playgroundNotFoundError(input.id);
        }

        // Delete edit suggestions first (FK has no cascade in existing DB)
        await tx
          .delete(playgroundEditSuggestions)
          .where(eq(playgroundEditSuggestions.playgroundId, input.id));

        const [deleted] = await tx
          .delete(playgrounds)
          .where(eq(playgrounds.id, input.id))
          .returning();

        if (!deleted) {
          throw playgroundNotFoundError(input.id);
        }

        return { playground: existing, deletedPlayground: deleted };
      });

      // Clean up all associated image files after the transaction commits
      const allImages = collectImages(playground.images, playground.coverImage);

      // Delete all images (no new images since we're deleting the playground)
      await cleanupOrphanedImages(allImages, [], {
        action: "delete_playground_cleanup",
        playgroundId: input.id,
      });

      revalidatePublicPlaygroundPages(input.id);
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
      const uniqueEquipmentIds =
        equipmentIds !== undefined ? dedupeIds(equipmentIds) : undefined;

      logger.info("Creating edit suggestion", {
        component: "PlaygroundRouter",
        action: "create_edit_suggestion",
        userId,
        metadata: {
          playgroundId,
          equipmentCount: uniqueEquipmentIds?.length ?? 0,
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Playground not found or not approved for editing",
          });
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

        const newSuggestion = await ctx.db.transaction(async (tx) => {
          const [created] = await tx
            .insert(playgroundEditSuggestions)
            .values({
              playgroundId,
              ...suggestionData,
              coverImage: coverImageValue,
              equipmentIds: uniqueEquipmentIds,
              createdById: userId,
              status: "pending",
            })
            .returning();

          if (!created) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create edit suggestion",
            });
          }

          if (uniqueEquipmentIds && uniqueEquipmentIds.length > 0) {
            await tx.insert(playgroundEditSuggestionEquipment).values(
              uniqueEquipmentIds.map((equipmentId) => ({
                suggestionId: created.id,
                equipmentId,
              })),
            );
          }

          return created;
        });

        logger.info("Edit suggestion created successfully", {
          component: "PlaygroundRouter",
          action: "create_edit_suggestion_success",
          userId,
          metadata: {
            suggestionId: newSuggestion.id,
            playgroundId,
            equipmentCount: uniqueEquipmentIds?.length ?? 0,
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
        if (error instanceof TRPCError) {
          throw error;
        }
        if (isPgForeignKeyViolation(error)) {
          mapMutationError(error);
        }
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
      requireAdmin(ctx);
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Edit suggestion not found",
          });
        }

        if (editSuggestion.status !== "pending") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Edit suggestion has already been reviewed",
          });
        }

        // Everything the approval writes is resolved before the transaction:
        // placeholder generation downloads images and must not hold a pooled
        // connection. The conditional status guard below keeps it atomic.
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };
        let images: string[] | undefined;
        let resolvedEquipmentIds: number[] | undefined;

        // If approved, apply the changes to the playground (preferring admin finalValues overrides)
        if (action === "approve") {
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

          images = resolveField(finalValues?.images, editSuggestion.images);
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

          // Prefer admin finalValues.equipmentIds over the suggestion's
          const equipmentOverride = resolveField(
            finalValues?.equipmentIds,
            editSuggestion.equipmentIds,
          );
          resolvedEquipmentIds =
            equipmentOverride !== undefined ? dedupeIds(equipmentOverride) : undefined;
        }

        const updatedSuggestion = await ctx.db.transaction(async (tx) => {
          // Conditional guard: a concurrent review loses instead of applying twice
          const [updated] = await tx
            .update(playgroundEditSuggestions)
            .set({
              status: action === "approve" ? "approved" : "rejected",
              reviewedById: userId,
              reviewedAt: new Date(),
              rejectionReason: action === "reject" ? rejectionReason : null,
            })
            .where(
              and(
                eq(playgroundEditSuggestions.id, id),
                eq(playgroundEditSuggestions.status, "pending"),
              ),
            )
            .returning();

          if (!updated) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Edit suggestion has already been reviewed",
            });
          }

          if (action === "approve") {
            await tx
              .update(playgrounds)
              .set(updateData)
              .where(eq(playgrounds.id, editSuggestion.playgroundId));

            if (resolvedEquipmentIds !== undefined) {
              await tx
                .delete(playgroundEquipment)
                .where(eq(playgroundEquipment.playgroundId, editSuggestion.playgroundId));

              if (resolvedEquipmentIds.length > 0) {
                await tx.insert(playgroundEquipment).values(
                  resolvedEquipmentIds.map((equipmentId) => ({
                    playgroundId: editSuggestion.playgroundId,
                    equipmentId,
                  })),
                );
              }
            }
          }

          return updated;
        });

        // Image cleanup runs only after the transaction commits
        if (action === "approve") {
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

        if (action === "approve") {
          revalidatePublicPlaygroundPages(editSuggestion.playgroundId);
        }
        return updatedSuggestion;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        if (isPgForeignKeyViolation(error)) {
          mapMutationError(error);
        }
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
    requireAdmin(ctx);
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

  getAllEditSuggestions: protectedProcedure
    .input(AdminEditSuggestionListInputSchema)
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const conditions = [];

      if (input?.status) {
        conditions.push(eq(playgroundEditSuggestions.status, input.status));
      }
      if (input?.playgroundId !== undefined) {
        conditions.push(eq(playgroundEditSuggestions.playgroundId, input.playgroundId));
      }

      const allSuggestions = await ctx.db.query.playgroundEditSuggestions.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (suggestions, { desc }) => [desc(suggestions.createdAt)],
        limit: input?.limit ?? DEFAULT_ADMIN_PAGE_LIMIT,
        offset: input?.offset ?? 0,
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

      const uniqueEquipmentIds = dedupeIds(equipmentIds);

      let updatedPlayground;
      try {
        updatedPlayground = await ctx.db.transaction(async (tx) => {
          // Re-check ownership + pending in the WHERE so an admin review that
          // lands after the read above is not overwritten.
          const [updated] = await tx
            .update(playgrounds)
            .set({
              ...updateData,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(playgrounds.id, id),
                eq(playgrounds.createdById, userId),
                eq(playgrounds.status, "pending"),
              ),
            )
            .returning();

          if (!updated) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Playground has already been reviewed or modified",
            });
          }

          await tx
            .delete(playgroundEquipment)
            .where(eq(playgroundEquipment.playgroundId, id));

          if (uniqueEquipmentIds.length > 0) {
            await tx.insert(playgroundEquipment).values(
              uniqueEquipmentIds.map((equipmentId) => ({
                playgroundId: id,
                equipmentId,
              })),
            );
          }

          return updated;
        });
      } catch (error) {
        mapMutationError(error);
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

      const uniqueEquipmentIds =
        equipmentIds !== undefined ? dedupeIds(equipmentIds) : undefined;

      let updatedSuggestion;
      try {
        updatedSuggestion = await ctx.db.transaction(async (tx) => {
          // Re-check ownership + pending in the WHERE so an admin review that
          // lands after the read above is not overwritten.
          const [updated] = await tx
            .update(playgroundEditSuggestions)
            .set({
              ...suggestionData,
              coverImage: coverImageValue,
              equipmentIds: uniqueEquipmentIds,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(playgroundEditSuggestions.id, id),
                eq(playgroundEditSuggestions.createdById, userId),
                eq(playgroundEditSuggestions.status, "pending"),
              ),
            )
            .returning();

          if (!updated) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Edit suggestion has already been reviewed or modified",
            });
          }

          await tx
            .delete(playgroundEditSuggestionEquipment)
            .where(eq(playgroundEditSuggestionEquipment.suggestionId, id));

          if (uniqueEquipmentIds && uniqueEquipmentIds.length > 0) {
            await tx.insert(playgroundEditSuggestionEquipment).values(
              uniqueEquipmentIds.map((equipmentId) => ({
                suggestionId: id,
                equipmentId,
              })),
            );
          }

          return updated;
        });
      } catch (error) {
        mapMutationError(error);
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
      const callerIsAdmin = isSessionAdmin(ctx);

      if (callerIsAdmin) {
        // Admins can directly update live approved playgrounds
        const coverImage = playground.coverImage ?? uniqueNewImages[0] ?? null;
        const blurData = await buildPlaygroundBlurData(
          coverImage,
          combinedImages,
          playground.imageBlurData ?? {},
        );

        await ctx.db.transaction(async (tx) => {
          // Lock the row and confirm nobody changed the photos since the read
          // above; otherwise a concurrent addPhotos would be silently lost.
          // Placeholders were built before the transaction because that
          // downloads images.
          const [locked] = await tx
            .select({ images: playgrounds.images, coverImage: playgrounds.coverImage })
            .from(playgrounds)
            .where(eq(playgrounds.id, id))
            .for("update");

          if (!locked) {
            throw playgroundNotFoundError(id);
          }

          const lockedImages = locked.images ?? [];
          if (
            locked.coverImage !== playground.coverImage ||
            lockedImages.length !== existingImages.length ||
            lockedImages.some((img, i) => img !== existingImages[i])
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Playground photos changed while saving, please try again",
            });
          }

          await tx
            .update(playgrounds)
            .set({
              images: combinedImages,
              coverImage,
              ...blurData,
              updatedAt: new Date(),
            })
            .where(eq(playgrounds.id, id));
        });

        logger.info("Admin added photos directly to playground", {
          component: "PlaygroundRouter",
          action: "add_photos_direct",
          userId,
          metadata: { playgroundId: id, addedCount: uniqueNewImages.length },
        });

        revalidatePublicPlaygroundPages(id);
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
