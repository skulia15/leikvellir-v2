import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if code is running in browser environment
 */
export const isBrowser = () => typeof window !== "undefined";

/**
 * Check if code is running on server
 */
export const isServer = () => typeof window === "undefined";
