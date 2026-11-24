import { eq, sql } from "drizzle-orm";
import { ADMIN_ROLES, createTRPCRouter, protectedProcedure, publicProcedure, requireRole } from "~/server/api/trpc";
import { equipment } from "~/server/db/schema";
import { CreateEquipmentSchema, UpdateEquipmentSchema, DeleteEquipmentSchema, type EquipmentCategory, type MultilingualName } from "~/types";
import { TRPCError } from "@trpc/server";
import { revalidatePublicPlaygroundPages } from "~/server/cache/revalidate";

export const equipmentRouter = createTRPCRouter({
    // Get all active equipment (public)
    getAll: publicProcedure.query(async ({ ctx }) => {
        return await ctx.db.query.equipment.findMany({
            where: eq(equipment.isActive, true),
            orderBy: [equipment.category, sql`${equipment.name}->>'is'`],
        });
    }),

    /**
     * Every equipment row, active or not, with just the fields needed to render
     * a playground's equipment. `playground.getAll` returns bare equipmentIds
     * and the client joins against this, so the 39 distinct equipment records
     * ship once instead of being inlined into all 659 playground links.
     *
     * Deliberately not filtered by `isActive`: that flag governs whether an
     * item can be newly selected, not whether existing links render. At least
     * one deactivated item is still referenced by approved playgrounds, and
     * filtering here would make it silently disappear from their cards.
     */
    getCatalog: publicProcedure.query(async ({ ctx }) => {
        return await ctx.db.query.equipment.findMany({
            columns: { id: true, name: true, category: true },
            orderBy: [equipment.category, sql`${equipment.name}->>'is'`],
        });
    }),

    // Get all equipment including inactive (admin only)
    getAllAdmin: protectedProcedure.query(async ({ ctx }) => {
        requireRole(ctx.session.user, ADMIN_ROLES, "Only admins can access all equipment");

        return await ctx.db.query.equipment.findMany({
            orderBy: [equipment.category, sql`${equipment.name}->>'is'`],
        });
    }),

    // Get equipment by category (public)
    getByCategory: publicProcedure
        .input(CreateEquipmentSchema.pick({ category: true }))
        .query(async ({ ctx, input }) => {
            return await ctx.db.query.equipment.findMany({
                where: eq(equipment.category, input.category),
                orderBy: [sql`${equipment.name}->>'is'`],
            });
        }),

    // Get single equipment by ID (public)
    getById: publicProcedure
        .input(DeleteEquipmentSchema)
        .query(async ({ ctx, input }) => {
            const equipmentItem = await ctx.db.query.equipment.findFirst({
                where: eq(equipment.id, input.id),
            });

            if (!equipmentItem) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Equipment not found",
                });
            }

            return equipmentItem;
        }),

    // Create equipment (admin only)
    create: protectedProcedure
        .input(CreateEquipmentSchema)
        .mutation(async ({ ctx, input }) => {
            requireRole(ctx.session.user, ADMIN_ROLES, "Only admins can create equipment");

            const newEquipment = await ctx.db
                .insert(equipment)
                .values({
                    name: input.name,
                    category: input.category,
                    description: input.description || null,
                    image: input.image || null,
                })
                .returning();

            revalidatePublicPlaygroundPages();
            return newEquipment[0];
        }),

    // Update equipment (admin only)
    update: protectedProcedure
        .input(UpdateEquipmentSchema)
        .mutation(async ({ ctx, input }) => {
            requireRole(ctx.session.user, ADMIN_ROLES, "Only admins can update equipment");

            // Check if equipment exists
            const existingEquipment = await ctx.db.query.equipment.findFirst({
                where: eq(equipment.id, input.id),
            });

            if (!existingEquipment) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Equipment not found",
                });
            }

            const updateData: Partial<{
                name: MultilingualName;
                category: EquipmentCategory;
                description: string | null;
                image: string | null;
            }> = {};

            if (input.name !== undefined) updateData.name = input.name;
            if (input.category !== undefined) updateData.category = input.category;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.image !== undefined) updateData.image = input.image;

            const updatedEquipment = await ctx.db
                .update(equipment)
                .set(updateData)
                .where(eq(equipment.id, input.id))
                .returning();

            revalidatePublicPlaygroundPages();
            return updatedEquipment[0];
        }),

    // Delete equipment (soft delete - admin only)
    delete: protectedProcedure
        .input(DeleteEquipmentSchema)
        .mutation(async ({ ctx, input }) => {
            requireRole(ctx.session.user, ADMIN_ROLES, "Only admins can delete equipment");

            // Check if equipment exists
            const existingEquipment = await ctx.db.query.equipment.findFirst({
                where: eq(equipment.id, input.id),
            });

            if (!existingEquipment) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Equipment not found",
                });
            }

            // Soft delete by setting isActive to false
            const deletedEquipment = await ctx.db
                .update(equipment)
                .set({ isActive: false })
                .where(eq(equipment.id, input.id))
                .returning();

            revalidatePublicPlaygroundPages();
            return deletedEquipment[0];
        }),

    // Restore equipment (admin only)
    restore: protectedProcedure
        .input(DeleteEquipmentSchema)
        .mutation(async ({ ctx, input }) => {
            requireRole(ctx.session.user, ADMIN_ROLES, "Only admins can restore equipment");

            // Check if equipment exists
            const existingEquipment = await ctx.db.query.equipment.findFirst({
                where: eq(equipment.id, input.id),
            });

            if (!existingEquipment) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Equipment not found",
                });
            }

            // Restore by setting isActive to true
            const restoredEquipment = await ctx.db
                .update(equipment)
                .set({ isActive: true })
                .where(eq(equipment.id, input.id))
                .returning();

            revalidatePublicPlaygroundPages();
            return restoredEquipment[0];
        }),
}); 