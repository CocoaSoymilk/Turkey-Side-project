import {
  fetchTrendKeywordsFromDb,
  saveTrendKeywordsToDb,
} from "./db";
import { searchNaverNews } from "./naver";
import { getHourlyBucket } from "./timeBucket";
import { buildTrendKeywords } from "./trendPipeline";
import type { NewsItem, TrendKeyword } from "./types";

const MIN_ARTICLES_PER_TREND = 3;
const MAX_ARTICLES_PER_TREND = 8;

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

async function hydrateCachedTrend(trend: TrendKeyword): Promise<TrendKeyword> {
  if (trend.articles.length >= MIN_ARTICLES_PER_TREND) {
    return {
      ...trend,
      articles: trend.articles.slice(0, MAX_ARTICLES_PER_TREND),
    };
  }

  try {
    const fetched = await searchNaverNews({
      query: trend.query || trend.keyword,
      display: 10,
      sort: "date",
    });
    return {
      ...trend,
      articles: dedupeNews([...trend.articles, ...fetched]).slice(
        0,
        MAX_ARTICLES_PER_TREND
      ),
    };
  } catch (error) {
    console.error("[trend:snapshot:hydrate]", trend.query, error);
    return {
      ...trend,
      articles: trend.articles.slice(0, MAX_ARTICLES_PER_TREND),
    };
  }
}

async function hydrateCachedTrends(
  trends: TrendKeyword[]
): Promise<TrendKeyword[]> {
  const hydrated: TrendKeyword[] = [];
  for (const trend of trends) {
    hydrated.push(await hydrateCachedTrend(trend));
  }
  return hydrated;
}

export async function getTrendSnapshotForCurrentHour(
  items: NewsItem[],
  topN = 8
): Promise<{ trends: TrendKeyword[]; baseTs: string; reused: boolean }> {
  const baseTs = getHourlyBucket();
  const cached = await fetchTrendKeywordsFromDb(baseTs, items, topN);

  if (cached.length > 0) {
    return { trends: await hydrateCachedTrends(cached), baseTs, reused: true };
  }

  const trends = await buildTrendKeywords(items, topN);
  await saveTrendKeywordsToDb(trends, baseTs);

  return { trends, baseTs, reused: false };
}
