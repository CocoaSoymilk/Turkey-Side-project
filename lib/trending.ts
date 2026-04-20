import type { NewsItem } from "./types";

const STOPWORDS = new Set<string>([
  "있다", "없다", "그리고", "그러나", "하지만", "이번", "오늘", "관련", "대한", "에서",
  "으로", "에서의", "이라고", "위해", "대해", "지난", "지난주", "이날", "최근", "통해",
  "따라", "동안", "이상", "이하", "기준", "전망", "예상", "강조", "발표", "밝혔다",
  "말했다", "전했다", "있는", "없는", "많은", "큰", "등", "및", "또", "위한", "것으로",
  "것이다", "했다", "됐다", "된다", "한다", "하는", "했던", "됐던", "이후", "시장",
  "경제", "증시", "뉴스", "기자", "코스피", "코스닥", "주식", "투자", "금리", "환율",
]);

const TOKEN_RE = /[가-힣A-Za-z0-9]{2,}/g;
const TITLE_WEIGHT = 2.7;
const BODY_WEIGHT = 1;
const RECENT_WINDOW_HOURS = 3;

const LOW_INFO_TERMS = new Set<string>([
  "상승", "하락", "급등", "급락", "반등", "약세", "강세", "마감", "출발", "혼조", "보합",
  "확대", "축소", "추가", "영향", "우려", "완화", "확산", "진정", "개선", "악화", "돌파",
  "회복", "유지", "진입", "회피", "매수", "매도", "거래", "수급", "변동성", "급변",
]);

const ORG_HINT_RE =
  /(은행|증권|전자|화학|그룹|금융|생명|보험|카드|정부|연준|한은|위원회|부처|공사|공단)$/;
const LOC_HINT_RE =
  /^(한국|미국|중국|일본|유럽|중동|서울|부산|러시아|우크라이나|대만|홍콩)$/;

export type TrendingKeyword = {
  keyword: string;
  score: number;
  articleCount: number;
  totalCount: number;
};

type Agg = {
  totalCount: number;
  articleIds: Set<string>;
  weightedTf: number;
  docFreq: number;
  titleTf: number;
  recencyScore: number;
  recentMentions: number;
  baselineMentions: number;
  entityBoost: number;
};

