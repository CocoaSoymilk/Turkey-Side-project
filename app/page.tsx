import { createClient } from '@supabase/supabase-js'
import { searchNaverNews } from "@/lib/naver";
import { summarizeMarket } from "@/lib/openai";
import { getIndexQuote, type IndexQuote } from "@/lib/kis";
import { getQuotes, type Quote } from "@/lib/market";
import { fetchRecentArticlesFromDb, saveTrendKeywordsToDb } from "@/lib/db";
import { buildTrendKeywords } from "@/lib/trendPipeline";
import { HeroCard, type HeroKpi } from "@/components/HeroCard";
import { TrendingKeywords } from "@/components/TrendingKeywords";
import { NewsCard } from "@/components/NewsCard";
import { Logo } from "@/components/Logo";

import type { NewsItem, TrendKeyword } from "@/lib/types";
import { StockRankingsSidebar } from "@/components/StockRankingsSidebar";
import { AntTipsWidget } from "@/components/AntTipsWidget";
import { TodayIssueCard } from "@/components/TodayIssueCard";
import { fetchTodayFacts, buildTodayIssuesLLM, type TodayIssue } from "@/lib/today";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const revalidate = 60;
export const dynamic = "force-dynamic";

async function fetchDashboard() {
  try {
   
    const [dbItems, market, macro, kospi, kosdaq, quotes, supabaseRes] = await Promise.all([
              fetchRecentArticlesFromDb(80),

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
      supabase
      .from('stock_rank_snapshot')
      // ⭐ [수정 완료] 수집기가 담아두는 진짜 누적 거래량 컬럼인 'volume:acml_volume'을 select 절에 명시적으로 추가
      .select('rank, code, name, price, change_pct, bucket, base_ts, volume:acml_volume')
      .in('bucket', ['trade_value', 'rise', 'fall', 'volume']) 
      .order('base_ts', { ascending: false })
      .order('rank', { ascending: true })
    ]);


    const items: NewsItem[] = dbItems.length > 0 ? dbItems : [...market, ...macro];
    const trends = await buildTrendKeywords(items, 8);
    await saveTrendKeywordsToDb(trends);

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

  const latestTimestamp = rankingsData && rankingsData.length > 0 ? rankingsData[0].base_ts : null;

  const latestRankingsData = rankingsData && latestTimestamp ? rankingsData.filter((item: any) => item.base_ts === latestTimestamp) : null;

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

      {/* 1600px 중앙 정렬 컨테이너 */}
      <div className="mx-auto max-w-[1600px] px-8 py-10">
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm mb-6">
            뉴스 API 호출에 실패했습니다: {error}
          </div>
        )}

        {/* 🌟 2분할 대형 레이아웃 시작 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* =========================================================
              LEFT COLUMN: 메인 콘텐츠 영역 (lg:col-span-2)
             ========================================================= */}
          <div className="lg:col-span-2 space-y-6">

            {/* <TrendingKeywords trends={trends} items={items} /> */}

            {/* [층 1] KPI & AI 요약 (HeroCard) */}
            <HeroCard
              date={today}
              text={heroText || fallbackHero}
              kpis={kpis}
              fetchedAt={fetchedAt}
            />

            {/* [층 2] 복구 완료: 실시간 뉴스 토픽 섹션 */}
            <section className="card p-5 md:p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] text-blue-700">
                    N
                  </span>
                  실시간 뉴스 토픽
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topCards.length > 0 ? (
                  topCards.map((it, idx) => (
                    <NewsCard key={it.id} item={it} rank={idx + 1} />
                  ))
                ) : (
                  <EmptyCards />
                )}
              </div>
            </section>

            {/* [층 3] 최하단 트렌딩 키워드 섹션 */}
            <div className="space-y-6">
              <TrendingKeywords trends={trends} items={items.slice(0, 14)} />
            </div>

          </div>

          {/* =========================================================
              RIGHT COLUMN: 사이드바 콘텐츠 영역 (aside)
             ========================================================= */}
          <aside className="space-y-6">
            
            {/* [층 1] 오늘의 이슈 (feature/today-insights 로직) */}
            <TodayIssueCard issues={todayIssues} />

            {/* [층 2] 종목 랭킹 리스트 섹션 */}
            <StockRankingsSidebar rankingsData={latestRankingsData} />

            {/* [층 3] 오늘의 개미 명언 위젯 */}
            <div className="space-y-4">
              <section className="overflow-hidden relative rounded-2xl">
                <AntTipsWidget />
              </section>
            </div>

          </aside>
        </div>

        <footer className="pt-10 text-center text-xs text-slate-400">
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
