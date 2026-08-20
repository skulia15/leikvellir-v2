// types.ts
import { z } from "zod";
import type {
  playgrounds,
  equipment,
  playgroundEditSuggestions
} from "./server/db/schema";
import {
  schoolTypeEnum,
  equipmentCategoryEnum,
  userRoleEnum,
  playgroundStatusEnum,
  editSuggestionStatusEnum
} from "./server/db/schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Schema-derived enum types for type safety
export type UserRole = typeof userRoleEnum.enumValues[number];
export type SchoolType = typeof schoolTypeEnum.enumValues[number];
export type EquipmentCategory = typeof equipmentCategoryEnum.enumValues[number];
export type PlaygroundStatus = typeof playgroundStatusEnum.enumValues[number];
export type EditSuggestionStatus = typeof editSuggestionStatusEnum.enumValues[number];

// Branded types for type safety
export type Latitude = number & { __brand: "latitude" };
export type Longitude = number & { __brand: "longitude" };
export type PlaygroundId = number & { __brand: "playgroundId" };
export type EquipmentId = number & { __brand: "equipmentId" };
export type UserId = string & { __brand: "userId" };

export type Coordinates = {
  latitude: Latitude;
  longitude: Longitude;
};

// Type guards for runtime validation
export const isValidLatitude = (lat: number): lat is Latitude =>
  lat >= -90 && lat <= 90;

export const isValidLongitude = (lng: number): lng is Longitude =>
  lng >= -180 && lng <= 180;

export const isValidCoordinates = (coords: { latitude: number; longitude: number }): coords is Coordinates =>
  isValidLatitude(coords.latitude) && isValidLongitude(coords.longitude);


// Edit suggestion type derived from database schema
export type PlaygroundEditSuggestion = InferSelectModel<typeof playgroundEditSuggestions> & {
  // Relationships
  playground?: Playground;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  reviewedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

export type NewPlaygroundEditSuggestion = InferInsertModel<typeof playgroundEditSuggestions>;

// Schema utilities for type-safe validation
export const SchoolTypeSchema = z.enum(schoolTypeEnum.enumValues);
export const EquipmentCategorySchema = z.enum(equipmentCategoryEnum.enumValues);
export const UserRoleSchema = z.enum(userRoleEnum.enumValues);
export const PlaygroundStatusSchema = z.enum(playgroundStatusEnum.enumValues);
export const EditSuggestionStatusSchema = z.enum(editSuggestionStatusEnum.enumValues);

// Review action schema
export const ReviewActionSchema = z.enum(["approve", "reject"]);
export type ReviewAction = z.infer<typeof ReviewActionSchema>;


// Schema for creating edit suggestions
export const CreateEditSuggestionSchema = z.object({
  playgroundId: z.number(),
  // Only include fields that are being changed (all optional)
  title: z.string().min(1).max(256).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  municipality: z.string().max(256).nullable().optional(),
  publiclyAccessible: z.boolean().optional(),
  toddlerFriendly: z.boolean().optional(),
  // School ground properties
  isSchoolGround: z.boolean().optional(),
  schoolType: SchoolTypeSchema.nullable().optional(),
  // Amenity properties
  hasSeating: z.boolean().optional(),
  hasPicnicTable: z.boolean().optional(),
  hasFencing: z.boolean().optional(),
  hasGarbageCan: z.boolean().optional(),
  hasBathroomNearby: z.boolean().optional(),
  hasSoftPlayArea: z.boolean().optional(),
  // Equipment and images
  equipmentIds: z.array(z.number()).optional(),
  coverImage: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  // Image removal tracking
  removeImages: z.array(z.boolean()).optional(),
  removeCoverImage: z.boolean().optional(),
  submitAnonymously: z.boolean().optional(),
});

export type CreateEditSuggestionInput = z.infer<typeof CreateEditSuggestionSchema>;


// Multilingual name type for equipment
export type MultilingualName = {
  is: string; // Icelandic (required)
  en?: string; // English (optional)
  pl?: string; // Polish (optional)
};

// Equipment type derived from database schema
export type Equipment = InferSelectModel<typeof equipment>;
export type NewEquipment = InferInsertModel<typeof equipment>;

// Zod schema for runtime validation of coordinates
export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type ValidatedCoordinates = z.infer<typeof CoordinatesSchema>;

// Utility types for better type safety
export type WithId<T> = T & { id: number };
export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date | null;
};
export type WithStatus<T, S = PlaygroundStatus> = T & { status: S };

// Multilingual name validation schema
export const MultilingualNameSchema = z.object({
  is: z.string().min(1, "Icelandic name is required").max(256),
  en: z.string().max(256).optional(),
  pl: z.string().max(256).optional(),
});

