export type NaverNewsItem = {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
};

export type NewsItem = NaverNewsItem & {
  id: string;
  dbId?: number;
  cleanTitle: string;
  cleanDescription: string;
  source: string;
  keywords?: string[];
};

export type TrendKeyword = {
  id: string;
  keyword: string;
  query: string;
  summary: string;
  score: number;
  source: "llm" | "rules";
  evidenceTitles: string[];
  articles: NewsItem[];
};

export type LlmTrendKeyword = {
  keyword: string;
  query: string;
  summary: string;
  evidenceTitles: string[];
};

export type SummaryResult = {
  summary: string[];
  keywords: string[];
  glossary: { term: string; definition: string }[];
};
