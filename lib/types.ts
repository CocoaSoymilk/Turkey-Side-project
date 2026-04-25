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
  /** * [추가] 실시간 조회수 데이터
   * DB와 연동 전에는 undefined일 수 있으므로 선택적 속성으로 정의.
   */
  viewCount?: number; 
};

export type SummaryResult = {
  summary: string[];
  keywords: string[];
  glossary: { term: string; definition: string }[];
};