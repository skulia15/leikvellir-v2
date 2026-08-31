import { eq, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { UpdateUserRoleSchema, BanUserSchema, UnbanUserSchema } from "~/types";
import { TRPCError } from "@trpc/server";
import { getUserById } from "~/server/api/current-user";

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

        // Auto-promote first user to super admin if no super admins exist
        // if (currentUser.role === "user") {
        //     const superAdminCount = await ctx.db
        //         .select()
        //         .from(users)
        //         .where(eq(users.role, "super_admin"));

        //     if (superAdminCount.length === 0) {
        //         // Promote this user to super admin
        //         const promotedUser = await ctx.db
        //             .update(users)
        //             .set({ role: "super_admin" })
        //             .where(eq(users.id, ctx.session.user.id))
        //             .returning();

        //         return promotedUser[0] ?? currentUser;
        //     }
        // }

        return currentUser;
    }),

    // Get all users (super admin only)
    getAll: protectedProcedure.query(async ({ ctx }) => {
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

        return await ctx.db.query.users.findMany({
            orderBy: [desc(users.role), desc(users.name)],
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

            // Prevent demoting the last super admin
            if (input.role !== "super_admin") {
                const superAdminCount = await ctx.db
                    .select()
                    .from(users)
                    .where(eq(users.role, "super_admin"));

                if (superAdminCount.length === 1 && input.userId === ctx.session.user.id) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Cannot demote the last super admin",
                    });
                }
            }

            const updatedUser = await ctx.db
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

            // Get target user to check permissions
            const targetUser = await ctx.db.query.users.findFirst({
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

            const bannedUser = await ctx.db
                .update(users)
                .set({
                    isBanned: true,
                    bannedAt: new Date(),
                    bannedById: ctx.session.user.id,
                    banReason: input.reason,
                })
                .where(eq(users.id, input.userId))
                .returning();

            return bannedUser[0];
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