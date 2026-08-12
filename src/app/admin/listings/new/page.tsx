import { notFound } from "next/navigation";

import { BulkListings, type SellerChoice } from "@/components/admin/bulk-listings";
import { ListingForm, type FormTaxonomy } from "@/components/admin/listing-form";
import { NewListingTabs } from "@/components/admin/new-listing-tabs";
import { getMessages } from "@/i18n/dictionaries";
import { cities, districts, districtsOf } from "@/mocks/geo";
import { categories, categorySchemas, makes, models } from "@/mocks/taxonomy";
import { sellerChoices } from "@/server/admin-listings";
import { can } from "@/server/authorization";

/**
 * Publishing listings from the panel.
 *
 * Two ways in, because there are two jobs. One listing at a time is a form:
 * the taxonomy is already loaded, so a make narrows the models and a city
 * narrows the districts, and nothing invalid can be picked. A catalogue of
 * three hundred is a file, and that is the JSON tool.
 *
 * Both post to the same endpoint, so neither can drift from what the validator
 * accepts, and the JSON example is generated from the real attribute schema
 * rather than written out by hand for the same reason.
 */
export const dynamic = "force-dynamic";

export default async function AdminNewListingsPage() {
  if (!(await can("manageCatalog"))) notFound();

  const sellers = (await sellerChoices()) as SellerChoice[];
  const messages = await getMessages("az");
  const labels = (messages as unknown as { categories?: Record<string, string> }).categories ?? {};

  // Only the categories a vehicle listing can be in — a part is a different
  // shape with its own required fields, and offering it here would produce a
  // form whose every submission is rejected.
  const vehicleCategories = categories
    .filter((row) => row.kind === "vehicle" && row.slug in categorySchemas)
    .map((row) => ({ id: row.slug, name: labels[row.slug] ?? row.slug }));

  const taxonomy: FormTaxonomy = {
    sellers: sellers.map((seller) => ({ id: seller.id, name: `${seller.name} · ${seller.id}` })),
    categories: vehicleCategories,
    makes: makes.map((make) => ({ id: make.id, name: make.name, categories: [...make.categories] })),
    models: models.map((model) => ({
      id: model.id,
      name: model.name,
      makeId: model.makeId,
      category: model.category,
      years: model.years,
    })),
    cities: cities.map((city) => ({ id: city.id, name: city.name.az })),
    districts: districts.map((district) => ({
      id: district.id,
      cityId: district.cityId,
      name: district.name.az,
    })),
    attributes: Object.fromEntries(
      vehicleCategories.map((row) => [
        row.id,
        (categorySchemas[row.id as "motorcycles"] ?? []).map((attribute) => ({
          key: attribute.key,
          label: attribute.label.az,
          type: attribute.type,
          required: attribute.required,
          ...(attribute.unit ? { unit: attribute.unit.az } : {}),
          ...(attribute.min !== undefined ? { min: attribute.min } : {}),
          ...(attribute.max !== undefined ? { max: attribute.max } : {}),
          ...(attribute.options
            ? {
                options: attribute.options.map((option) => ({
                  value: option.value,
                  label: option.label.az,
                })),
              }
            : {}),
        })),
      ]),
    ),
  };

  /* ---- the JSON example, built from the same taxonomy ------------------- */
  const make = makes[0];
  const model = models.find((row) => row.makeId === make?.id);
  const city = cities[0];
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
        "İstəyə bağlı. Alıcının bilməli olduğu şeyləri yaz.",
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
          Bir və ya yüzlərlə. Hər ikisi satıcının öz formasından keçən eyni yoxlamadan keçir.
        </p>
      </div>

      <NewListingTabs
        form={<ListingForm taxonomy={taxonomy} />}
        bulk={
          <div className="space-y-4">
            <div className="bg-card border-border space-y-2 rounded-xl border p-4 text-xs leading-relaxed">
              <p className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
                Sahələr
              </p>
              <p>
                <span className="font-semibold">Mütləq:</span> category, makeId, modelId, year,
                price, condition, cityId, districtId, attributes, locale
              </p>
              <p>
                <span className="font-semibold">İstəyə bağlı:</span> negotiable, delivery,
                customsCleared, photoKeys, sellerId, contactName, contactPhone, description
              </p>
              {required.length > 0 && (
                <p>
                  <span className="font-semibold">Motosiklet üçün mütləq xüsusiyyət:</span>{" "}
                  {required.map((row) => row.key).join(", ")}
                </p>
              )}
              <p>
                <span className="font-semibold">contactName / contactPhone:</span> elanın üstündə
                görünəcək ad və nömrə. Satıcının hesabı olmasa da olar — elan platformanın
                hesabında durur, alıcı isə bu adı və nömrəni görür.
              </p>
              <p className="text-subtle-foreground">
                Marka və model bir-birinə uyğun olmalıdır, yoxsa sətir rədd olunur. Aşağıdakı
                nümunə həqiqi id-lərlə doldurulub — olduğu kimi yapışdırsan işləyir.
              </p>
            </div>

            <BulkListings sellers={sellers} template={JSON.stringify(example, null, 2)} />
          </div>
        }
      />
    </div>
  );
}
