import type { TodayIssue } from "@/lib/today";

type Props = { issues: TodayIssue[] };

type Sentiment = "up" | "down" | "neutral";

// 한국 관례: 상승=빨강, 하락=파랑
const SENTIMENT_STYLE: Record<
  Sentiment,
  { label: string; cls: string }
> = {
  up: { label: "상승", cls: "bg-rose-50 text-rose-600 border-rose-200" },
  down: { label: "하락", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  neutral: {
    label: "주목",
    cls: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

// title + detail 텍스트에서 sentiment 추정
//   1) "+12.3%" 같은 부호 먼저
//   2) 한국어 키워드
function detectSentiment(iss: TodayIssue): Sentiment {
  const text = `${iss.title} ${iss.detail}`;

  // 명시적 부호가 있으면 그게 우선
  const explicitNeg = /-\s?\d+(\.\d+)?\s?%/.test(text);
  const explicitPos = /\+\s?\d+(\.\d+)?\s?%/.test(text);
  if (explicitNeg && !explicitPos) return "down";
  if (explicitPos && !explicitNeg) return "up";

  // 키워드 기반
  const upKw = /(급등|상승|상한가|강세|오름|폭등|신고가|반등|호조|상향|매수세)/;
  const downKw = /(급락|하락|하한가|약세|폭락|떨어|신저가|부진|악재|하향|매도세)/;
  if (downKw.test(text) && !upKw.test(text)) return "down";
  if (upKw.test(text) && !downKw.test(text)) return "up";

  return "neutral";
}

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
          {issues.map((iss, i) => {
            const sentiment = detectSentiment(iss);
            const style = SENTIMENT_STYLE[sentiment];
            const Arrow =
              sentiment === "up" ? "▲" : sentiment === "down" ? "▼" : "●";
            return (
              <li key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 text-base leading-5">{iss.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[10px] font-bold leading-none ${style.cls}`}
                    >
                      <span className="text-[9px]">{Arrow}</span>
                      {style.label}
                    </span>
                    <p className="text-[13px] font-semibold text-navy leading-snug">
                      {iss.title}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    {iss.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
