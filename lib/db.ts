import { idFromLink, stripHtml } from "./naver";
import type { NewsItem, TrendKeyword } from "./types";

const SUPABASE_REST_PATH = "/rest/v1";

type DbConfig = {
  url: string;
  key: string;
  newsTable: string;
  newsRawTable: string;
  issueTable: string;
  issueNewsTable: string;
};

function getDbConfig(): DbConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return {
    url: url.replace(/\/$/, ""),
    key,
    newsTable: process.env.SUPABASE_NEWS_TABLE ?? "news",
    newsRawTable: process.env.SUPABASE_NEWS_RAW_TABLE ?? "news_raw",
    issueTable: process.env.SUPABASE_ISSUE_TABLE ?? "issue",
    issueNewsTable: process.env.SUPABASE_ISSUE_NEWS_TABLE ?? "issue_news",
  };
}

async function supabaseFetch(
  config: DbConfig,
  table: string,
  init?: RequestInit & {
    search?: URLSearchParams;
    next?: { revalidate?: number };
  }
): Promise<Response> {
  const url = new URL(`${config.url}${SUPABASE_REST_PATH}/${table}`);
  if (init?.search) {
    init.search.forEach((value, key) => url.searchParams.set(key, value));
  }
  return fetch(url.toString(), {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=merge-duplicates",
      ...(init?.headers ?? {}),
    },
  });
}

function pickString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function rawJsonToRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function toNewsItem(
  row: Record<string, unknown>,
  rawById = new Map<string, Record<string, unknown>>()
): NewsItem | null {
  const raw = rawById.get(String(row.raw_id ?? "")) ?? {};
  const title = pickString(row, ["cleanTitle", "clean_title", "title"]);
  if (!title) return null;
  const link =
    pickString(raw, ["link", "url", "article_url", "naver_url"]) ||
    pickString(row, ["link", "url", "article_url", "naver_url"]) ||
    pickString(raw, ["originallink", "original_link", "source_url"]) ||
    pickString(row, ["originallink", "original_link", "source_url"]);
  const originalLink =
    pickString(raw, ["originallink", "original_link", "source_url"]) ||
    pickString(row, ["originallink", "original_link", "source_url"]) ||
    link;
  const id = pickString(row, ["id", "article_id"]) || idFromLink(link || title);
  const description =
    pickString(row, ["body", "summary_3line", "cleanDescription", "clean_description"]) ||
    pickString(raw, ["cleanDescription", "clean_description", "description"]);

  return {
    title,
    originallink: originalLink,
    link,
    description,
    pubDate:
      pickString(row, ["pub_dt", "pubDate", "pub_date", "published_at"]) ||
      pickString(raw, ["pubDate", "pub_date", "published_at"]) ||
      pickString(row, ["created_at", "updated_at"]),
    id,
    cleanTitle: stripHtml(title),
    cleanDescription: stripHtml(description),
    source:
      pickString(row, ["publisher", "source", "provider"]) ||
      pickString(raw, ["source", "publisher", "provider"]),
  };
}

export async function fetchRecentArticlesFromDb(limit = 80): Promise<NewsItem[]> {
  const config = getDbConfig();
  if (!config) return [];

  try {
    const search = new URLSearchParams();
    search.set("select", "*");
    search.set("limit", String(limit));
    search.set("order", "pub_dt.desc.nullslast");
    const res = await supabaseFetch(config, config.newsTable, {
      method: "GET",
      search,
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Record<string, unknown>[];
    const rawIds = rows
      .map((row) => row.raw_id)
      .filter((id): id is number | string => id !== null && id !== undefined)
      .map(String);
    const rawById = new Map<string, Record<string, unknown>>();

    if (rawIds.length > 0) {
      const rawSearch = new URLSearchParams();
      rawSearch.set("select", "id,link,raw_json");
      rawSearch.set("id", `in.(${rawIds.join(",")})`);
      const rawRes = await supabaseFetch(config, config.newsRawTable, {
        method: "GET",
        search: rawSearch,
        next: { revalidate: 300 },
      });
      if (rawRes.ok) {
        const rawRows = (await rawRes.json()) as Record<string, unknown>[];
        for (const rawRow of rawRows) {
          const rawJson = rawJsonToRecord(rawRow.raw_json);
          if (typeof rawRow.link === "string" && !rawJson.link) {
            rawJson.link = rawRow.link;
          }
          rawById.set(String(rawRow.id), rawJson);
        }
      }
    }

    return rows
      .map((row) => toNewsItem(row, rawById))
      .filter((item): item is NewsItem => item !== null)
      .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
      .slice(0, limit);
  } catch (error) {
    console.error("[db:articles]", error);
    return [];
  }
}

export async function saveTrendKeywordsToDb(
  trends: TrendKeyword[]
): Promise<void> {
  const config = getDbConfig();
  if (!config || trends.length === 0) return;

  try {
    const trendRows = trends.map((trend, index) => ({
      title: trend.keyword,
      score: trend.score,
      base_ts: new Date().toISOString(),
      keywords: [trend.keyword, trend.query, ...trend.evidenceTitles]
        .filter(Boolean)
        .slice(0, 8),
    }));
    const trendRes = await supabaseFetch(config, config.issueTable, {
      method: "POST",
      body: JSON.stringify(trendRows),
    });
    if (!trendRes.ok) return;

    const insertedIssues = (await trendRes.json()) as Array<{ id?: number }>;

    const mappingRows = trends.flatMap((trend, trendIndex) =>
      trend.articles
        .map((article, articleIndex) => {
          const issueId = insertedIssues[trendIndex]?.id;
          const newsId = Number(article.id);
          if (!issueId || !Number.isInteger(newsId)) return null;
          return {
            issue_id: issueId,
            news_id: newsId,
            match_score: Math.max(0, trend.score - articleIndex),
          };
        })
        .filter((row): row is {
          issue_id: number;
          news_id: number;
          match_score: number;
        } => row !== null)
    );
    if (mappingRows.length > 0) {
      await supabaseFetch(config, config.issueNewsTable, {
        method: "POST",
        body: JSON.stringify(mappingRows),
      });
    }
  } catch (error) {
    console.error("[db:trends:save]", error);
  }
}
