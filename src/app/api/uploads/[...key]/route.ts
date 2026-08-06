import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { LOCAL_ROOT, isSafeKey, useR2 } from "@/server/storage";

/**
 * The disk backend: receives an upload, and serves it back.
 *
 * Only reachable when R2 is not configured. In production the browser PUTs
 * straight to the bucket and reads from the CDN, so neither half of this runs —
 * it exists so the feature is complete without an account anywhere, which is
 * what let it be built and tested before any key was issued.
 */
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function resolve(segments: string[]) {
  const key = segments.join("/");
  if (!isSafeKey(key)) return null;
  return { key, file: path.join(process.cwd(), LOCAL_ROOT, key) };
}

export async function PUT(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (useR2) return NextResponse.json({ error: "not found" }, { status: 404 });

  const target = resolve((await params).key);
  if (!target) return NextResponse.json({ error: "bad key" }, { status: 400 });

  await mkdir(path.dirname(target.file), { recursive: true });
  await writeFile(target.file, Buffer.from(await request.arrayBuffer()));

  return new NextResponse(null, { status: 200 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const target = resolve((await params).key);
  if (!target) return NextResponse.json({ error: "bad key" }, { status: 400 });

  let bytes: Buffer;
  try {
    bytes = await readFile(target.file);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const extension = target.key.split(".").pop() ?? "";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      // The name contains a random id, so a stored file never changes meaning.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
