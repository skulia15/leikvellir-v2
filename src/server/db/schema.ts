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

// Enum for edit suggestion status
export const editSuggestionStatusEnum = pgEnum("edit_suggestion_status", [
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

// Enum for school types
export const schoolTypeEnum = pgEnum("school_type", [
  "preschool", // leikskóli
  "elementary", // grunnskóli
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
    // School ground properties
    isSchoolGround: boolean("is_school_ground").notNull().default(false), // Whether this is part of school grounds
    schoolType: schoolTypeEnum("school_type"), // Type of school (preschool/elementary) - null if not a school ground
    // Amenity properties
    hasSeating: boolean("has_seating").notNull().default(false), // Bench/seating available
    hasPicnicTable: boolean("has_picnic_table").notNull().default(false), // Picnic table available
    hasFencing: boolean("has_fencing").notNull().default(false), // Fencing around playground
    hasGarbageCan: boolean("has_garbage_can").notNull().default(false), // Garbage can nearby
    hasBathroomNearby: boolean("has_bathroom_nearby").notNull().default(false), // Bathroom facilities nearby
    hasSoftPlayArea: boolean("has_soft_play_area").notNull().default(false), // Soft play area (removed from equipment)
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
    submitAnonymously: boolean("submit_anonymously").notNull().default(false), // Whether to hide submitter name publicly
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
    isSchoolGroundIdx: index("playground_is_school_ground_idx").on(example.isSchoolGround),
    schoolTypeIdx: index("playground_school_type_idx").on(example.schoolType),
  }),
);

// Playground edit suggestions table - for suggesting changes to existing approved playgrounds
export const playgroundEditSuggestions = createTable(
  "playground_edit_suggestion",
  {
    id: serial("id").primaryKey(),
    playgroundId: integer("playground_id")
      .notNull()
      .references(() => playgrounds.id), // The playground being edited
    status: editSuggestionStatusEnum("status").notNull().default("pending"),
    
    // Only include fields that can be changed (nullable - only populated if being changed)
    title: varchar("title", { length: 256 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    municipality: varchar("municipality", { length: 256 }),
    publiclyAccessible: boolean("publicly_accessible"),
    toddlerFriendly: boolean("toddler_friendly"),
    
    // School ground properties
    isSchoolGround: boolean("is_school_ground"),
    schoolType: schoolTypeEnum("school_type"),
    
    // Amenity properties  
    hasSeating: boolean("has_seating"),
    hasPicnicTable: boolean("has_picnic_table"),
    hasFencing: boolean("has_fencing"),
    hasGarbageCan: boolean("has_garbage_can"),
    hasBathroomNearby: boolean("has_bathroom_nearby"),
    hasSoftPlayArea: boolean("has_soft_play_area"),
    
    // Images and metadata
    coverImage: varchar("cover_image", { length: 512 }),
    images: json("images").$type<string[]>(), // Can suggest adding images
    equipmentIds: json("equipment_ids").$type<number[]>(), // Equipment changes
    submitAnonymously: boolean("submit_anonymously"),
    
    // Review fields
    reviewedById: varchar("reviewed_by", { length: 255 })
      .references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    
    // User who suggested the edit
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
  (table) => ({
    playgroundIdIdx: index("playground_edit_suggestion_playground_id_idx").on(table.playgroundId),
    statusIdx: index("playground_edit_suggestion_status_idx").on(table.status),
    createdByIdx: index("playground_edit_suggestion_created_by_idx").on(table.createdById),
  }),
);

// Junction table for playground edit suggestion equipment
export const playgroundEditSuggestionEquipment = createTable(
  "playground_edit_suggestion_equipment",
  {
    suggestionId: integer("suggestion_id")
      .notNull()
      .references(() => playgroundEditSuggestions.id, { onDelete: "cascade" }),
    equipmentId: integer("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.suggestionId, table.equipmentId] }),
    suggestionIdx: index("playground_edit_suggestion_equipment_suggestion_idx").on(table.suggestionId),
    equipmentIdx: index("playground_edit_suggestion_equipment_equipment_idx").on(table.equipmentId),
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

export const playgroundEditSuggestionEquipmentRelations = relations(playgroundEditSuggestionEquipment, ({ one }) => ({
  suggestion: one(playgroundEditSuggestions, {
    fields: [playgroundEditSuggestionEquipment.suggestionId],
    references: [playgroundEditSuggestions.id],
  }),
  equipment: one(equipment, {
    fields: [playgroundEditSuggestionEquipment.equipmentId],
    references: [equipment.id],
  }),
}));

export const playgroundEditSuggestionsRelations = relations(playgroundEditSuggestions, ({ many, one }) => ({
  playground: one(playgrounds, {
    fields: [playgroundEditSuggestions.playgroundId],
    references: [playgrounds.id],
  }),
  suggestionEquipment: many(playgroundEditSuggestionEquipment),
  createdBy: one(users, {
    fields: [playgroundEditSuggestions.createdById],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [playgroundEditSuggestions.reviewedById],
    references: [users.id],
  }),
}));
