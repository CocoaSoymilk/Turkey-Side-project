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
    <section className="card-dark relative overflow-hidden p-6 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 25%, rgba(121,236,206,0.22), transparent 36%), radial-gradient(circle at 82% 12%, rgba(245,158,11,0.18), transparent 30%), radial-gradient(circle at 64% 88%, rgba(59,130,246,0.24), transparent 38%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.24) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex items-center justify-between">
        <Logo variant="dark" />
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap items-center gap-2 text-xs text-white/70">
        <span className="chip-dark">AI 데일리 브리핑 · {date}</span>
        {updated ? <span className="chip-dark">지수 업데이트 · {updated}</span> : null}
      </div>
      <h1 className="relative z-10 mt-3 text-lg md:text-2xl font-extrabold leading-snug tracking-[-0.01em]">
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
      <p className="relative z-10 mt-3 text-sm text-white/70 max-w-3xl">
        최신 기사와 지수 데이터를 결합해 핵심 이슈를 간결하게 전달합니다.
      </p>

      <div className="relative z-10 mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>
    </section>
  );
}
