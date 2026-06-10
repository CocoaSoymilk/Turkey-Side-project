import { createClient } from "@supabase/supabase-js";
import { searchNaverNews } from "@/lib/naver";
import { summarizeMarket } from "@/lib/openai";
import { getIndexQuote, type IndexQuote } from "@/lib/kis";
import { getQuotes, type Quote } from "@/lib/market";
import { fetchRecentArticlesFromDb } from "@/lib/db";
import { getTrendSnapshotForCurrentHour } from "@/lib/trendSnapshot";
import { HOURLY_REVALIDATE_SECONDS } from "@/lib/timeBucket";
import { HeroCard, type HeroKpi } from "@/components/HeroCard";
import { TrendingKeywords } from "@/components/TrendingKeywords";
import { NewsTopicCards } from "@/components/NewsTopicCards";
import { Logo } from "@/components/Logo";
import { StockRankingsSidebar } from "@/components/StockRankingsSidebar";
import { AntTipsWidget } from "@/components/AntTipsWidget";
import { TodayIssueCard } from "@/components/TodayIssueCard";
import {
  fetchTodayFacts,
  buildTodayIssuesLLM,
  type TodayIssue,
} from "@/lib/today";
import type { NewsItem, TrendKeyword } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = HOURLY_REVALIDATE_SECONDS;
export const dynamic = "force-dynamic";

function hasFreshArticles(items: NewsItem[], maxAgeMs = 60 * 60 * 1000): boolean {
  const latest = items.reduce((max, item) => {
    const ts = Date.parse(item.pubDate);
    return Number.isFinite(ts) ? Math.max(max, ts) : max;
  }, 0);
  return latest > 0 && Date.now() - latest <= maxAgeMs;
}

async function fetchNewsItems(): Promise<NewsItem[]> {
  const dbItems = await fetchRecentArticlesFromDb(80);
  if (hasFreshArticles(dbItems)) return dbItems;

  const [market, macro] = await Promise.all([
    searchNaverNews({ query: "증시", display: 20, sort: "date" }),
    searchNaverNews({ query: "한국 금리", display: 10, sort: "date" }),
  ]);
  return [...market, ...macro];
}

async function fetchDashboard() {
  try {
    const [items, kospi, kosdaq, quotes, supabaseRes] = await Promise.all([
      fetchNewsItems(),
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
      supabase
        .from("stock_rank_snapshot")
        .select(
          "rank, code, name, price, change_pct, bucket, base_ts, volume:acml_volume"
        )
        .in("bucket", ["trade_value", "rise", "fall", "volume"])
        .order("base_ts", { ascending: false })
        .order("rank", { ascending: true }),
    ]);

    const { trends } = await getTrendSnapshotForCurrentHour(items, 8);

    let todayIssues: TodayIssue[] = [];
    try {
      const facts = await fetchTodayFacts();
      todayIssues = await buildTodayIssuesLLM(
        facts,
        items.map((i) => i.cleanTitle),
        4
      );
    } catch (e) {
      console.error("[today-issues]", e);
    }

    let heroText = "";
    try {
      heroText = await summarizeMarket(items.map((i) => i.cleanTitle));
    } catch {
      heroText = "";
    }

    return {
      items,
      trends,
      todayIssues,
      heroText,
      kospi: kospi as IndexQuote | null,
      kosdaq: kosdaq as IndexQuote | null,
      quotes,
      rankingsData: supabaseRes?.data || null,
      fetchedAt: new Date().toISOString(),
      error: null as string | null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      items: [] as NewsItem[],
      trends: [] as TrendKeyword[],
      todayIssues: [] as TodayIssue[],
      heroText: "",
      kospi: null as IndexQuote | null,
      kosdaq: null as IndexQuote | null,
      quotes: [] as Quote[],
      rankingsData: null,
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
  if (!q) return { label, value: "-", hint: "데이터 없음" };
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
  if (!q) return { label, value: "-", hint: "데이터 없음" };
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
    trends,
    todayIssues,
    heroText,
    kospi,
    kosdaq,
    quotes,
    rankingsData,
    fetchedAt,
    error,
  } = await fetchDashboard();

  const latestTimestamp =
    rankingsData && rankingsData.length > 0 ? rankingsData[0].base_ts : null;
  const latestRankingsData =
    rankingsData && latestTimestamp
      ? rankingsData.filter((item: any) => item.base_ts === latestTimestamp)
      : null;

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const fallbackHero =
    "오늘의 시장은 주요 경제 이슈와 시장 변동성을 중심으로 움직이고 있습니다.";
  const topCards = items.slice(0, 8);
  const kpis: HeroKpi[] = [
    indexToKpi(kospi, "KOSPI"),
    indexToKpi(kosdaq, "KOSDAQ"),
    quoteToKpi(quotes, "nasdaq", "NASDAQ"),
    quoteToKpi(quotes, "usdkrw", "USD/KRW", 2),
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto pl-[57px] pr-8 py-4 flex items-center justify-between">
          <Logo variant="light" />
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-8 py-10">
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm mb-6">
            뉴스 API 호출에 실패했습니다: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <HeroCard
              date={today}
              text={heroText || fallbackHero}
              kpis={kpis}
              fetchedAt={fetchedAt}
            />

            <section className="card p-5 md:p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] text-blue-700">
                    N
                  </span>
                  실시간 뉴스 토픽
                </h2>
              </div>
              <NewsTopicCards items={topCards} />
            </section>

            <div className="space-y-6">
              <TrendingKeywords trends={trends} items={items.slice(0, 14)} />
            </div>
          </div>

          <aside className="space-y-6">
            <TodayIssueCard issues={todayIssues} />
            <StockRankingsSidebar rankingsData={latestRankingsData} />
            <div className="space-y-4">
              <section className="overflow-hidden relative rounded-2xl">
                <AntTipsWidget />
              </section>
            </div>
          </aside>
        </div>

        <footer className="pt-10 text-center text-xs text-slate-400">
          Pick-Ant · News via Naver OpenAPI · Market via KIS/Yahoo Finance · AI
          via OpenAI
        </footer>
      </div>
    </main>
  );
}
