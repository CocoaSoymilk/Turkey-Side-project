import type { RankRow } from "@/lib/rank";

type Props = { rows: RankRow[]; fetchedAt: Date | null };

export function TodayRankCard({ rows, fetchedAt }: Props) {
  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-navy flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] text-blue-700">
            $
          </span>
          오늘의 순위 (거래대금)
        </h2>
        {fetchedAt && (
          <span className="text-[10px] text-slate-400">
            {formatKstHm(fetchedAt)} 기준
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">데이터 수집 중…</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={r.code}
              className="flex items-center gap-2.5 text-[12.5px] py-1 border-b border-slate-100 last:border-0"
            >
              <span className="shrink-0 w-4 text-xs font-bold text-slate-400 tabular-nums">
                {i + 1}
              </span>
              <span className="flex-1 truncate font-medium text-navy">
                {r.name}
              </span>
              <span
                className={
                  "shrink-0 tabular-nums font-semibold " +
                  signClass(r.changePct)
                }
              >
                {signedPct(r.changePct)}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-3 text-[10px] text-slate-400">
        ETF/스팩 제외 · 평일 09–16시 매시 갱신
      </p>
    </section>
  );
}

function signedPct(p: number): string {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(2)}%`;
}

function signClass(p: number): string {
  if (p > 0) return "text-rose-600";
  if (p < 0) return "text-blue-600";
  return "text-slate-500";
}

function formatKstHm(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 3600_000);
  const h = String(kst.getUTCHours()).padStart(2, "0");
  const m = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
