import { notFound } from "next/navigation";

import { BulkListings, type SellerChoice } from "@/components/admin/bulk-listings";
import { cities, districtsOf } from "@/mocks/geo";
import { categorySchemas, makes, models } from "@/mocks/taxonomy";
import { sellerChoices } from "@/server/admin-listings";
import { can } from "@/server/authorization";

/**
 * Publishing listings in bulk.
 *
 * The example is generated from the real attribute schema rather than written
 * out by hand, so it cannot drift from what the validator will accept. A
 * template that is subtly out of date is worse than none: it produces a hundred
 * rejections that all look like the operator's fault.
 */
export const dynamic = "force-dynamic";

export default async function AdminNewListingsPage() {
  if (!(await can("manageCatalog"))) notFound();

  const sellers = (await sellerChoices()) as SellerChoice[];

  // A real make and model that actually belong together, and a real city, so
  // the example works if pasted unchanged.
  const make = makes[0];
  const model = models.find((row) => row.makeId === make?.id);
  const city = cities[0];
  // A district that actually belongs to that city — the validator requires one,
  // and an example that fails on paste teaches the wrong lesson.
  const district = city ? districtsOf(city.id)[0] : undefined;

  const required = (categorySchemas.motorcycles ?? []).filter((row) => row.required);
  const attributes = Object.fromEntries(
    (categorySchemas.motorcycles ?? []).map((row) => [
      row.key,
      row.type === "number" ? (row.min ?? 0) : row.type === "boolean" ? false : "",
    ]),
  );

  const example = [
    {
      category: "motorcycles",
      makeId: make?.id ?? "",
      modelId: model?.id ?? "",
      year: 2021,
      price: 14500,
      negotiable: true,
      condition: "used",
      cityId: city?.id ?? "",
      districtId: district?.id ?? "",
      description:
        "Elanın təsviri. Ən azı 20 simvol olmalıdır — alıcının bilməli olduğu şeyləri yaz.",
      delivery: false,
      customsCleared: true,
      attributes,
      locale: "az",
      // Whose name and number the buyer sees. Leave both out and the owning
      // account's own details are used.
      contactName: "Elvin",
      contactPhone: "+994 50 123 45 67",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold">Elan yerləşdir</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Bir və ya yüzlərlə. Hər sətir satıcının öz formasından keçən eyni yoxlamadan keçir.
        </p>
      </div>

      <div className="bg-card border-border space-y-2 rounded-xl border p-4 text-xs leading-relaxed">
        <p className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
          Sahələr
        </p>
        <p>
          <span className="font-semibold">Mütləq:</span> category, makeId, modelId, year, price,
          condition, cityId, districtId, description (20+ simvol), attributes, locale
        </p>
        <p>
          <span className="font-semibold">İstəyə bağlı:</span> negotiable, delivery,
          customsCleared, photoKeys, sellerId, contactName, contactPhone
        </p>
        {required.length > 0 && (
          <p>
            <span className="font-semibold">Motosiklet üçün mütləq xüsusiyyət:</span>{" "}
            {required.map((row) => row.key).join(", ")}
          </p>
        )}
        <p>
          <span className="font-semibold">contactName / contactPhone:</span> elanın üstündə
          görünəcək ad və nömrə. Satıcının hesabı olmasa da olar — elan platformanın hesabında
          durur, alıcı isə bu adı və nömrəni görür.
        </p>
        <p className="text-subtle-foreground">
          Marka və model bir-birinə uyğun olmalıdır, yoxsa sətir rədd olunur. Aşağıdakı nümunə
          həqiqi id-lərlə doldurulub — olduğu kimi yapışdırsan işləyir.
        </p>
      </div>

      <BulkListings sellers={sellers} template={JSON.stringify(example, null, 2)} />
    </div>
  );
}
