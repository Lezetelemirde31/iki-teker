import type { Locale } from "@/i18n/config";
import { formatNumber, localized } from "@/lib/format";
import { specAttributes } from "@/mocks/taxonomy";
import type { AttributeValues, CatalogCategorySlug } from "@/types";

/**
 * Two-column specification table.
 *
 * Rows come from the category's attribute schema, not from the listing — the
 * same definitions that drive the filter sheet. Values are stored as typed
 * fields rather than buried in the description, which is exactly what makes
 * them searchable.
 */
export function SpecTable({
  category,
  attributes,
  extra,
  locale,
}: {
  category: CatalogCategorySlug;
  attributes: AttributeValues;
  /** Rows that live on the listing itself, e.g. year or customs status. */
  extra?: { label: string; value: string }[];
  locale: Locale;
}) {
  const rows: { label: string; value: string }[] = [...(extra ?? [])];

  for (const definition of specAttributes(category)) {
    const raw = attributes[definition.key];
    if (raw === undefined || raw === "") continue;

    let value: string;
    if (definition.type === "boolean") {
      value = raw ? "✓" : "—";
    } else if (definition.type === "select") {
      const option = definition.options?.find((entry) => entry.value === String(raw));
      value = option ? localized(option.label, locale) : String(raw);
    } else {
      const unit = definition.unit ? ` ${localized(definition.unit, locale)}` : "";
      value = `${formatNumber(Number(raw), locale)}${unit}`;
    }

    rows.push({ label: localized(definition.label, locale), value });
  }

  if (rows.length === 0) return null;

  return (
    <div className="bg-card border-border grid grid-cols-2 overflow-hidden rounded-xl border">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`border-border px-3.5 py-3 ${
            index % 2 === 0 ? "border-r" : ""
          } ${index < rows.length - (rows.length % 2 === 0 ? 2 : 1) ? "border-b" : ""}`}
        >
          <p className="text-subtle-foreground text-[0.6875rem]">{row.label}</p>
          <p className="tabular mt-0.5 text-sm font-bold">{row.value}</p>
        </div>
      ))}
    </div>
  );
}
