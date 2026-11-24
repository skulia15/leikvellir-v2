import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import {
    UpdateUserRoleSchema,
    BanUserSchema,
    UnbanUserSchema,
    UserRoleSchema,
} from "~/types";
import { TRPCError } from "@trpc/server";
import { getUserById } from "~/server/api/current-user";

const DEFAULT_ADMIN_PAGE_LIMIT = 200;
const MAX_ADMIN_PAGE_LIMIT = 500;

const GetAllUsersInputSchema = z
    .object({
        limit: z.number().int().min(1).max(MAX_ADMIN_PAGE_LIMIT).optional(),
        offset: z.number().int().min(0).optional(),
        role: UserRoleSchema.optional(),
        search: z.string().trim().min(1).max(200).optional(),
    })
    .optional();

function escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, "\\$&");
}

export const usersRouter = createTRPCRouter({
    // Get current user info (any authenticated user)
    getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
        // Shared request-scoped lookup, so an admin page that also runs
        // `requireAdmin` in its procedures only hits the database once.
        const currentUser = await getUserById(ctx, ctx.session.user.id);

        if (!currentUser) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "User not found",
            });
        }

        return currentUser;
    }),

    // Get all users (super admin only) with bounded pagination & optional filters
    getAll: protectedProcedure
        .input(GetAllUsersInputSchema)
        .query(async ({ ctx, input }) => {
            // Check if user is super admin
            const currentUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, ctx.session.user.id),
            });

            if (!currentUser || currentUser.role !== "super_admin") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only super admins can access user management",
                });
            }

            const limit = input?.limit ?? DEFAULT_ADMIN_PAGE_LIMIT;
            const offset = input?.offset ?? 0;
            const conditions = [];

            if (input?.role) {
                conditions.push(eq(users.role, input.role));
            }
            if (input?.search) {
                const pattern = `%${escapeLikePattern(input.search)}%`;
                conditions.push(
                    or(ilike(users.name, pattern), ilike(users.email, pattern)),
                );
            }

            return await ctx.db.query.users.findMany({
                where: conditions.length > 0 ? and(...conditions) : undefined,
                orderBy: [desc(users.role), desc(users.name)],
                limit,
                offset,
            });
        }),

    // Update user role (super admin only)
    updateRole: protectedProcedure
        .input(UpdateUserRoleSchema)
        .mutation(async ({ ctx, input }) => {
            // Check if user is super admin
            const currentUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, ctx.session.user.id),
            });

            if (!currentUser || currentUser.role !== "super_admin") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only super admins can update user roles",
                });
            }

            return await ctx.db.transaction(async (tx) => {
                // Prevent demoting the last super admin (serialized with transaction-scoped advisory lock)
                if (input.role !== "super_admin") {
                    await tx.execute(
                        sql`SELECT pg_advisory_xact_lock(hashtext('users_super_admin_role'))`,
                    );

                    const [countRow] = await tx
                        .select({ count: count() })
                        .from(users)
                        .where(eq(users.role, "super_admin"));

                    const superAdminCount = Number(countRow?.count ?? 0);

                    if (superAdminCount <= 1) {
                        if (input.userId === ctx.session.user.id) {
                            throw new TRPCError({
                                code: "BAD_REQUEST",
                                message: "Cannot demote the last super admin",
                            });
                        }

                        const targetUser = await tx.query.users.findFirst({
                            where: eq(users.id, input.userId),
                            columns: { role: true },
                        });

                        if (targetUser?.role === "super_admin") {
                            throw new TRPCError({
                                code: "BAD_REQUEST",
                                message: "Cannot demote the last super admin",
                            });
                        }
                    }
                }

                const updatedUser = await tx
                    .update(users)
                    .set({ role: input.role })
                    .where(eq(users.id, input.userId))
                    .returning();

                if (!updatedUser[0]) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "User not found",
                    });
                }

                return updatedUser[0];
            });
        }),

    // Ban user (admin or super admin only)
    banUser: protectedProcedure
        .input(BanUserSchema)
        .mutation(async ({ ctx, input }) => {
            // Check if user is admin or super admin
            const currentUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, ctx.session.user.id),
            });

            if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can ban users",
                });
            }

            return await ctx.db.transaction(async (tx) => {
                // Get target user to check permissions atomically with the ban write
                const targetUser = await tx.query.users.findFirst({
                    where: eq(users.id, input.userId),
                });

                if (!targetUser) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "User not found",
                    });
                }

                // Prevent banning other admins unless you're a super admin
                if (targetUser.role === "admin" && currentUser.role !== "super_admin") {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Only super admins can ban other admins",
                    });
                }

                // Prevent banning super admins
                if (targetUser.role === "super_admin") {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Cannot ban super admins",
                    });
                }

                // Prevent self-banning
                if (input.userId === ctx.session.user.id) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Cannot ban yourself",
                    });
                }

                const bannedUser = await tx
                    .update(users)
                    .set({
                        isBanned: true,
                        bannedAt: new Date(),
                        bannedById: ctx.session.user.id,
                        banReason: input.reason,
                    })
                    .where(eq(users.id, input.userId))
                    .returning();

                if (!bannedUser[0]) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "User not found",
                    });
                }

                return bannedUser[0];
            });
        }),

    // Unban user (admin or super admin only)
    unbanUser: protectedProcedure
        .input(UnbanUserSchema)
        .mutation(async ({ ctx, input }) => {
            // Check if user is admin or super admin
            const currentUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, ctx.session.user.id),
            });

            if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can unban users",
                });
            }

            const unbannedUser = await ctx.db
                .update(users)
                .set({
                    isBanned: false,
                    bannedAt: null,
                    bannedById: null,
                    banReason: null,
                })
                .where(eq(users.id, input.userId))
                .returning();

            if (!unbannedUser[0]) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            return unbannedUser[0];
        }),
}); 