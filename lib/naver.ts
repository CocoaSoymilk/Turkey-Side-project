import type { NaverNewsItem, NewsItem } from "./types";

const BASE = "https://openapi.naver.com/v1/search/news.json";

export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function extractSource(link: string, originalLink: string): string {
  try {
    const host = new URL(originalLink || link).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return "";
  }
}

export function idFromLink(link: string): string {
  // Stable base64url-ish id from URL
  return Buffer.from(link).toString("base64url").slice(0, 24);
}

export async function searchNaverNews(params: {
  query: string;
  display?: number;
  start?: number;
  sort?: "sim" | "date";
}): Promise<NewsItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Naver API credentials are not configured");
  }
  const url = new URL(BASE);
  url.searchParams.set("query", params.query);
  url.searchParams.set("display", String(params.display ?? 20));
  url.searchParams.set("start", String(params.start ?? 1));
  url.searchParams.set("sort", params.sort ?? "date");

  const res = await fetch(url.toString(), {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    // Cache on the server for 5 minutes to avoid hitting rate limits
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Naver API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { items: NaverNewsItem[] };

  return (data.items || []).map((it) => ({
    ...it,
    id: idFromLink(it.link || it.originallink),
    cleanTitle: stripHtml(it.title),
    cleanDescription: stripHtml(it.description),
    source: extractSource(it.link, it.originallink),
  }));
}
