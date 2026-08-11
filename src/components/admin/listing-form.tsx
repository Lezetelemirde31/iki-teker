"use client";

import { AlertTriangle, Check, ImagePlus, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Publishing one listing, as a form.
 *
 * The bulk tool next door takes JSON, which is right for a file of three
 * hundred rows and wrong for one motorcycle somebody is looking at. Typing a
 * JSON object by hand to add a single listing is not a thing to ask of the
 * person running the marketplace, so this is the same fields with the taxonomy
 * already loaded: pick a make and only its models appear, pick a city and only
 * its districts, pick a category and its required attributes appear beneath.
 *
 * It posts to the same endpoint the bulk tool does, so the two cannot disagree
 * about what a listing is.
 */

export type Option = { id: string; name: string };
export type MakeOption = Option & { categories: string[] };
export type ModelOption = Option & { makeId: string; category: string; years: [number, number] };
export type DistrictOption = Option & { cityId: string };
export type AttributeOption = {
  key: string;
  label: string;
  type: string;
  unit?: string;
  required: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
};

export type FormTaxonomy = {
  sellers: Option[];
  categories: Option[];
  makes: MakeOption[];
  models: ModelOption[];
  cities: Option[];
  districts: DistrictOption[];
  attributes: Record<string, AttributeOption[]>;
};

type Photo = { key: string; preview: string; uploading: boolean };

const FIELD =
  "bg-card border-border focus:border-primary w-full rounded-lg border px-3 py-2 text-sm outline-none";

/** The failures `createListing` can report, in the operator's language. */
const REASONS: Record<string, string> = {
  unknownCategory: "Kateqoriya tanınmadı",
  unknownMake: "Marka bu kateqoriyaya uyğun deyil",
  unknownModel: "Model tanınmadı",
  modelMismatch: "Model bu markaya aid deyil",
  invalidYear: "İl modelin istehsal illərindən kənardır",
  invalidPrice: "Qiymət düzgün deyil",
  unknownCity: "Şəhər tanınmadı",
  districtMismatch: "Rayon bu şəhərə aid deyil",
  descriptionTooShort: "Təsvir ən azı 20 simvol olmalıdır",
  missingAttribute: "Mütləq xüsusiyyət boşdur",
  unknownSeller: "Hesab tapılmadı",
  sellerBlocked: "Hesab bloklanıb",
  notAllowed: "İcazə yoxdur",
  invalidEntry: "Sətir oxunmadı",
};

function Label({ children, hint }: { children: string; hint?: string }) {
  return (
    <span className="flex items-baseline justify-between">
      <span className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
        {children}
      </span>
      {hint && <span className="text-subtle-foreground text-[0.6875rem]">{hint}</span>}
    </span>
  );
}

export function ListingForm({ taxonomy }: { taxonomy: FormTaxonomy }) {
  const router = useRouter();

  const [sellerId, setSellerId] = useState(taxonomy.sellers[0]?.id ?? "");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [status, setStatus] = useState<"active" | "moderation">("active");

  const [category, setCategory] = useState(taxonomy.categories[0]?.id ?? "motorcycles");
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [condition, setCondition] = useState<"used" | "new">("used");
  const [cityId, setCityId] = useState(taxonomy.cities[0]?.id ?? "");
  const [districtId, setDistrictId] = useState("");
  const [description, setDescription] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [customsCleared, setCustomsCleared] = useState(true);
  const [attributes, setAttributes] = useState<Record<string, string | boolean>>({});

  const [photos, setPhotos] = useState<Photo[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Narrowing at each step, so an impossible combination cannot be picked in the
  // first place rather than being rejected after submit.
  const makes = useMemo(
    () => taxonomy.makes.filter((make) => make.categories.includes(category)),
    [taxonomy.makes, category],
  );
  const models = useMemo(
    () => taxonomy.models.filter((model) => model.makeId === makeId && model.category === category),
    [taxonomy.models, makeId, category],
  );
  const districts = useMemo(
    () => taxonomy.districts.filter((district) => district.cityId === cityId),
    [taxonomy.districts, cityId],
  );
  const schema = taxonomy.attributes[category] ?? [];
  const model = taxonomy.models.find((row) => row.id === modelId);

  function pickCategory(next: string) {
    setCategory(next);
    // Everything below depends on it, and keeping a stale make would let a
    // bicycle be a Kawasaki.
    setMakeId("");
    setModelId("");
    setAttributes({});
  }

  async function upload(files: File[]) {
    setPhotoFailed(false);
    const accepted = files.slice(0, 8 - photos.length);
    const base = photos.length;

    let current: Photo[] = [
      ...photos,
      ...accepted.map((file) => ({ key: "", preview: URL.createObjectURL(file), uploading: true })),
    ];
    setPhotos(current);

    await Promise.all(
      accepted.map(async (file, index) => {
        try {
          const asked = await fetch("/api/uploads", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ scope: "listing", contentType: file.type, size: file.size }),
          });
          if (!asked.ok) throw new Error(String(asked.status));
          const { uploadUrl, headers, key } = await asked.json();
          const put = await fetch(uploadUrl, { method: "PUT", headers, body: file });
          if (!put.ok) throw new Error(String(put.status));
          current = current.map((photo, at) =>
            at === base + index ? { ...photo, key, uploading: false } : photo,
          );
        } catch {
          // Drop the one that failed and keep the rest.
          current = current.filter((_, at) => at !== base + index);
          setPhotoFailed(true);
        }
        setPhotos(current);
      }),
    );
  }

  async function submit() {
    if (busy) return;
    setError(null);
    setDone(null);

    if (!sellerId) return setError("Hesab seç.");
    if (!makeId || !modelId) return setError("Marka və model seç.");
    if (!districtId) return setError("Rayon seç.");
    if (photos.some((photo) => photo.uploading)) return setError("Şəkillər hələ yüklənir.");

    setBusy(true);
    try {
      const response = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sellerId,
          status,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          draft: {
            category,
            makeId,
            modelId,
            year: Number(year),
            price: Number(price),
            negotiable,
            condition,
            cityId,
            districtId,
            description: description.trim(),
            delivery,
            customsCleared,
            attributes,
            photoKeys: photos.map((photo) => photo.key).filter(Boolean),
            locale: "az",
          },
        }),
      });
      const data = await response.json().catch(() => null);

      if (data?.created === 1) {
        setDone(data.ids[0]);
        // Keeping the seller, contact, city and category: listings are added in
        // runs of similar things, and clearing all of it every time would mean
        // re-picking the same six values three hundred times.
        setMakeId("");
        setModelId("");
        setYear("");
        setPrice("");
        setDescription("");
        setAttributes({});
        setPhotos([]);
        router.refresh();
      } else {
        const failure = data?.failed?.[0];
        setError(
          failure
            ? `${REASONS[failure.reason] ?? failure.reason}${failure.field ? ` (${failure.field})` : ""}`
            : "Elan yaradılmadı.",
        );
      }
    } catch {
      setError("Bağlantı kəsildi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ---- who it is for ------------------------------------------------ */}
      <section className="bg-card border-border space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Kimin adına</p>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <Label>Hesab</Label>
            <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className={FIELD}>
              {taxonomy.sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <Label hint="istəyə bağlı">Görünəcək ad</Label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Elvin Məmmədov"
              className={FIELD}
            />
          </label>

          <label className="space-y-1.5">
            <Label hint="istəyə bağlı">Görünəcək nömrə</Label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+994 50 123 45 67"
              className={FIELD}
            />
          </label>
        </div>

        <p className="bg-primary/10 rounded-lg px-3 py-2 text-[0.6875rem] leading-relaxed">
          Ad və nömrə yazılsa, alıcı onları görür — satıcının hesabı olmasa da olar. Yazılmasa,
          seçilmiş hesabın öz adı və nömrəsi görünür. Elan hər halda seçilmiş hesabda qalır və
          kimin yaratdığı jurnala yazılır.
        </p>
      </section>

      {/* ---- photos ------------------------------------------------------- */}
      <section className="bg-card border-border space-y-2 rounded-xl border p-4">
        <p className="text-sm font-semibold">Şəkillər</p>
        <div className="grid grid-cols-8 gap-2">
          {photos.map((photo, index) => (
            <div key={photo.preview} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.preview}
                alt=""
                className={cn(
                  "size-full rounded-lg object-cover",
                  photo.uploading && "opacity-40",
                )}
              />
              {photo.uploading ? (
                <span className="absolute inset-0 grid place-items-center">
                  <Loader2 className="size-4 animate-spin" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPhotos(photos.filter((_, at) => at !== index))}
                  aria-label="Sil"
                  className="bg-foreground/70 text-background absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full"
                >
                  <X className="size-3" strokeWidth={3} />
                </button>
              )}
              {index === 0 && !photo.uploading && (
                <span className="bg-foreground/70 text-background absolute bottom-1 left-1 rounded px-1 py-0.5 text-[0.5rem] font-bold">
                  ÜZ QABIĞI
                </span>
              )}
            </div>
          ))}
          {photos.length < 8 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="border-border text-muted-foreground hover:bg-muted grid aspect-square place-items-center rounded-lg border border-dashed"
              aria-label="Şəkil əlavə et"
            >
              <ImagePlus className="size-5" strokeWidth={1.8} />
            </button>
          )}
        </div>
        {photoFailed && (
          <p className="text-destructive text-[0.6875rem]">Bəzi şəkillər yüklənmədi.</p>
        )}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (files.length) void upload(files);
          }}
        />
      </section>

      {/* ---- the vehicle -------------------------------------------------- */}
      <section className="bg-card border-border space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Nəqliyyat</p>

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="space-y-1.5">
            <Label>Kateqoriya</Label>
            <select
              value={category}
              onChange={(e) => pickCategory(e.target.value)}
              className={FIELD}
            >
              {taxonomy.categories.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <Label>Marka</Label>
            <select
              value={makeId}
              onChange={(e) => {
                setMakeId(e.target.value);
                setModelId("");
              }}
              className={FIELD}
            >
              <option value="">Seç…</option>
              {makes.map((make) => (
                <option key={make.id} value={make.id}>
                  {make.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <Label>Model</Label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={!makeId}
              className={cn(FIELD, !makeId && "opacity-50")}
            >
              <option value="">{makeId ? "Seç…" : "Əvvəlcə marka"}</option>
              {models.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <Label hint={model ? `${model.years[0]}–${model.years[1] + 1}` : undefined}>İl</Label>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              inputMode="numeric"
              placeholder="2021"
              className={FIELD}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="space-y-1.5">
            <Label hint="AZN">Qiymət</Label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="numeric"
              placeholder="14500"
              className={FIELD}
            />
          </label>

          <label className="space-y-1.5">
            <Label>Vəziyyət</Label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as "used")}
              className={FIELD}
            >
              <option value="used">İşlənmiş</option>
              <option value="new">Yeni</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <Label>Şəhər</Label>
            <select
              value={cityId}
              onChange={(e) => {
                setCityId(e.target.value);
                setDistrictId("");
              }}
              className={FIELD}
            >
              {taxonomy.cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <Label>Rayon</Label>
            <select
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              className={FIELD}
            >
              <option value="">Seç…</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={negotiable}
              onChange={(e) => setNegotiable(e.target.checked)}
            />
            Razılaşma var
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={customsCleared}
              onChange={(e) => setCustomsCleared(e.target.checked)}
            />
            Gömrükdən keçib
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={delivery}
              onChange={(e) => setDelivery(e.target.checked)}
            />
            Çatdırılma var
          </label>
        </div>
      </section>

      {/* ---- category attributes ------------------------------------------ */}
      {schema.length > 0 && (
        <section className="bg-card border-border space-y-3 rounded-xl border p-4">
          <p className="text-sm font-semibold">Xüsusiyyətlər</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {schema.map((attribute) => {
              const value = attributes[attribute.key];
              const set = (next: string | boolean) =>
                setAttributes({ ...attributes, [attribute.key]: next });

              if (attribute.type === "boolean") {
                return (
                  <label key={attribute.key} className="flex items-center gap-2 self-end text-xs">
                    <input
                      type="checkbox"
                      checked={value === true}
                      onChange={(e) => set(e.target.checked)}
                    />
                    {attribute.label}
                  </label>
                );
              }

              return (
                <label key={attribute.key} className="space-y-1.5">
                  <Label hint={attribute.required ? "mütləq" : attribute.unit}>
                    {attribute.label}
                  </Label>
                  {attribute.options ? (
                    <select
                      value={typeof value === "string" ? value : ""}
                      onChange={(e) => set(e.target.value)}
                      className={FIELD}
                    >
                      <option value="">Seç…</option>
                      {attribute.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={typeof value === "string" ? value : ""}
                      onChange={(e) => set(e.target.value)}
                      inputMode={attribute.type === "number" ? "numeric" : "text"}
                      className={FIELD}
                    />
                  )}
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- description and publishing ----------------------------------- */}
      <section className="bg-card border-border space-y-3 rounded-xl border p-4">
        <label className="block space-y-1.5">
          <Label hint={`${description.trim().length} / ən azı 20`}>Təsvir</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Alıcının bilməli olduğu şeylər: vəziyyəti, servisi, sənədləri."
            className={FIELD}
          />
        </label>

        <label className="space-y-1.5 sm:max-w-xs">
          <Label>Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "active")}
            className={FIELD}
          >
            <option value="active">Dərhal dərc olunsun</option>
            <option value="moderation">Moderasiyaya düşsün</option>
          </select>
        </label>
      </section>

      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
          <AlertTriangle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {done && (
        <p className="bg-rental/10 flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
          <Check className="text-rental size-3.5 shrink-0" />
          Elan yerləşdirildi — <span className="font-mono">{done}</span>. Hesab, şəhər və
          kateqoriya seçili qaldı, növbəti elanı yaza bilərsən.
        </p>
      )}

      <Button size="lg" onClick={submit} disabled={busy}>
        {busy && <Loader2 className="animate-spin" />}
        Yerləşdir
      </Button>
    </div>
  );
}
