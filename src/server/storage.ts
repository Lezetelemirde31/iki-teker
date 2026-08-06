import "server-only";

import { AwsClient } from "aws4fetch";

/**
 * Where uploaded files live.
 *
 * Two backends behind one interface, chosen by whether R2 is configured:
 *
 *   - **Cloudflare R2** in production. Free up to 10 GB, and — the reason it
 *     was picked over S3 — no charge for reading the data back out. A chat
 *     photo is written once and looked at many times; egress is the bill that
 *     would actually arrive.
 *   - **The local disk** otherwise, under `.uploads/`. Not a mock: the same
 *     upload, the same message, the same rendering. It means the feature can be
 *     built and tested before anyone has issued a key, and a contributor can
 *     run the whole thing with no account anywhere.
 *
 * The browser uploads straight to storage rather than through this app. A photo
 * from a modern phone is several megabytes, serverless functions cap request
 * bodies well below that, and pushing the bytes through a function would mean
 * paying for the same data twice.
 */

const bucket = process.env.R2_BUCKET;
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

/** The domain the files are read from — a custom domain bound to the bucket. */
const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

export const useR2 = Boolean(bucket && accountId && accessKeyId && secretAccessKey && publicBase);

export const storageBackend = useR2 ? "r2" : "local";

/** Uploads may sit unclaimed; a short life is enough to send one message. */
const UPLOAD_WINDOW_SECONDS = 300;

export type Upload = {
  /** Where the browser PUTs the bytes. */
  uploadUrl: string;
  /** Headers the PUT must carry for the signature to hold. */
  headers: Record<string, string>;
  /** The object's name in the bucket, stored on the message. */
  key: string;
};

/* -------------------------------------------------------------------------- */
/*  Addressing                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The public address of a stored object.
 *
 * Kept out of the database on purpose: rows hold the key, not the URL. Moving
 * to a different domain — or off R2 entirely — is then a configuration change
 * rather than a migration over every message ever sent.
 */
export function publicUrl(key: string): string {
  return useR2 ? `${publicBase}/${key}` : `/api/uploads/${key}`;
}

/* -------------------------------------------------------------------------- */
/*  Handing out an upload                                                      */
/* -------------------------------------------------------------------------- */

export async function createUpload(key: string, contentType: string): Promise<Upload> {
  if (!useR2) {
    // The local route accepts the same PUT, so nothing above this layer has to
    // know which backend answered.
    return { uploadUrl: `/api/uploads/${key}`, headers: { "content-type": contentType }, key };
  }

  const client = new AwsClient({
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    service: "s3",
    region: "auto",
  });

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;

  // Signed into the query string rather than a header: the browser PUTs the
  // file directly and never sees the account's credentials.
  const signed = await client.sign(
    new Request(`${endpoint}?X-Amz-Expires=${UPLOAD_WINDOW_SECONDS}`, {
      method: "PUT",
      headers: { "content-type": contentType },
    }),
    { aws: { signQuery: true } },
  );

  return { uploadUrl: signed.url, headers: { "content-type": contentType }, key };
}

/* -------------------------------------------------------------------------- */
/*  The local backend                                                          */
/* -------------------------------------------------------------------------- */

/** Where the disk backend keeps its files. Gitignored, safe to delete. */
export const LOCAL_ROOT = ".uploads";

/**
 * Every object for one conversation shares a prefix.
 *
 * That is what makes a key sent back by a client checkable: an attachment can
 * only be claimed in the thread it was uploaded into. It lives here, with the
 * other addressing rules, so neither the send path nor the upload path has to
 * import the other.
 */
export function uploadPrefix(threadId: string): string {
  return `chat/${threadId}`;
}

/**
 * Refuses a key that would escape the upload directory.
 *
 * The key reaches this from a URL path, so `..` in it is not a hypothetical —
 * it is the first thing anyone tries.
 */
export function isSafeKey(key: string): boolean {
  return /^[a-z0-9/_-]+\.[a-z0-9]+$/i.test(key) && !key.includes("..");
}
