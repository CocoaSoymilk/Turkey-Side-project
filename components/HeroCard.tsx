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
  fetchedAt,
}: {
  date: string;
  text: string;
  kpis: HeroKpi[];
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
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-white/70">
        <span className="chip-dark">AI 데일리 브리핑 · {date}</span>
        {updated ? <span className="chip-dark">지수 업데이트 · {updated}</span> : null}
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
      <p className="mt-3 text-xs text-white/65">
        최신 기사와 지수 데이터를 결합해 핵심 이슈를 간결하게 전달합니다.
      </p>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>
    </section>
  );
}
