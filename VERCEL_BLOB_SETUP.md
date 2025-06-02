# Vercel Blob Storage Setup Guide

This application now uses **Vercel Blob Storage** for reliable image storage that works in all environments (development, preview, and production).

## Why Vercel Blob Storage?

The previous local file system storage had issues in production because:

- ❌ Serverless functions don't have persistent file systems
- ❌ Uploaded files are lost between deployments
- ❌ Files uploaded to one server instance aren't available to others

Vercel Blob Storage solves these issues by providing:

- ✅ Persistent cloud storage
- ✅ CDN-backed delivery
- ✅ Seamless integration with Vercel
- ✅ Automatic scaling

## Setup Instructions

### 1. Enable Vercel Blob Storage

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to the **Storage** tab
4. Create a new **Blob Store**
5. Name it something like `leikvellir-images`

### 2. Get Your Blob Token

1. In the Blob Store settings, you'll see connection details
2. Copy the `BLOB_READ_WRITE_TOKEN`
3. Add it to your environment variables

### 3. Environment Variables

Add these environment variables to your project:

**For Vercel (Production/Preview):**

1. Go to Project Settings → Environment Variables
2. Add: `BLOB_READ_WRITE_TOKEN` with your token value

**For Local Development:**

1. Add to your `.env.local` file:

```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXX_XXXXXXXXXX"
```

## Features

- **Automatic Uploads**: All images are now stored in Vercel Blob Storage
- **CDN Delivery**: Images are served via Vercel's global CDN
- **Automatic Cleanup**: Images are properly deleted when removed from the UI
- **Security**: Rate limiting and file validation still apply
- **Backward Compatibility**: Existing local images will still work

## Usage

No code changes needed! The upload component will automatically:

1. Upload images to Vercel Blob Storage
2. Return blob URLs (like `https://your-blob-store.vercel-storage.com/...`)
3. Display images from the CDN
4. Handle deletions properly

## Cost

Vercel Blob Storage pricing:

- **Hobby Plan**: $0.05 per GB stored + $0.05 per 1000 requests
- **Pro Plan**: $0.05 per GB stored + $0.05 per 1000 requests
- Free tier includes some storage and bandwidth

For a typical playground app, costs should be minimal (a few dollars per month at most).

## Troubleshooting

### Images not showing up?

1. Check that `BLOB_READ_WRITE_TOKEN` is set in your environment variables
2. Verify the token has read/write permissions
3. Check the browser console for any CORS or network errors

### Upload failing?

1. Ensure the blob store is created in your Vercel dashboard
2. Verify the token is correct and active
3. Check file size limits (default: 4MB per file)

### Migration from local files

If you have existing images in `/public/uploads/`, they will continue to work but won't benefit from CDN delivery. New uploads will use Blob Storage automatically.

## Development

The app will work in development with the blob token. If you prefer to use local storage during development, you can:

1. Set `NODE_ENV=development`
2. Comment out the blob storage code temporarily
3. Revert to local file system storage

But we recommend using blob storage everywhere for consistency.
