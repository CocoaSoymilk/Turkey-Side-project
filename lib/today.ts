// "오늘의 이슈" 카드 데이터 생성.
//  - 숫자/사실(facts)은 SQL이 결정적으로 추출
//  - 자연어 한 줄 스토리는 LLM이 생성 (실패 시 룰베이스 fallback)
import "server-only";
import {
  readMoversTop,
  readSurgeTop,
  readTradeValueTop,
  type RankRow,
} from "./rank";
import { getOpenAI } from "./openai";

export type TodayIssue = {
  kind:
    | "leader"
    | "cluster"
    | "surge"
    | "sector"
    | "sentiment"
    | "fall"
    | "news";
  emoji: string;
  title: string;
  detail: string;
};

/* ─────────────────────────────────────────
 * Facts — SQL이 뽑은 결정적 사실
 * ───────────────────────────────────────── */
export type TodayFacts = {
  trade: RankRow[];
  rise: RankRow[];
  fall: RankRow[];
  surge: RankRow[];
};

export async function fetchTodayFacts(): Promise<TodayFacts> {
  const [trade, movers, surge] = await Promise.all([
    readTradeValueTop(8).catch(() => []),
    readMoversTop(5).catch(() => ({ rise: [], fall: [] })),
    readSurgeTop(5).catch(() => []),
  ]);
  return { trade, rise: movers.rise, fall: movers.fall, surge };
}

/* ─────────────────────────────────────────
 * 룰베이스 빌더 — LLM 없이도 동작 (fallback)
 * ───────────────────────────────────────── */
export function buildTodayIssuesRuleBased(
  facts: TodayFacts,
  max = 4
): TodayIssue[] {
  const issues: TodayIssue[] = [];

  if (facts.trade[0]) {
    issues.push({
      kind: "leader",
      emoji: "💰",
      title: `${facts.trade[0].name}에 돈이 몰렸어요`,
      detail: `거래대금 1위 · ${pct(facts.trade[0].changePct)}`,
    });
  }
  const limitUps = facts.rise.filter((r) => r.changePct >= 25);
  if (limitUps.length >= 3) {
    issues.push({
      kind: "cluster",
      emoji: "🚀",
      title: `상한가 ${limitUps.length}개 동시 출현`,
      detail: limitUps.slice(0, 3).map((r) => r.name).join(", "),
    });
  } else if (facts.rise[0] && facts.rise[0].changePct >= 5) {
    issues.push({
      kind: "leader",
      emoji: "📈",
      title: `${facts.rise[0].name} ${pct(facts.rise[0].changePct)} 급등`,
      detail: `등락률 상승 1위`,
    });
  }
  if (facts.fall[0] && facts.fall[0].changePct <= -5) {
    issues.push({
      kind: "fall",
      emoji: "📉",
      title: `${facts.fall[0].name} ${pct(facts.fall[0].changePct)} 급락`,
      detail: `등락률 하락 1위`,
    });
  }
  const s = facts.surge[0];
  if (s && s.acmlVolume >= 1_000_000n && s.prdyVolume > 0n) {
    const mul = Number(s.acmlVolume) / Number(s.prdyVolume);
    if (mul >= 3) {
      issues.push({
        kind: "surge",
        emoji: "🔥",
        title: `${s.name} 거래량 폭증`,
        detail: `전일대비 ${Math.round(mul)}배 · ${pct(s.changePct)}`,
      });
    }
  }
  return issues.slice(0, max);
}

/* ─────────────────────────────────────────
 * LLM 빌더 — facts + 뉴스 헤드라인을 받아 스토리화
 * ───────────────────────────────────────── */
export async function buildTodayIssuesLLM(
  facts: TodayFacts,
  headlines: string[],
  max = 4
): Promise<TodayIssue[]> {
  try {
    const issues = await callLlmForIssues(facts, headlines, max);
    if (issues.length > 0) return issues;
  } catch (e) {
    console.error("[today-issues:llm]", (e as Error).message);
  }
  return buildTodayIssuesRuleBased(facts, max);
}

