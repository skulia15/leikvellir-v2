# File Cleanup System

This document explains how the automatic file cleanup system works in the playground submission review system.

## Overview

When images are removed from a playground during the review process or when a playground is updated, the system automatically cleans up orphaned image files from the filesystem to prevent disk space waste.

## How It Works

### 1. Image Tracking

- All playground images are stored in `public/uploads/playgrounds/`
- Image URLs are stored in the database as relative paths (e.g., `/uploads/playgrounds/filename.jpg`)
- Each playground has an `images` array and a `coverImage` field

### 2. Cleanup Triggers

File cleanup is automatically triggered when:

- A playground is updated via the `update` mutation
- A playground is reviewed (approved/rejected) via the `review` mutation

### 3. Cleanup Process

1. **Before Update**: The system fetches the current playground data from the database
2. **Comparison**: It compares the old image list with the new image list
3. **Identification**: Files that exist in the old list but not in the new list are marked for deletion
4. **Deletion**: Orphaned files are deleted from the filesystem
5. **Error Handling**: If a file doesn't exist or can't be deleted, it logs a warning but doesn't fail the operation

### 4. Implementation Details

#### File Path Extraction

```typescript
function extractFilename(url: string): string | null {
  const match = url.match(/\/uploads\/playgrounds\/([^/?]+)/);
  return match?.[1] ?? null;
}
```

#### Cleanup Function

```typescript
async function deleteOrphanedFiles(
  oldImages: string[],
  newImages: string[],
): Promise<void> {
  // Extract filenames from URLs
  // Find files to delete
  // Delete orphaned files
}
```

## Usage Examples

### During Review Process

When an admin reviews a playground and removes some images:

```typescript
// Original playground has: [image1.jpg, image2.jpg, image3.jpg]
// Admin removes image2.jpg during review
// New playground has: [image1.jpg, image3.jpg]
// Result: image2.jpg is automatically deleted from filesystem
```

### During Update Process

When updating a playground:

```typescript
// Files automatically cleaned up when images array is modified
const result = await api.playground.update.mutate({
  id: playgroundId,
  images: newImagesList, // Orphaned files from old list will be deleted
});
```

## Error Handling

- File deletion happens asynchronously and doesn't block the main operation
- If a file can't be deleted (permissions, already deleted, etc.), it logs a warning
- The playground update/review operation continues successfully even if cleanup fails

## Logs

Successful deletions log:

```
✅ Deleted orphaned file: filename.jpg
```

Failed deletions log:

```
⚠️ Failed to delete file filename.jpg: [error details]
```

## Manual Cleanup

If needed, you can manually clean up files using the utility functions:

```typescript
import { deleteFileByUrl, deleteOrphanedFiles } from "~/lib/file-cleanup";

// Delete a specific file
await deleteFileByUrl("/uploads/playgrounds/filename.jpg");

// Clean up orphaned files between two image lists
await deleteOrphanedFiles(oldImages, newImages);
```

## Security Considerations

- Only files in the `/uploads/playgrounds/` directory can be deleted
- Filename validation ensures no directory traversal attacks
- The system validates filenames with regex: `/^[a-zA-Z0-9._-]+$/`

## Future Improvements

- Batch cleanup operations for better performance
- Database tracking of file usage for more robust cleanup
- Scheduled cleanup jobs for any missed orphaned files
- Integration with cloud storage services (S3, etc.)
