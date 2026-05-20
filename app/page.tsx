import { searchNaverNews } from "@/lib/naver";
import { summarizeMarket } from "@/lib/openai";
import { getIndexQuote, type IndexQuote } from "@/lib/kis";
import { getQuotes, type Quote } from "@/lib/market";
import { HeroCard, type HeroKpi } from "@/components/HeroCard";
import { TrendingKeywords } from "@/components/TrendingKeywords";
import { NewsCard } from "@/components/NewsCard";
import { Logo } from "@/components/Logo";
import { TodayIssueCard } from "@/components/TodayIssueCard";
import { TodayRankCard } from "@/components/TodayRankCard";
import { AntTipCard } from "@/components/AntTipCard";
import type { NewsItem } from "@/lib/types";
import { extractTrendingKeywordNames } from "@/lib/trending";
import { readTradeValueTop, readLatestSnapshotTs, type RankRow } from "@/lib/rank";
import {
  fetchTodayFacts,
  buildTodayIssuesLLM,
  getAntTipOfHour,
  type TodayIssue,
} from "@/lib/today";

export const revalidate = 60;

async function fetchDashboard() {
  try {
    // Phase 1: 외부 데이터 + DB facts 병렬 fetch
    const [
      market,
      macro,
      kospi,
      kosdaq,
      quotes,
      facts,
      trade,
      snapshotTs,
    ] = await Promise.all([
      searchNaverNews({ query: "증시", display: 20, sort: "date" }),
      searchNaverNews({ query: "한국은행 금리", display: 10, sort: "date" }),
      getIndexQuote("kospi").catch((e) => {
        console.error("[kis:kospi]", e);
        return null;
      }),
      getIndexQuote("kosdaq").catch((e) => {
        console.error("[kis:kosdaq]", e);
        return null;
      }),
      getQuotes(["nasdaq", "vix", "usdkrw"]).catch((e) => {
        console.error("[yfinance]", e);
        return [] as Quote[];
      }),
      fetchTodayFacts().catch((e) => {
        console.error("[today-facts]", e);
        return null;
      }),
      readTradeValueTop(5).catch((e) => {
        console.error("[trade-value]", e);
        return [] as RankRow[];
      }),
      readLatestSnapshotTs().catch(() => null),
    ]);

    // Phase 2: facts + 뉴스 헤드라인을 LLM에 넘겨 이슈 스토리 생성
    const headlines = [...market, ...macro].map((i) => i.cleanTitle);
    const issues: TodayIssue[] = facts
      ? await buildTodayIssuesLLM(facts, headlines, 4).catch((e) => {
          console.error("[today-issues:llm]", e);
          return [] as TodayIssue[];
        })
      : [];
    const items: NewsItem[] = [...market, ...macro];
    const keywords = extractTrendingKeywordNames(items, 8);
    let heroText = "";
    try {
      heroText = await summarizeMarket(items.map((i) => i.cleanTitle));
    } catch {
      heroText = "";
    }
    return {
      items,
      keywords,
      heroText,
      kospi: kospi as IndexQuote | null,
      kosdaq: kosdaq as IndexQuote | null,
      quotes,
      issues,
      trade,
      snapshotTs,
      fetchedAt: new Date().toISOString(),
      error: null as string | null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      items: [] as NewsItem[],
      keywords: [] as string[],
      heroText: "",
      kospi: null as IndexQuote | null,
      kosdaq: null as IndexQuote | null,
      quotes: [] as Quote[],
      issues: [] as TodayIssue[],
      trade: [] as RankRow[],
      snapshotTs: null as Date | null,
      fetchedAt: new Date().toISOString(),
      error: msg,
    };
  }
}

function formatPrice(n: number, decimals = 2): string {
  return n.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function indexToKpi(q: IndexQuote | null, label: string): HeroKpi {
  if (!q) return { label, value: "—", hint: "데이터 없음" };
  return {
    label,
    value: formatPrice(q.price),
    change: `${q.change >= 0 ? "+" : ""}${formatPrice(q.change)}`,
    changePct: q.changePct,
    sign: q.sign,
  };
}

function quoteToKpi(
  quotes: Quote[],
  key: Quote["key"],
  label: string,
  decimals = 2
): HeroKpi {
  const q = quotes.find((x) => x.key === key);
  if (!q) return { label, value: "—", hint: "데이터 없음" };
  return {
    label,
    value: formatPrice(q.price, decimals),
    change: `${q.change >= 0 ? "+" : ""}${formatPrice(q.change, decimals)}`,
    changePct: q.changePct,
    sign: q.sign,
  };
}

export default async function Home() {
  const {
    items,
    keywords,
    heroText,
    kospi,
    kosdaq,
    quotes,
    issues,
    trade,
    snapshotTs,
    fetchedAt,
    error,
  } = await fetchDashboard();
  const antTip = getAntTipOfHour();
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const fallbackHero =
    "오늘의 시장은 '주요 경제 이슈'와 '시장 변동성'에 주목하고 있습니다.";
  const topCards = items.slice(0, 4);

  const kpis: HeroKpi[] = [
    indexToKpi(kospi, "KOSPI"),
    indexToKpi(kosdaq, "KOSDAQ"),
    quoteToKpi(quotes, "nasdaq", "NASDAQ"),
    quoteToKpi(quotes, "usdkrw", "USD/KRW", 2),
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Top bar */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto px-6 py-6 flex items-center justify-between">
          <Logo variant="light" />
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-8 py-10 space-y-6">
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
            뉴스 API 호출에 실패했습니다: {error}
          </div>
        )}

        <HeroCard
          date={today}
          text={heroText || fallbackHero}
          kpis={kpis}
          fetchedAt={fetchedAt}
        />

        {/* Issue-weighted cards */}
        <section className="card p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] text-blue-700">
                N
              </span>
              실시간 뉴스 토픽
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {topCards.length > 0 ? (
              topCards.map((it, idx) => (
                <NewsCard key={it.id} item={it} rank={idx + 1} />
              ))
            ) : (
              <EmptyCards />
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TrendingKeywords keywords={keywords} items={items.slice(0, 14)} />
          </div>

          <aside className="space-y-4">
            <TodayIssueCard issues={issues} />
            <TodayRankCard rows={trade} fetchedAt={snapshotTs} />
            <AntTipCard emoji={antTip.emoji} tip={antTip.tip} />
          </aside>
        </div>

        <footer className="pt-6 text-center text-xs text-slate-500">
          © Pick-Ant · News via Naver OpenAPI · Market via KIS/Yahoo Finance · AI via OpenAI
        </footer>
      </div>
    </main>
  );
}

function EmptyCards() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-dashed border-slate-200 h-32 flex items-center justify-center text-xs text-slate-400"
        >
          카드 {i + 1}
        </div>
      ))}
    </>
  );
}
