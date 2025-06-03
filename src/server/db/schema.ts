// schema.ts
import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTableCreator,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
  doublePrecision,
  boolean,
  json,
  pgEnum,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `leikvellir_v2_${name}`);

// Enum for playground submission status
export const playgroundStatusEnum = pgEnum("playground_status", [
  "pending",
  "approved",
  "rejected"
]);

// Enum for user roles
export const userRoleEnum = pgEnum("user_role", [
  "user",
  "admin",
  "super_admin"
]);

// Enum for equipment categories
export const equipmentCategoryEnum = pgEnum("equipment_category", [
  "core_equipment",
  "climbing_and_movement",
  "imaginative_and_themed",
  "spinning_and_motion",
  "fitness_and_obstacle",
  "toddler_friendly",
  "additional_common_equipment"
]);

// Equipment table for managing playground equipment types
export const equipment = createTable(
  "equipment",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(), // Translation key (e.g., "equipment.slide")
    category: equipmentCategoryEnum("category").notNull(),
    image: varchar("image", { length: 512 }), // Optional equipment image URL
    description: text("description"), // Optional description translation key
    isActive: boolean("is_active").notNull().default(true), // For soft deletion
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    nameIdx: index("equipment_name_idx").on(table.name),
    categoryIdx: index("equipment_category_idx").on(table.category),
    isActiveIdx: index("equipment_is_active_idx").on(table.isActive),
  }),
);

// Junction table for playground-equipment many-to-many relationship
export const playgroundEquipment = createTable(
  "playground_equipment",
  {
    playgroundId: integer("playground_id")
      .notNull()
      .references(() => playgrounds.id, { onDelete: "cascade" }),
    equipmentId: integer("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playgroundId, table.equipmentId] }),
    playgroundIdx: index("playground_equipment_playground_idx").on(table.playgroundId),
    equipmentIdx: index("playground_equipment_equipment_idx").on(table.equipmentId),
  }),
);

export const playgrounds = createTable(
  "playground",
  {
    id: serial("id").primaryKey(),
    title: varchar("name", { length: 256 }).notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    municipality: varchar("municipality", { length: 256 }), // Municipality where playground is located
    publiclyAccessible: boolean("publicly_accessible").notNull().default(true),
    toddlerFriendly: boolean("toddler_friendly").notNull().default(false),
    coverImage: varchar("cover_image", { length: 512 }), // Cover image URL
    images: json("images").$type<string[]>().default([]), // JSON array of image URLs
    status: playgroundStatusEnum("status").notNull().default("pending"), // Submission status
    reviewedById: varchar("reviewed_by", { length: 255 })
      .references(() => users.id), // Admin who reviewed the submission
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }), // When it was reviewed
    rejectionReason: text("rejection_reason"), // Reason for rejection (if rejected)
    createdById: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (example) => ({
    titleIdx: index("playground_title_idx").on(example.title),
    statusIdx: index("playground_status_idx").on(example.status),
    municipalityIdx: index("playground_municipality_idx").on(example.municipality),
  }),
);

export const users = createTable("user", {
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  emailVerified: timestamp("email_verified", {
    mode: "date",
    withTimezone: true,
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar("image", { length: 255 }),
  role: userRoleEnum("role").notNull().default("user"),
  isBanned: boolean("is_banned").notNull().default(false),
  bannedAt: timestamp("banned_at", { withTimezone: true }),
  bannedById: varchar("banned_by", { length: 255 }), // Will reference users.id but removing circular ref for now
  banReason: text("ban_reason"),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = createTable(
  "account",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_user_id_idx").on(account.userId),
  }),
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  {
    sessionToken: varchar("session_token", { length: 255 })
      .notNull()
      .primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp("expires", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_user_id_idx").on(session.userId),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// Relations
export const equipmentRelations = relations(equipment, ({ many }) => ({
  playgroundEquipment: many(playgroundEquipment),
}));

export const playgroundEquipmentRelations = relations(playgroundEquipment, ({ one }) => ({
  playground: one(playgrounds, {
    fields: [playgroundEquipment.playgroundId],
    references: [playgrounds.id],
  }),
  equipment: one(equipment, {
    fields: [playgroundEquipment.equipmentId],
    references: [equipment.id],
  }),
}));

export const playgroundsRelations = relations(playgrounds, ({ many, one }) => ({
  playgroundEquipment: many(playgroundEquipment),
  createdBy: one(users, {
    fields: [playgrounds.createdById],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [playgrounds.reviewedById],
    references: [users.id],
  }),
}));
