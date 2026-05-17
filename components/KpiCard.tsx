type Sign = "up" | "down" | "flat";

export function KpiCard({
  label,
  value,
  change,
  changePct,
  sign,
  hint,
}: {
  label: string;
  value: string;
  change?: string;
  changePct?: number;
  sign?: Sign;
  hint?: string;
}) {
  const color =
    sign === "up"
      ? "text-rose-200"
      : sign === "down"
        ? "text-sky-200"
        : "text-white/70";
  const chipTone =
    sign === "up"
      ? "bg-rose-500/20 text-rose-100 border-rose-300/35"
      : sign === "down"
        ? "bg-sky-500/20 text-sky-100 border-sky-300/35"
        : "bg-white/10 text-white/70 border-white/20";
  const arrow = sign === "up" ? "▲" : sign === "down" ? "▼" : "—";
  const pct =
    typeof changePct === "number" ? `${changePct.toFixed(2)}%` : null;

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className={`text-[11px] mt-0.5 ${color}`}>
        {pct ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${chipTone}`}
          >
            <span>{arrow}</span>
            <span>{pct}</span>
            {change ? <span className="opacity-75">({change})</span> : null}
          </span>
        ) : hint ? (
          <span className="text-white/50">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
