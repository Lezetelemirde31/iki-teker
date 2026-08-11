"use client";

import { AlertTriangle, Check, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export type SellerChoice = { id: string; name: string; kind: string };

type Outcome = {
  created: number;
  ids: string[];
  failed: { index: number; reason: string; field?: string }[];
};

/**
 * Publishing many listings at once.
 *
 * Three hundred listings is not a form; it is a file. This takes the same
 * shape the single-listing API takes, as a JSON array, and reports per-row what
 * happened — a bulk tool that answers only "42 failed" leaves somebody diffing
 * two files by hand.
 *
 * Sent in batches, because one request carrying three hundred rows is one
 * request that times out halfway and leaves nobody sure which half landed.
 * Each batch reports before the next starts, so a run can be stopped when the
 * first rows come back wrong rather than after all of them have.
 */
export function BulkListings({
  sellers,
  template,
}: {
  sellers: SellerChoice[];
  template: string;
}) {
  const router = useRouter();
  const [sellerId, setSellerId] = useState(sellers[0]?.id ?? "");
  const [status, setStatus] = useState<"active" | "moderation">("active");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const BATCH = 25;

  async function run() {
    if (busy || !text.trim() || !sellerId) return;

    let drafts: unknown[];
    try {
      const parsed = JSON.parse(text);
      drafts = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      setError(`JSON oxunmadı: ${e instanceof Error ? e.message : "naməlum xəta"}`);
      return;
    }
    if (drafts.length === 0) return setError("Siyahı boşdur.");

    setBusy(true);
    setError(null);
    setResult(null);

    const total: Outcome = { created: 0, ids: [], failed: [] };

    try {
      for (let start = 0; start < drafts.length; start += BATCH) {
        const slice = drafts.slice(start, start + BATCH);
        setProgress(`${start + 1}–${Math.min(start + BATCH, drafts.length)} / ${drafts.length}`);

        const response = await fetch("/api/admin/listings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: slice.map((row) => {
              // A row may name its own seller, which is what makes one paste
              // able to cover listings gathered from several people. The
              // picker above is the default for everything that does not.
              const { sellerId: own, ...draft } = (row ?? {}) as Record<string, unknown>;
              return {
                sellerId: typeof own === "string" && own ? own : sellerId,
                status,
                draft,
              };
            }),
          }),
        });
        const data = (await response.json().catch(() => null)) as Outcome | null;

        if (!data) {
          setError("Server cavab vermədi.");
          break;
        }
        total.created += data.created ?? 0;
        total.ids.push(...(data.ids ?? []));
        // Indexes come back per batch; shift them so they point at the row the
        // person actually pasted.
        total.failed.push(...(data.failed ?? []).map((f) => ({ ...f, index: f.index + start })));
        setResult({ ...total });
      }
      router.refresh();
    } catch {
      setError("Bağlantı kəsildi.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const field =
    "bg-card border-border focus:border-primary w-full rounded-lg border px-3 py-2 text-sm outline-none";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
            Hansı hesab adına (standart)
          </span>
          <select
            value={sellerId}
            onChange={(event) => setSellerId(event.target.value)}
            className={field}
          >
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name} · {seller.id}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
            Status
          </span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "active")}
            className={field}
          >
            <option value="active">Dərhal dərc olunsun</option>
            <option value="moderation">Moderasiyaya düşsün</option>
          </select>
        </label>
      </div>

      <p className="bg-primary/10 rounded-lg px-3 py-2 text-[0.6875rem] leading-relaxed">
        Seçdiyin hesab elanın sahibi kimi görünəcək — alıcı onun adını görür və təsdiqlənmiş bronda onun nömrəsinə çıxır. Kimin yaratdığı jurnala yazılır. Bir sətir öz sahibini göstərmək üçün içinə <span className="font-mono">&quot;sellerId&quot;</span> yaza bilər; onda bu seçim yalnız qalanlara aid olur.
      </p>

      <label className="block space-y-1.5">
        <span className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
          Elanlar (JSON massivi)
        </span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={14}
          spellCheck={false}
          placeholder={template}
          className={`${field} font-mono text-xs leading-relaxed`}
        />
      </label>

      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button size="lg" disabled={busy || !text.trim()} onClick={run}>
          {busy ? <Loader2 className="animate-spin" /> : <Upload className="size-4" />}
          Yerləşdir
        </Button>
        {progress && <span className="text-muted-foreground text-xs">{progress}</span>}
      </div>

      {result && (
        <div className="border-border space-y-2 rounded-xl border p-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Check className="text-rental size-4" />
            {result.created} elan yerləşdirildi
          </p>

          {result.failed.length > 0 && (
            <div className="space-y-1">
              <p className="text-destructive flex items-center gap-1.5 text-xs font-semibold">
                <AlertTriangle className="size-3.5" />
                {result.failed.length} sətir keçmədi
              </p>
              <div className="max-h-48 overflow-y-auto">
                {result.failed.map((row) => (
                  <p
                    key={row.index}
                    className="text-subtle-foreground font-mono text-[0.6875rem]"
                  >
                    #{row.index + 1} — {row.reason}
                    {row.field ? ` (${row.field})` : ""}
                  </p>
                ))}
              </div>
              <p className="text-subtle-foreground text-[0.6875rem]">
                Nömrələr yapışdırdığın siyahıdakı sıra ilədir. Keçənlər yerləşdirilib,
                yalnız bunları düzəldib yenidən göndər.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
