import { NextResponse } from "next/server";

import { sendImage, sendMessage } from "@/server/messaging";
import { currentUserId } from "@/server/session";

/**
 * Sending a message.
 *
 * Membership of the thread is checked server-side: a thread id is guessable,
 * and reading or writing someone else's negotiation is exactly the kind of
 * thing an id-based URL invites.
 *
 * Text and photos come through the same endpoint because they are the same act
 * — a client that can send one should not need to learn a second protocol to
 * send the other. A photo's bytes are already in storage by this point; what
 * arrives here is the object's name.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: { body?: unknown; image?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const userId = await currentUserId();
  const image = payload.image;

  let result;
  if (image !== undefined) {
    if (
      typeof image !== "object" ||
      image === null ||
      typeof (image as { key?: unknown }).key !== "string" ||
      typeof (image as { fileName?: unknown }).fileName !== "string" ||
      typeof (image as { fileSize?: unknown }).fileSize !== "string"
    ) {
      return NextResponse.json({ error: "image needs key, fileName and fileSize" }, { status: 400 });
    }

    const { key, fileName, fileSize, width, height } = image as {
      key: string;
      fileName: string;
      fileSize: string;
      width?: unknown;
      height?: unknown;
    };

    result = await sendImage(id, userId, {
      key,
      fileName,
      fileSize,
      width: typeof width === "number" ? width : undefined,
      height: typeof height === "number" ? height : undefined,
    });
  } else {
    if (typeof payload.body !== "string") {
      return NextResponse.json({ error: "body must be a string" }, { status: 400 });
    }
    result = await sendMessage(id, userId, payload.body);
  }

  if (result.ok) return NextResponse.json({ message: result.message }, { status: 201 });

  const status =
    result.reason === "notFound" ? 404 : result.reason === "notParticipant" ? 403 : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
