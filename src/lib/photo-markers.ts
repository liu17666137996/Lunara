// 角色决定发照片时，会在回复文字末尾加标记，格式：[[SEND_PHOTO: 场景描述]]（她本人在照片里）
// 或 [[SEND_SCENE: 场景描述]]（纯风景/地点，没有她本人），见 lib/prompt.ts。chat/send 和
// guest/chat 两条路径共用同一套解析逻辑，抽在这里避免行为不一致。
const PHOTO_MARKER_RE = /\[\[SEND_(PHOTO|SCENE):?\s*([^\]]*)\]\]/gi;
const MAX_PHOTOS_PER_REPLY = 2;

// 兜底：模型有时候文字里明确说了"发一张给你看""给你看看"甚至打了👇，
// 却忘记补上标记——这种时候用户看到的是一句承诺发照片但什么都没有的回复。
// 命中这些说法但没有显式标记时，按自拍处理，用回复原文本身当描述。
const IMPLICIT_PHOTO_CUE_RE = /发(一张|给你|张照片|照片给你)|给你看|👇/;

export type PhotoMarkerKind = "PHOTO" | "SCENE";
export interface PhotoMarker {
  kind: PhotoMarkerKind;
  hint?: string;
}

export function extractPhotoMarkers(rawText: string): { markers: PhotoMarker[]; strippedText: string } {
  const explicit = [...rawText.matchAll(PHOTO_MARKER_RE)]
    .slice(0, MAX_PHOTOS_PER_REPLY)
    .map((m): PhotoMarker => ({
      kind: m[1].toUpperCase() === "SCENE" ? "SCENE" : "PHOTO",
      hint: m[2]?.trim() || undefined,
    }));
  const strippedText = rawText.replace(PHOTO_MARKER_RE, "").trim();

  if (explicit.length > 0) {
    return { markers: explicit, strippedText };
  }

  if (IMPLICIT_PHOTO_CUE_RE.test(strippedText)) {
    return { markers: [{ kind: "PHOTO", hint: strippedText || undefined }], strippedText };
  }

  return { markers: [], strippedText };
}