// Equipment management schemas
export const CreateEquipmentSchema = z.object({
  name: MultilingualNameSchema,
  category: EquipmentCategorySchema,
  description: z.string().optional(),
  image: z.string().optional(),
});

export const UpdateEquipmentSchema = z.object({
  id: z.number(),
  name: MultilingualNameSchema.optional(),
  category: EquipmentCategorySchema.optional(),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});

export const DeleteEquipmentSchema = z.object({
  id: z.number(),
});

export type CreateEquipmentInput = z.infer<typeof CreateEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof UpdateEquipmentSchema>;
export type DeleteEquipmentInput = z.infer<typeof DeleteEquipmentSchema>;

// User management schemas
export const UpdateUserRoleSchema = z.object({
  userId: z.string(),
  role: UserRoleSchema,
});

export const BanUserSchema = z.object({
  userId: z.string(),
  reason: z.string().min(1, "Ban reason is required"),
});

export const UnbanUserSchema = z.object({
  userId: z.string(),
});

export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;
export type BanUserInput = z.infer<typeof BanUserSchema>;
export type UnbanUserInput = z.infer<typeof UnbanUserSchema>;


// export const PlaygroundOutput = z.object({

//   id: z.number(),
//   title: z.string(),
//   latitude: z.number(),
//   longitude: z.number(),
//   municipality: z.string().nullable(),
// });

// Comprehensive playground creation schema
export const CreatePlaygroundSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(256, "Title must be less than 256 characters"),
  ...CoordinatesSchema.shape,
  municipality: z.string().max(256).nullable().optional(),
  publiclyAccessible: z.boolean(),
  toddlerFriendly: z.boolean(),
  // School ground properties
  isSchoolGround: z.boolean(),
  schoolType: SchoolTypeSchema.nullable(),
  // schoolType: z.enum(["preschool", "elementary"]).nullish(),

  // Amenity properties
  hasSeating: z.boolean(),
  hasPicnicTable: z.boolean(),
  hasFencing: z.boolean(),
  hasGarbageCan: z.boolean(),
  hasBathroomNearby: z.boolean(),
  hasSoftPlayArea: z.boolean(),
  submitAnonymously: z.boolean(),
  equipmentIds: z.array(z.number()),
  images: z
    .array(
      z.string().refine((str) => {
        // Accept empty strings (they'll be filtered out)
        if (!str || str.trim() === '') {
          return true; // Let the frontend filter these out
        }

        // Accept uploaded image paths
        if (str.startsWith("/uploads/playgrounds/")) {
          return true;
        }

        // Accept other valid upload paths
        if (str.startsWith("/uploads/")) {
          return true;
        }

        // Accept only Vercel Blob Storage URLs
        if (str.includes(".public.blob.vercel-storage.com/")) {
          return true;
        }

        return false;
      }, "Must be a valid URL or upload path"),
    ),
});

export type CreatePlaygroundInput = z.infer<typeof CreatePlaygroundSchema>;

/**
 * Columns the public `playground.getAll` payload leaves out: moderation data
 * that only admin views read, plus the per-image blur map, which is only needed
 * by the detail view. Sending either for every playground on the map is pure
 * weight, so they are optional rather than guaranteed.
 */
type PlaygroundModerationColumns =
  | "updatedAt"
  | "reviewedById"
  | "reviewedAt"
  | "rejectionReason"
  | "submitAnonymously"
  | "imageBlurData";

type PlaygroundColumns = InferSelectModel<typeof playgrounds>;

