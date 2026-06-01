import {
  fetchTrendKeywordsFromDb,
  saveTrendKeywordsToDb,
} from "./db";
import { getHourlyBucket } from "./timeBucket";
import { buildTrendKeywords } from "./trendPipeline";
import type { NewsItem, TrendKeyword } from "./types";

export async function getTrendSnapshotForCurrentHour(
  items: NewsItem[],
  topN = 8
): Promise<{ trends: TrendKeyword[]; baseTs: string; reused: boolean }> {
  const baseTs = getHourlyBucket();
  const cached = await fetchTrendKeywordsFromDb(baseTs, items, topN);

  if (cached.length > 0) {
    return { trends: cached, baseTs, reused: true };
  }

  const trends = await buildTrendKeywords(items, topN);
  await saveTrendKeywordsToDb(trends, baseTs);

  return { trends, baseTs, reused: false };
}