function normalizeToken(raw: string): string {
  return raw.trim().replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokenize(text: string): string[] {
  const matches = text.match(TOKEN_RE) || [];
  return matches
    .map(normalizeToken)
    .filter((w) => w.length >= 2)
    .filter((w) => !/^\d+$/.test(w))
    .filter((w) => !STOPWORDS.has(w))
    .filter((w) => !LOW_INFO_TERMS.has(w));
}

function inferEntityBoost(token: string): number {
  // 1. 영어 대문자로 된 종목/코드 (예: AAPL, HBM) -> 아주 높음
  if (/^[A-Z0-9]{2,8}$/.test(token)) return 1.5; 
  // 2. 주요 경제 주체 (금융, 증권 등) -> 높음
  if (ORG_HINT_RE.test(token)) return 1.3;
  // 3. '...주' (테마주, 관련주) -> 중간
  if (token.endsWith("주") && token.length > 2) return 1.1; 
  return 1;
}

function getRecencyWeight(pubDate: string): number {
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return 0.35;
  const hours = Math.max(0, (Date.now() - ts) / 3_600_000);
  if (hours < 4) return 1;
  if (hours < 12) return 0.8;
  if (hours < 24) return 0.65;
  if (hours < 48) return 0.5;
  return 0.35;
}

export function selectTrendingKeywords(
  items: NewsItem[],
  topN = 8
): TrendingKeyword[] {
  const agg = new Map<string, Agg>();
  const totalDocs = Math.max(1, items.length);

  for (const item of items) {
    const titleTokens = tokenize(item.cleanTitle);
    const descTokens = tokenize(item.cleanDescription);
    const titleTokenSet = new Set(titleTokens);
    const articleTokenSet = new Set<string>();
    const recencyWeight = getRecencyWeight(item.pubDate);
    const pubTs = Date.parse(item.pubDate);
    const hours = Number.isFinite(pubTs) ? Math.max(0, (Date.now() - pubTs) / 3_600_000) : 999;
    const isRecent = hours <= RECENT_WINDOW_HOURS;
    const titleCount = new Map<string, number>();
    const descCount = new Map<string, number>();

    for (const token of titleTokens) {
      titleCount.set(token, (titleCount.get(token) ?? 0) + 1);
      articleTokenSet.add(token);
    }
    for (const token of descTokens) {
      descCount.set(token, (descCount.get(token) ?? 0) + 1);
      articleTokenSet.add(token);
    }

    for (const token of articleTokenSet) {
      const cur = agg.get(token) ?? {
        totalCount: 0,
        articleIds: new Set<string>(),
        weightedTf: 0,
        docFreq: 0,
        titleTf: 0,
        recencyScore: 0,
        recentMentions: 0,
        baselineMentions: 0,
        entityBoost: inferEntityBoost(token),
      };
      const titleTokenCount = titleCount.get(token) ?? 0;
      const descTokenCount = descCount.get(token) ?? 0;
      cur.totalCount += titleTokenCount + descTokenCount;
      const tf =
        titleTokenCount * TITLE_WEIGHT +
        descTokenCount * BODY_WEIGHT;
      if (tf > 0) {
        cur.weightedTf += tf;
        cur.titleTf += titleTokenCount * TITLE_WEIGHT;
        cur.recencyScore += recencyWeight;
        if (isRecent) cur.recentMentions += tf;
        else cur.baselineMentions += tf;
      }
      if (titleTokenSet.has(token)) cur.titleTf += 0.2;
      agg.set(token, cur);
    }

    for (const token of articleTokenSet) {
      const cur = agg.get(token);
      if (cur) {
        cur.articleIds.add(item.id);
        cur.docFreq += 1;
      }
    }
  }

  return [...agg.entries()]
    .map(([keyword, v]) => {
      const articleCount = v.articleIds.size;
      const idf = Math.log((totalDocs + 1) / (v.docFreq + 1)) + 1;
      const tfidf = v.weightedTf * idf;
      const expectedRecent = v.baselineMentions / Math.max(1, totalDocs - articleCount);
      const velocityRaw = (v.recentMentions - expectedRecent) / Math.sqrt(expectedRecent + 1);
      const velocity = Math.max(0, velocityRaw);
      const score =
        (articleCount * 2.5) +      // 확산도 (여러 매체에서 다룸)
        (tfidf * 2.0) +             // 정보 가치 (흔하지 않은 단어)
        (v.titleTf * 1.5) +         // 주목도 (제목에 언급됨)
        (velocity * 3.0) +          // 시의성 (지금 막 쏟아짐) -> 이 값을 키우면 트렌드 반영이 빠릅니다.
        (v.entityBoost * 1.2);      // 고유 명사 여부
      if (articleCount < 2 && v.weightedTf < 4) {
        return null;
      }
      return {
        keyword,
        score: Number(score.toFixed(2)),
        articleCount,
        totalCount: v.totalCount,
      };
    })
    .filter((v): v is TrendingKeyword => v !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.articleCount !== a.articleCount) return b.articleCount - a.articleCount;
      return b.totalCount - a.totalCount;
    })
    .slice(0, topN);
}

export function extractTrendingKeywordNames(
  items: NewsItem[],
  topN = 8
): string[] {
  return selectTrendingKeywords(items, topN).map((k) => k.keyword);
}

export function filterNewsByKeyword(items: NewsItem[], keyword: string): NewsItem[] {
  if (!keyword.trim()) return items;
  const needle = keyword.toLowerCase();
  return items.filter((item) => {
    const haystack = `${item.cleanTitle} ${item.cleanDescription}`.toLowerCase();
    return haystack.includes(needle);
  });
}
