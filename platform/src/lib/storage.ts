import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Local-disk image storage. Works out of the box for local dev and any
 * self-hosted deployment (Docker, a VM) where the filesystem persists.
 * On a serverless platform (Vercel) the filesystem is ephemeral/read-only
 * in production, so swap this for S3 / Vercel Blob / Supabase Storage
 * before deploying there — everything that calls saveUploadedImage() only
 * depends on getting a URL back, so the call sites don't need to change.
 */

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 10 * 1024 * 1024;

export class UploadError extends Error {}

export async function saveUploadedImage(scopeId: string, file: File): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(scopeId)) throw new UploadError("Invalid upload scope");

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new UploadError("Only JPEG, PNG, WEBP or GIF images are allowed");
  if (file.size > MAX_BYTES) throw new UploadError("File is larger than 10MB");
  if (file.size === 0) throw new UploadError("File is empty");

  const dir = path.join(UPLOAD_ROOT, scopeId);
  await mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${scopeId}/${filename}`;
}
