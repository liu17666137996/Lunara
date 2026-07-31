import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

/**
 * Uploads a buffer to Cloudflare R2 and returns its public URL.
 * `folder` groups objects (e.g. "images", "audio", "uploads").
 */
export async function uploadToR2(
  folder: "images" | "audio" | "uploads",
  buffer: Buffer,
  contentType: string,
  extension: string
): Promise<string> {
  const key = `${folder}/${randomUUID()}.${extension}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return `${base}/${key}`;
}
