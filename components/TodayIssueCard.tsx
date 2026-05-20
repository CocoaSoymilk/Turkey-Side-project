import type { TodayIssue } from "@/lib/today";

type Props = { issues: TodayIssue[] };

export function TodayIssueCard({ issues }: Props) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold text-navy flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] text-amber-700">
          !
        </span>
        오늘의 이슈
      </h2>

      {issues.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          데이터 수집 중… 평일 09–16시 정각마다 갱신됩니다.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {issues.map((iss, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="shrink-0 text-base leading-5">{iss.emoji}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-navy leading-snug">
                  {iss.title}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  {iss.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
