export type NaverNewsItem = {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
};

export type NewsItem = NaverNewsItem & {
  id: string;
  cleanTitle: string;
  cleanDescription: string;
  source: string;
  keywords?: string[];
};

export type SummaryResult = {
  summary: string[];
  keywords: string[];
  glossary: { term: string; definition: string }[];
};
