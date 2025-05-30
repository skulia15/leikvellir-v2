// types.ts
import { z } from "zod";

// Branded types for coordinates
export type Latitude = number & { __brand: "latitude" };
export type Longitude = number & { __brand: "longitude" };

export type Coordinates = {
  latitude: Latitude;
  longitude: Longitude;
};

// Playground status enum
export type PlaygroundStatus = "pending" | "approved" | "rejected";

// Zod schema for runtime validation of coordinates
export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type ValidatedCoordinates = z.infer<typeof CoordinatesSchema>;

// Comprehensive playground creation schema
export const CreatePlaygroundSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(256, "Title must be less than 256 characters"),
  ...CoordinatesSchema.shape,
  publiclyAccessible: z.boolean(),
  toddlerFriendly: z.boolean(),
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
        } catch (_e) {
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
  publiclyAccessible: boolean;
  toddlerFriendly: boolean;
  coverImage: string | null;
  images: string[] | null;
  status: PlaygroundStatus;
  reviewedById: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
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
  publiclyAccessible: z.boolean().optional(),
  toddlerFriendly: z.boolean().optional(),
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
