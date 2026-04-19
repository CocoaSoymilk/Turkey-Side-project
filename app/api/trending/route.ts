import { NextRequest, NextResponse } from "next/server";
import { searchNaverNews } from "@/lib/naver";
import { summarizeMarket } from "@/lib/openai";

export const runtime = "nodejs";
export const revalidate = 600;

// Simple Korean-aware keyword extractor (stopword + frequency)
const STOPWORDS = new Set<string>([
  "있다", "없다", "그리고", "그러나", "하지만", "이번", "오늘", "관련", "대한", "에서",
  "으로", "에서의", "이라고", "위해", "대해", "지난", "지난주", "이날", "최근", "통해",
  "따라", "동안", "이상", "이하", "기준", "전망", "예상", "강조", "발표", "밝혔다",
  "말했다", "전했다", "있는", "없는", "많은", "큰", "등", "및", "또", "위한", "것으로",
  "것이다", "했다", "됐다", "된다", "한다", "하는", "했던", "됐던", "이후",
]);

function extractKeywords(texts: string[], topN = 8): string[] {
  const counts = new Map<string, number>();
  const tokenRe = /[가-힣A-Za-z0-9]{2,}/g;
  for (const t of texts) {
    const matches = t.match(tokenRe) || [];
    for (const raw of matches) {
      const w = raw.trim();
      if (w.length < 2) continue;
      if (/^\d+$/.test(w)) continue;
      if (STOPWORDS.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([k]) => k);
}

export async function GET(_req: NextRequest) {
  try {
    const [market, stocks] = await Promise.all([
      searchNaverNews({ query: "증시", display: 20, sort: "date" }),
      searchNaverNews({ query: "한국은행 금리", display: 10, sort: "date" }),
    ]);
    const items = [...market, ...stocks];
    const texts = items.map((i) => `${i.cleanTitle} ${i.cleanDescription}`);
    const keywords = extractKeywords(texts, 8);
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
