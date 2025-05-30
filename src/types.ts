// types.ts
import { z } from "zod";

// Branded types for coordinates
export type Latitude = number & { __brand: "latitude" };
export type Longitude = number & { __brand: "longitude" };

export type Coordinates = {
  latitude: Latitude;
  longitude: Longitude;
};

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
        // Accept either a valid URL or a relative path starting with /
        try {
          new URL(str); // Will throw if not a valid absolute URL
          return true;
        } catch (e) {
          // Check if it's a valid relative path
          return str.startsWith("/uploads/");
        }
      }, "Must be a valid URL or path"),
    )
    .default([]),
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
};

// PlaygroundInput type used specifically for form submissions
export type PlaygroundInput = Omit<
  Playground,
  "id" | "createdById" | "createdAt" | "updatedAt"
>;

// Custom error types
export class PlaygroundNotFoundError extends Error {
  constructor(id: number) {
    super(`Playground with id ${id} not found`);
    this.name = "PlaygroundNotFoundError";
  }
}
