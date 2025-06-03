// types.ts
import { z } from "zod";

// User role types
export type UserRole = "user" | "admin" | "super_admin";

// Equipment category types
export type EquipmentCategory =
  | "core_equipment"
  | "climbing_and_movement"
  | "imaginative_and_themed"
  | "spinning_and_motion"
  | "fitness_and_obstacle"
  | "toddler_friendly"
  | "additional_common_equipment";

// Branded types for coordinates
export type Latitude = number & { __brand: "latitude" };
export type Longitude = number & { __brand: "longitude" };

export type Coordinates = {
  latitude: Latitude;
  longitude: Longitude;
};

// Playground status enum
export type PlaygroundStatus = "pending" | "approved" | "rejected";

// Equipment type
export type Equipment = {
  id: number;
  name: string; // Translation key (e.g., "equipment.slide")
  category: EquipmentCategory;
  image: string | null;
  description: string | null; // Optional description translation key
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

// Zod schema for runtime validation of coordinates
export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type ValidatedCoordinates = z.infer<typeof CoordinatesSchema>;

// Equipment management schemas
export const CreateEquipmentSchema = z.object({
  name: z.string().min(1, "Playground equipment name key is required").max(256),
  category: z.enum([
    "core_equipment",
    "climbing_and_movement",
    "imaginative_and_themed",
    "spinning_and_motion",
    "fitness_and_obstacle",
    "toddler_friendly",
    "additional_common_equipment"
  ]),
  description: z.string().optional(),
  image: z.string().optional(),
});

export const UpdateEquipmentSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(256).optional(),
  category: z.enum([
    "core_equipment",
    "climbing_and_movement",
    "imaginative_and_themed",
    "spinning_and_motion",
    "fitness_and_obstacle",
    "toddler_friendly",
    "additional_common_equipment"
  ]).optional(),
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
  role: z.enum(["user", "admin", "super_admin"]),
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

// Comprehensive playground creation schema
export const CreatePlaygroundSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(256, "Title must be less than 256 characters"),
  ...CoordinatesSchema.shape,
  municipality: z.string().max(256).optional(),
  publiclyAccessible: z.boolean(),
  toddlerFriendly: z.boolean(),
  // Amenity properties
  hasSeating: z.boolean(),
  hasPicnicTable: z.boolean(),
  hasFencing: z.boolean(),
  hasGarbageCan: z.boolean(),
  hasBathroomNearby: z.boolean(),
  hasSoftPlayArea: z.boolean(),
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

        // Accept valid absolute URLs
        try {
          new URL(str);
          return true;
        } catch {
          return false;
        }
      }, "Must be a valid URL or upload path"),
    ),
});

export type CreatePlaygroundInput = z.infer<typeof CreatePlaygroundSchema>;

export type Playground = {
  id: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date | null;
  title: string;
  latitude: number;
  longitude: number;
  municipality: string | null;
  publiclyAccessible: boolean;
  toddlerFriendly: boolean;
  // Amenity properties
  hasSeating: boolean;
  hasPicnicTable: boolean;
  hasFencing: boolean;
  hasGarbageCan: boolean;
  hasBathroomNearby: boolean;
  hasSoftPlayArea: boolean;
  coverImage: string | null;
  images: string[] | null;
  status: PlaygroundStatus;
  reviewedById: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  // Equipment relationships
  playgroundEquipment?: Array<{
    createdAt: Date;
    playgroundId: number;
    equipmentId: number;
    equipment: Equipment;
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

// PlaygroundInput type used specifically for form submissions
export type PlaygroundInput = Omit<
  Playground,
  "id" | "createdById" | "createdAt" | "updatedAt" | "status" | "reviewedById" | "reviewedAt" | "rejectionReason"
>;

// Review decision schema
export const ReviewPlaygroundSchema = z.object({
  id: z.number(),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
  // Allow editing playground details during review
  title: z.string().min(1).max(256).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  municipality: z.string().max(256).optional(),
  publiclyAccessible: z.boolean().optional(),
  toddlerFriendly: z.boolean().optional(),
  // Amenity properties
  hasSeating: z.boolean().optional(),
  hasPicnicTable: z.boolean().optional(),
  hasFencing: z.boolean().optional(),
  hasGarbageCan: z.boolean().optional(),
  hasBathroomNearby: z.boolean().optional(),
  hasSoftPlayArea: z.boolean().optional(),
  coverImage: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
});

export type ReviewPlaygroundInput = z.infer<typeof ReviewPlaygroundSchema>;

// Custom error types
export class PlaygroundNotFoundError extends Error {
  constructor(id: number) {
    super(`Playground with id ${id} not found`);
    this.name = "PlaygroundNotFoundError";
  }
}
