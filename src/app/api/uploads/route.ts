import { NextResponse } from "next/server";

import { currentUserId } from "@/server/session";
import { createUpload } from "@/server/storage";
import { canUpload, type UploadTarget } from "@/server/uploads";

/**
 * Asking for somewhere to put a photo.
 *
 * The browser uploads to storage directly, so this hands back a URL that is
 * signed for one object and expires in minutes. Nothing here trusts the client:
 * the type and the size are checked before a URL exists, and the object's name
 * is chosen here rather than sent in — otherwise a caller could name a path
 * that overwrites someone else's file.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { threadId?: unknown; scope?: unknown; contentType?: unknown; size?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { threadId, scope, contentType, size } = payload;
  if (typeof contentType !== "string" || typeof size !== "number") {
    return NextResponse.json({ error: "contentType and size are required" }, { status: 400 });
  }

  // A thread id names a conversation; anything else is a listing being drafted,
  // which has no id yet and is filed under whoever is uploading.
  let target: UploadTarget;
  if (typeof threadId === "string" && threadId) {
    target = { kind: "chat", threadId };
  } else if (scope === "listing") {
    target = { kind: "listing" };
  } else {
    return NextResponse.json({ error: "threadId or scope is required" }, { status: 400 });
  }

  const decision = await canUpload(target, await currentUserId(), contentType, size);
  if (!decision.ok) {
    const status = decision.reason === "notParticipant" ? 403 : 422;
    return NextResponse.json({ error: decision.reason }, { status });
  }

  const upload = await createUpload(decision.key, contentType);
  return NextResponse.json(upload);
}
