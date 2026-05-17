import { NextRequest, NextResponse } from "next/server";
import { searchNaverNews } from "@/lib/naver";
import { summarizeMarket } from "@/lib/openai";
import { selectTrendingKeywords } from "@/lib/trending";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET(_req: NextRequest) {
  try {
    const [market, stocks] = await Promise.all([
      searchNaverNews({ query: "증시", display: 20, sort: "date" }),
      searchNaverNews({ query: "한국은행 금리", display: 10, sort: "date" }),
    ]);
    const items = [...market, ...stocks];
    const keywords = selectTrendingKeywords(items, 8).map((k) => k.keyword);
    let heroText = "";
    try {
      heroText = await summarizeMarket(items.map((i) => i.cleanTitle));
    } catch {
      heroText = "";
    }
    // Top N issue-weighted items = most recent from merged stream
    const topItems = items.slice(0, 6);
    return NextResponse.json({ heroText, keywords, topItems });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
