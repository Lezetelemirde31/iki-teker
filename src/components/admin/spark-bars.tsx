/**
 * A small bar chart, drawn in CSS rather than pulled from a charting library.
 *
 * The panel needs to show a trend, not to support zooming, tooltips and export.
 * A dependency for eleven divs would be the larger cost, and this renders on
 * the server with no client JavaScript at all.
 *
 * Days with nothing in them are still drawn, as a flat baseline. Dropping them
 * would compress a quiet fortnight into a busy-looking line, which is the one
 * thing a growth chart must not do.
 */
export function SparkBars({
  data,
  label,
}: {
  data: { day: string; n: number }[];
  label: string;
}) {
  const peak = Math.max(1, ...data.map((point) => point.n));
  const total = data.reduce((sum, point) => sum + point.n, 0);

  return (
    <div className="bg-card border-border rounded-xl border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
          {label}
        </p>
        <p className="font-display tabular text-sm font-extrabold">{total}</p>
      </div>

      {data.length === 0 ? (
        <p className="text-subtle-foreground mt-3 text-xs">Bu dövrdə heç nə yoxdur.</p>
      ) : (
        <div className="mt-3 flex h-16 items-end gap-px">
          {data.map((point) => (
            <div
              key={point.day}
              title={`${point.day} — ${point.n}`}
              style={{ height: `${Math.max(3, (point.n / peak) * 100)}%` }}
              className="bg-primary/70 hover:bg-primary min-w-0 flex-1 rounded-t-sm transition-colors"
            />
          ))}
        </div>
      )}

      {data.length > 0 && (
        <div className="text-subtle-foreground mt-1.5 flex justify-between text-[0.625rem]">
          <span>{data[0]?.day.slice(5)}</span>
          <span>{data[data.length - 1]?.day.slice(5)}</span>
        </div>
      )}
    </div>
  );
}