async function callLlmForIssues(
  facts: TodayFacts,
  headlines: string[],
  max: number
): Promise<TodayIssue[]> {
  // 데이터 간결화 — LLM에 줄 facts 페이로드 (~400~600 토큰)
  const compact = {
    tradeValueTop5: facts.trade.slice(0, 5).map((r) => ({
      name: r.name,
      changePct: round2(r.changePct),
      todayVol: bigintToCompact(r.acmlVolume),
      prdyVol: bigintToCompact(r.prdyVolume),
    })),
    riseTop5: facts.rise.slice(0, 5).map((r) => ({
      name: r.name,
      changePct: round2(r.changePct),
    })),
    fallTop5: facts.fall.slice(0, 5).map((r) => ({
      name: r.name,
      changePct: round2(r.changePct),
    })),
    surgeTop3: facts.surge.slice(0, 3).map((r) => ({
      name: r.name,
      changePct: round2(r.changePct),
      surgeMultiple:
        r.prdyVolume > 0n
          ? Math.round((Number(r.acmlVolume) / Number(r.prdyVolume)) * 10) / 10
          : null,
    })),
  };

  const newsBlock = headlines
    .slice(0, 15)
    .map((h, i) => `${i + 1}. ${h}`)
    .join("\n");

  const prompt = `오늘 한국 주식 시장의 객관 데이터와 관련 뉴스 헤드라인입니다.
초보 투자자에게 의미 있는 "오늘의 이슈" 카드 최대 ${max}개를 JSON으로 작성하세요.

[시장 데이터 — KIS API 최신 스냅샷]
${JSON.stringify(compact, null, 2)}

[관련 뉴스 헤드라인]
${newsBlock || "(헤드라인 없음)"}

[출력 JSON 스키마]
{
  "issues": [
    {
      "emoji": "이슈 분위기에 맞는 단일 이모지 1개",
      "title": "20자 내외 헤드라인 (누구나 이해할 한국어)",
      "detail": "40자 내외 보충 설명 (데이터 근거 1개 명시)",
      "kind": "leader | cluster | surge | sector | sentiment | fall | news"
    }
  ]
}

규칙:
- issues는 1~${max}개. 같은 종목 중복 금지.
- 숫자는 시장 데이터 facts의 값만 사용. 임의 가공·추정·과장 금지.
- 종목명은 facts에 적힌 그대로 사용.
- 같은 섹터/테마(반도체·자동차·2차전지·방산 등) 종목이 2개 이상 동조하면 묶어 한 카드 (kind: "sector").
- 뉴스 헤드라인에서 facts 종목과 연결되는 내용 있으면 detail에 활용 OK (단, 종목명-헤드라인 매칭 확실할 때만).
- "투자하세요/매수 추천" 등 권유 표현 금지. "주목·강세·관심" 정도까지 허용.
- 자극 표현 금지 ("폭발·폭락"은 OK, "끝장났다·대박" 금지).
- detail에는 데이터 근거 1개 명시 (예: "거래대금 1위 · +1.93%", "전일대비 5배 폭증").
- JSON 외 텍스트 절대 포함 금지.`;

  const client = getOpenAI();
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "당신은 한국 경제/금융 뉴스 큐레이터 '픽앤(Pick-Ant)'입니다. " +
          "초보 투자자가 한눈에 이해할 수 있는 한국어로 답합니다. " +
          "투자 권유 / 단정적 예측은 금지하고, 사실에 기반한 한 줄 스토리만 만드세요.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { issues?: unknown[] };
  const arr = Array.isArray(parsed.issues) ? parsed.issues : [];
  return arr.slice(0, max).map((iss): TodayIssue => {
    const o = iss as Record<string, unknown>;
    return {
      kind: (typeof o.kind === "string" ? o.kind : "leader") as TodayIssue["kind"],
      emoji: typeof o.emoji === "string" ? o.emoji.slice(0, 4) : "•",
      title: typeof o.title === "string" ? o.title.slice(0, 80) : "",
      detail: typeof o.detail === "string" ? o.detail.slice(0, 120) : "",
    };
  });
}

/* ─────────────────────────────────────────
 * 유틸
 * ───────────────────────────────────────── */
function pct(p: number): string {
  const s = p >= 0 ? "+" : "";
  return `${s}${p.toFixed(2)}%`;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function bigintToCompact(v: bigint | null): number {
  if (!v) return 0;
  return Number(v);
}

/* ─────────────────────────────────────────
 * 오늘의 개미 팁 (변경 없음)
 * ───────────────────────────────────────── */
const ANT_TIPS: { emoji: string; tip: string }[] = [
  { emoji: "🔎", tip: "제목만 보고 거래 결정 금지. 본문 + 출처 + 다른 기사 교차확인." },
  { emoji: "🐢", tip: "급등주 추격매수는 위험. 한 박자 늦은 진입이 더 안전할 때가 많아요." },
  { emoji: "💡", tip: "거래대금 TOP은 보통 대형주 위주. 시장 흐름 파악에 가장 유용해요." },
  { emoji: "📊", tip: "거래량 1위가 KODEX 인버스면 시장이 하락에 베팅 중이라는 신호." },
  { emoji: "🧊", tip: "감정 매수는 손실의 시작. 사기 전에 손절가부터 정하기." },
  { emoji: "📰", tip: "호재 뉴스 = 이미 가격에 반영된 경우 多. 사고 나서 빠지는 이유." },
  { emoji: "🪙", tip: "한 종목에 전 재산 X. 최소 3~5종목 분산이 기본." },
  { emoji: "⏰", tip: "장 시작 30분은 변동성 최대. 초보는 10시 이후 거래가 안전해요." },
  { emoji: "📅", tip: "FOMC·실적발표 D-1은 보통 변동성 ↑. 큰 베팅은 미루기." },
  { emoji: "🚫", tip: "남의 추천 종목 따라 사면 책임도 못 받음. 본인 판단으로 결정." },
  { emoji: "💧", tip: "현금 비중 항상 일부 남기기. 급락장에 진짜 기회가 옴." },
  { emoji: "🔁", tip: "수익 났다고 비중 늘리지 말기. 다음 거래에서 다 토해낼 수 있음." },
];

export function getAntTipOfHour(now = new Date()): { emoji: string; tip: string } {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const dayHour =
    kst.getUTCFullYear() * 10000 +
    (kst.getUTCMonth() + 1) * 100 +
    kst.getUTCDate() +
    kst.getUTCHours() * 0.01;
  const idx = Math.abs(Math.floor(dayHour * 100)) % ANT_TIPS.length;
  return ANT_TIPS[idx];
}

/* ─────────────────────────────────────────
 * Backward compat — 기존 호출자용
 * ───────────────────────────────────────── */
export async function buildTodayIssues(max = 4): Promise<TodayIssue[]> {
  const facts = await fetchTodayFacts();
  return buildTodayIssuesRuleBased(facts, max);
}
