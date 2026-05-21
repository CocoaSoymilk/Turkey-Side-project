import { NextRequest, NextResponse } from "next/server";
import { searchNaverNews } from "@/lib/naver";
import { summarizeMarket } from "@/lib/openai";
import { fetchRecentArticlesFromDb, saveTrendKeywordsToDb } from "@/lib/db";
import { buildTrendKeywords } from "@/lib/trendPipeline";

export const runtime = "nodejs";
export const revalidate = 600;
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const [dbItems, market, stocks] = await Promise.all([
      fetchRecentArticlesFromDb(80),
      searchNaverNews({ query: "증시", display: 20, sort: "date" }),
      searchNaverNews({ query: "한국은행 금리", display: 10, sort: "date" }),
    ]);
    const items = dbItems.length > 0 ? dbItems : [...market, ...stocks];
    const trends = await buildTrendKeywords(items, 8);
    await saveTrendKeywordsToDb(trends);
    let heroText = "";
    try {
      heroText = await summarizeMarket(items.map((i) => i.cleanTitle));
    } catch {
      heroText = "";
    }
    // Top N issue-weighted items = most recent from merged stream
    const topItems = items.slice(0, 6);
    return NextResponse.json({
      heroText,
      trends,
      keywords: trends.map((trend) => trend.keyword),
      topItems,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
