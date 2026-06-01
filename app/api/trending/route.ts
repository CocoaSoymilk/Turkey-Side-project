import { NextRequest, NextResponse } from "next/server";
import { searchNaverNews } from "@/lib/naver";
import { summarizeMarket } from "@/lib/openai";
import { fetchRecentArticlesFromDb } from "@/lib/db";
import { getTrendSnapshotForCurrentHour } from "@/lib/trendSnapshot";
import { HOURLY_REVALIDATE_SECONDS } from "@/lib/timeBucket";
import type { NewsItem } from "@/lib/types";

export const runtime = "nodejs";
export const revalidate = HOURLY_REVALIDATE_SECONDS;
export const dynamic = "force-dynamic";

function hasFreshArticles(items: NewsItem[], maxAgeMs = 60 * 60 * 1000): boolean {
  const latest = items.reduce((max, item) => {
    const ts = Date.parse(item.pubDate);
    return Number.isFinite(ts) ? Math.max(max, ts) : max;
  }, 0);
  return latest > 0 && Date.now() - latest <= maxAgeMs;
}

export async function GET(_req: NextRequest) {
  try {
    const dbItems = await fetchRecentArticlesFromDb(80);
    const useDbItems = hasFreshArticles(dbItems);
    let fallbackItems: NewsItem[] = [];

    if (!useDbItems) {
      const [market, stocks] = await Promise.all([
        searchNaverNews({ query: "증시", display: 20, sort: "date" }),
        searchNaverNews({ query: "한국 금리", display: 10, sort: "date" }),
      ]);
      fallbackItems = [...market, ...stocks];
    }

    const items = useDbItems ? dbItems : fallbackItems;
    const { trends, baseTs, reused } = await getTrendSnapshotForCurrentHour(
      items,
      8
    );

    let heroText = "";
    try {
      heroText = await summarizeMarket(items.map((i) => i.cleanTitle));
    } catch {
      heroText = "";
    }

    const topItems = items.slice(0, 6);
    return NextResponse.json({
      heroText,
      trends,
      keywords: trends.map((trend) => trend.keyword),
      topItems,
      baseTs,
      reused,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
