import { searchNaverNews } from "./naver";
import { generateTrendKeywords } from "./openai";
import {
  extractTrendingKeywordNames,
  filterNewsByKeyword,
  selectTrendingKeywords,
} from "./trending";
import type { LlmTrendKeyword, NewsItem, TrendKeyword } from "./types";

const DEFAULT_TREND_COUNT = 8;
const MIN_ARTICLES_PER_TREND = 3;
const MAX_ARTICLES_PER_TREND = 8;

function slugTrendId(keyword: string, index: number): string {
  const slug =
    keyword
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || `trend-${index + 1}`;
  return `${slug}-${index + 1}`;
}

function normalizeKeyword(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function dedupeNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const result: NewsItem[] = [];
  for (const item of items) {
    const key = item.id || item.link || item.cleanTitle;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function normalizeLlmTrends(
  raw: LlmTrendKeyword[],
  topN: number
): LlmTrendKeyword[] {
  const seen = new Set<string>();
  const trends: LlmTrendKeyword[] = [];

  for (const item of raw) {
    const keyword = normalizeKeyword(String(item.keyword ?? ""));
    if (keyword.length < 2) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    trends.push({
      keyword,
      query: normalizeKeyword(String(item.query || keyword)),
      summary: String(item.summary ?? "").trim(),
      evidenceTitles: Array.isArray(item.evidenceTitles)
        ? item.evidenceTitles.map(String).filter(Boolean).slice(0, 5)
        : [],
    });
  }

  return trends.slice(0, topN);
}

function buildRuleFallback(items: NewsItem[], topN: number): LlmTrendKeyword[] {
  return extractTrendingKeywordNames(items, topN).map((keyword) => ({
    keyword,
    query: keyword,
    summary: "",
    evidenceTitles: filterNewsByKeyword(items, keyword)
      .slice(0, 3)
      .map((item) => item.cleanTitle),
  }));
}

function scoreArticleForTrend(item: NewsItem, trend: LlmTrendKeyword): number {
  const title = item.cleanTitle.toLowerCase();
  const desc = item.cleanDescription.toLowerCase();
  const keyword = trend.keyword.toLowerCase();
  const query = trend.query.toLowerCase();
  let score = 0;
  if (title.includes(keyword)) score += 5;
  if (title.includes(query)) score += 4;
  if (desc.includes(keyword)) score += 2;
  if (desc.includes(query)) score += 1;
  for (const evidenceTitle of trend.evidenceTitles) {
    if (evidenceTitle && title === evidenceTitle.toLowerCase()) score += 6;
  }
  const publishedAt = Date.parse(item.pubDate);
  if (Number.isFinite(publishedAt)) {
    score += Math.max(0, 2 - (Date.now() - publishedAt) / 86_400_000);
  }
  return score;
}

function attachExistingArticles(
  trend: LlmTrendKeyword,
  items: NewsItem[]
): NewsItem[] {
  return items
    .map((item) => ({ item, score: scoreArticleForTrend(item, trend) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
    .slice(0, MAX_ARTICLES_PER_TREND);
}

async function hydrateArticles(
  trend: LlmTrendKeyword,
  existingArticles: NewsItem[]
): Promise<NewsItem[]> {
  if (existingArticles.length >= MIN_ARTICLES_PER_TREND) {
    return existingArticles.slice(0, MAX_ARTICLES_PER_TREND);
  }

  try {
    const fetched = await searchNaverNews({
      query: trend.query || trend.keyword,
      display: 10,
      sort: "date",
    });
    return dedupeNews([...existingArticles, ...fetched]).slice(
      0,
      MAX_ARTICLES_PER_TREND
    );
  } catch (error) {
    console.error("[trend:hydrate]", trend.query, error);
    return existingArticles.slice(0, MAX_ARTICLES_PER_TREND);
  }
}

export async function buildTrendKeywords(
  items: NewsItem[],
  topN = DEFAULT_TREND_COUNT
): Promise<TrendKeyword[]> {
  const fallback = buildRuleFallback(items, topN);
  let llmTrends: LlmTrendKeyword[] = [];

  try {
    llmTrends = normalizeLlmTrends(await generateTrendKeywords(items, topN), topN);
  } catch (error) {
    console.error("[trend:llm]", error);
  }

  const candidates = llmTrends.length > 0 ? llmTrends : fallback;
  const rankedFallback = selectTrendingKeywords(items, topN);

  const trends = await Promise.all(
    candidates.map(async (candidate, index) => {
      const existingArticles = attachExistingArticles(candidate, items);
      const articles = await hydrateArticles(candidate, existingArticles);
      const fallbackScore =
        rankedFallback.find((item) => item.keyword === candidate.keyword)?.score ??
        topN - index;

      return {
        id: slugTrendId(candidate.keyword, index),
        keyword: candidate.keyword,
        query: candidate.query || candidate.keyword,
        summary: candidate.summary,
        score: fallbackScore,
        source: llmTrends.length > 0 ? "llm" : "rules",
        evidenceTitles: candidate.evidenceTitles,
        articles,
      } satisfies TrendKeyword;
    })
  );

  return trends.filter((trend) => trend.articles.length > 0).slice(0, topN);
}
