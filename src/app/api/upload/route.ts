import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { uploadToR2 } from "@/lib/r2";

const MAX_BYTES = 15 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

/** 会员上传聊天用的图片/语音到 R2，返回 URL 供 /api/chat/send 引用。 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const folder = file.type.startsWith("audio/") ? "audio" : "uploads";
  const extension = EXT_BY_TYPE[file.type] ?? (folder === "audio" ? "webm" : "jpg");

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToR2(folder, buffer, file.type || "application/octet-stream", extension);

  return NextResponse.json({ url });
}
