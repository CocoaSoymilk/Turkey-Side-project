import { Logo } from "./Logo";
import { KpiCard } from "./KpiCard";

export type HeroKpi = {
  label: string;
  value: string;
  change?: string;
  changePct?: number;
  sign?: "up" | "down" | "flat";
  hint?: string;
};

export function HeroCard({
  date,
  text,
  kpis,
  keywords,
  fetchedAt,
}: {
  date: string;
  text: string;
  kpis: HeroKpi[];
  keywords: string[];
  fetchedAt?: string;
}) {
  const parts = text.split(/('[^']+'|"[^"]+")/g);
  const updated = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  return (
    <section className="card-dark p-6 md:p-8">
      <div className="flex items-center justify-between">
        <Logo variant="dark" />
        <span className="chip-dark">AI · · ·</span>
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-white/60">
        <span>AI 데일리 브리핑 · {date}</span>
        {updated ? <span>지수 업데이트 · {updated}</span> : null}
      </div>
      <h1 className="mt-2 text-xl md:text-2xl font-bold leading-snug">
        {parts.map((p, i) =>
          /^['"].*['"]$/.test(p) ? (
            <span key={i} className="text-accent-gold">
              {p}
            </span>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </h1>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {keywords.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {keywords.map((k) => (
            <span key={k} className="chip-dark">
              #{k}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
