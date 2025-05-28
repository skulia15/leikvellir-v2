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
  coverImage: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  images: z.array(z.string().url("Must be a valid URL")).optional(),
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
