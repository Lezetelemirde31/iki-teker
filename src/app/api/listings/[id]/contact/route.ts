import { NextResponse } from "next/server";

import { recordContact } from "@/server/listing-actions";
import { currentUserId } from "@/server/session";

/**
 * A buyer revealed the seller's phone number.
 *
 * This is the number the whole business model rests on. The deck sells paid
 * promotion, and what a seller is buying is contacts — how many people cared
 * enough to ask how to reach them. Views flatter; contacts are the figure a
 * promotion price has to be justified against.
 *
 * A seller opening their own listing does not count.
 */
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contacts = await recordContact(id, await currentUserId());
  return NextResponse.json({ contacts });
}
