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
      ? "text-red-400"
      : sign === "down"
        ? "text-sky-400"
        : "text-white/70";
  const arrow = sign === "up" ? "▲" : sign === "down" ? "▼" : "—";
  const pct =
    typeof changePct === "number" ? `${changePct.toFixed(2)}%` : null;

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className={`text-[11px] mt-0.5 ${color}`}>
        {pct ? (
          <>
            <span className="mr-1">{arrow}</span>
            <span className="tabular-nums">{pct}</span>
            {change ? <span className="ml-1 text-white/50">({change})</span> : null}
          </>
        ) : hint ? (
          <span className="text-white/50">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
