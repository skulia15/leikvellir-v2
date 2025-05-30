import { unlink } from "fs/promises";
import { join } from "path";

/**
 * Helper function to extract filename from URL
 */
export function extractFilename(url: string): string | null {
    const match = /\/uploads\/playgrounds\/([^/?]+)/.exec(url);
    return match?.[1] ?? null;
}

/**
 * Helper function to delete orphaned image files
 */
export async function deleteOrphanedFiles(oldImages: string[], newImages: string[]): Promise<void> {
    const oldFilenames = oldImages.map(extractFilename).filter((filename): filename is string => filename !== null);
    const newFilenames = newImages.map(extractFilename).filter((filename): filename is string => filename !== null);

    const filesToDelete = oldFilenames.filter(filename => !newFilenames.includes(filename));

    for (const filename of filesToDelete) {
        try {
            const filePath = join(process.cwd(), "public", "uploads", "playgrounds", filename);
            await unlink(filePath);
            console.log(`✅ Deleted orphaned file: ${filename}`);
        } catch (error) {
            // File might not exist or permission issues - log but don't fail the operation
            console.warn(`⚠️ Failed to delete file ${filename}:`, error);
        }
    }
}

/**
 * Clean up files by URL
 */
export async function deleteFileByUrl(url: string): Promise<boolean> {
    const filename = extractFilename(url);
    if (!filename) {
        console.warn(`⚠️ Could not extract filename from URL: ${url}`);
        return false;
    }

    try {
        const filePath = join(process.cwd(), "public", "uploads", "playgrounds", filename);
        await unlink(filePath);
        console.log(`✅ Deleted file: ${filename}`);
        return true;
    } catch (error) {
        console.warn(`⚠️ Failed to delete file ${filename}:`, error);
        return false;
    }
} 