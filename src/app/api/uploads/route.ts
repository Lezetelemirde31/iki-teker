import { NextResponse } from "next/server";

import { createUpload } from "@/server/storage";
import { canUploadTo } from "@/server/uploads";
import { currentUserId } from "@/server/session";

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
  let payload: { threadId?: unknown; contentType?: unknown; size?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { threadId, contentType, size } = payload;
  if (typeof threadId !== "string" || typeof contentType !== "string" || typeof size !== "number") {
    return NextResponse.json({ error: "threadId, contentType and size are required" }, { status: 400 });
  }

  const decision = await canUploadTo(threadId, await currentUserId(), contentType, size);
  if (!decision.ok) {
    const status = decision.reason === "notParticipant" ? 403 : 422;
    return NextResponse.json({ error: decision.reason }, { status });
  }

  const upload = await createUpload(decision.key, contentType);
  return NextResponse.json(upload);
}