// Playground types derived from database schema
export type Playground = Omit<PlaygroundColumns, PlaygroundModerationColumns> &
  Partial<Pick<PlaygroundColumns, PlaygroundModerationColumns>> & {
  // Equipment relationships. `getAll` selects only the fields the map and list
  // render; the detail page (`getById`) still gets the full equipment record.
  playgroundEquipment?: Array<{
    createdAt?: Date;
    playgroundId: number;
    equipmentId: number;
    equipment: Pick<Equipment, "id" | "name" | "category"> & Partial<Equipment>;
  }>;
  // User relationships
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  reviewedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

export type NewPlayground = InferInsertModel<typeof playgrounds>;

// PlaygroundInput type used specifically for form submissions
// Improved type for form submissions
export type PlaygroundInput = Omit<
  Playground,
  "id" | "createdById" | "createdAt" | "updatedAt" | "status" | "reviewedById" | "reviewedAt" | "rejectionReason" | "playgroundEquipment" | "createdBy" | "reviewedBy"
>;

// Review decision schema
export const ReviewPlaygroundSchema = z.object({
  id: z.number(),
  action: ReviewActionSchema,
  rejectionReason: z.string().optional(),
  // Allow editing playground details during review
  title: z.string().min(1).max(256).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  municipality: z.string().max(256).nullish(),
  publiclyAccessible: z.boolean().optional(),
  toddlerFriendly: z.boolean().optional(),
  // School ground properties
  isSchoolGround: z.boolean().optional(),
  schoolType: SchoolTypeSchema.nullable().optional(),
  // schoolType: z.enum(["preschool", "elementary"]).nullish(),
  // Amenity properties
  hasSeating: z.boolean().optional(),
  hasPicnicTable: z.boolean().optional(),
  hasFencing: z.boolean().optional(),
  hasGarbageCan: z.boolean().optional(),
  hasBathroomNearby: z.boolean().optional(),
  hasSoftPlayArea: z.boolean().optional(),
  equipmentIds: z.array(z.number()).optional(),
  coverImage: z.string().nullish(),
  images: z.array(z.string()).optional(),
  submitAnonymously: z.boolean().optional(),
});

export type ReviewPlaygroundInput = z.infer<typeof ReviewPlaygroundSchema>;

// Update schema for playground editing
export const UpdatePlaygroundSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required").max(256, "Title too long"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  municipality: z.string().max(256).optional(),
  publiclyAccessible: z.boolean(),
  toddlerFriendly: z.boolean(),
  // School ground properties
  isSchoolGround: z.boolean(),
  schoolType: SchoolTypeSchema.nullable(),
  // Amenity properties
  hasSeating: z.boolean().optional(),
  hasPicnicTable: z.boolean().optional(),
  hasFencing: z.boolean().optional(),
  hasGarbageCan: z.boolean().optional(),
  hasBathroomNearby: z.boolean().optional(),
  hasSoftPlayArea: z.boolean().optional(),
  equipmentIds: z.array(z.number()).default([]),
  coverImage: z.string().nullable().optional(),
  images: z.array(z.string()),
});

export type UpdatePlaygroundInput = z.infer<typeof UpdatePlaygroundSchema>;


// Schema for reviewing edit suggestions
export const ReviewEditSuggestionSchema = z.object({
  id: z.number(),
  action: ReviewActionSchema,
  rejectionReason: z.string().optional(),
  // Allow reviewer to modify the final values before approval
  finalValues: z.object({
    title: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    municipality: z.string().optional(),
    publiclyAccessible: z.boolean().optional(),
    toddlerFriendly: z.boolean().optional(),
    isSchoolGround: z.boolean().optional(),
    schoolType: SchoolTypeSchema.nullable().optional(),
    hasSeating: z.boolean().optional(),
    hasPicnicTable: z.boolean().optional(),
    hasFencing: z.boolean().optional(),
    hasGarbageCan: z.boolean().optional(),
    hasBathroomNearby: z.boolean().optional(),
    hasSoftPlayArea: z.boolean().optional(),
    coverImage: z.string().nullable().optional(),
    images: z.array(z.string()).optional(),
    equipmentIds: z.array(z.number()).optional(),
  }).optional(),
});

export type ReviewEditSuggestionInput = z.infer<typeof ReviewEditSuggestionSchema>;

// Schema for users updating their own pending submission
export const UpdateMySubmissionSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required").max(256, "Title too long"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  municipality: z.string().max(256).nullable().optional(),
  publiclyAccessible: z.boolean(),
  toddlerFriendly: z.boolean(),
  // School ground properties
  isSchoolGround: z.boolean(),
  schoolType: SchoolTypeSchema.nullable(),
  // Amenity properties
  hasSeating: z.boolean(),
  hasPicnicTable: z.boolean(),
  hasFencing: z.boolean(),
  hasGarbageCan: z.boolean(),
  hasBathroomNearby: z.boolean(),
  hasSoftPlayArea: z.boolean(),
  equipmentIds: z.array(z.number()),
  coverImage: z.string().nullable().optional(),
  images: z.array(z.string()),
  submitAnonymously: z.boolean(),
});

export type UpdateMySubmissionInput = z.infer<typeof UpdateMySubmissionSchema>;

// Schema for users updating their own pending edit suggestion
export const UpdateMyEditSuggestionSchema = CreateEditSuggestionSchema.extend({
  id: z.number(),
});

export type UpdateMyEditSuggestionInput = z.infer<typeof UpdateMyEditSuggestionSchema>;

// Custom error types
export class PlaygroundNotFoundError extends Error {
  constructor(id: number) {
    super(`Playground with id ${id} not found`);
    this.name = "PlaygroundNotFoundError";
  }
}
