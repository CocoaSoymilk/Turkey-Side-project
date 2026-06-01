
import type { NewsItem } from "./types";

const STOPWORDS = new Set<string>([
  "그리고",
  "그러나",
  "이번",
  "오늘",
  "최근",
  "관련",
  "통해",
  "위해",
  "대한",
  "대해",
  "에서",
  "으로",
  "으로서",
  "라고",
  "한다",
  "했다",
  "있는",
  "없는",
  "기자",
  "뉴스",
  "경제",
  "증시",
  "시장",
  "주식",
  "투자",
  "금리",
  "환율",
  "코스피",
  "코스닥",
]);

const LOW_INFO_TERMS = new Set<string>([
  "상승",
  "하락",
  "급등",
  "급락",
  "반등",
  "강세",
  "약세",
  "마감",
  "출발",
  "보합",
  "전망",
  "추가",
  "영향",
  "우려",
  "완화",
  "확산",
  "개선",
  "악화",
  "진입",
  "거래",
  "변동성",
  "매수",
  "매도",
]);

const TOKEN_RE = /[가-힣A-Za-z0-9][가-힣A-Za-z0-9&.+-]{1,}/g;
const TITLE_WEIGHT = 2.7;
const BODY_WEIGHT = 1;
const RECENT_WINDOW_HOURS = 3;

const PARTICLE_RE =
  /(으로서|으로써|에게서|께서는|에서는|부터는|까지는|보다도|이라며|라고|으로|에서|에게|부터|까지|보다|처럼|만큼|조차|마저|이라|라고|은|는|이|가|을|를|의|에|와|과|도|만|로|와|과)$/;
const VERB_ENDING_RE =
  /(했다|한다|됐다|된다|하는|하며|하고|했다는|한다는|됐다며|되면서|하면서|한다며|했다고|된다고|했다고)$/;
const ORG_HINT_RE =
  /(증권|전자|화학|그룹|금융|생명|보험|카드|은행|공사|공단|산업|홀딩스|테크|바이오)$/;
const THEME_HINT_RE = /(반도체|배터리|자동차|조선|방산|원전|AI|HBM|로봇)$/i;

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

function stripKoreanSuffixes(value: string): string {
  let token = value;
  for (let i = 0; i < 2; i += 1) {
    const next = token.replace(VERB_ENDING_RE, "").replace(PARTICLE_RE, "");
    if (next === token) break;
    token = next;
  }
  return token;
}

function normalizeToken(raw: string): string {
  const token = raw.normalize("NFKC").trim().replace(/[^\p{L}\p{N}&.+-]+/gu, "");
  if (/^[가-힣]+$/.test(token)) return stripKoreanSuffixes(token);
  return token;
}

function isUsefulToken(token: string): boolean {
  if (token.length < 2) return false;
  if (/^\d+$/.test(token)) return false;
  if (/^[+-]?\d+(\.\d+)?%?$/.test(token)) return false;
  if (STOPWORDS.has(token)) return false;
  if (LOW_INFO_TERMS.has(token)) return false;
  return true;
}

function tokenize(text: string): string[] {
  const matches = text.match(TOKEN_RE) || [];
  return matches.map(normalizeToken).filter(isUsefulToken);
}

function inferEntityBoost(token: string): number {
  if (/^[A-Z0-9]{2,8}$/.test(token)) return 1.5;
  if (ORG_HINT_RE.test(token)) return 1.35;
  if (THEME_HINT_RE.test(token)) return 1.25;
  if (token.endsWith("주") && token.length > 2) return 1.15;
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
    const hours = Number.isFinite(pubTs)
      ? Math.max(0, (Date.now() - pubTs) / 3_600_000)
      : 999;
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

      const tf = titleTokenCount * TITLE_WEIGHT + descTokenCount * BODY_WEIGHT;
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
      const expectedRecent =
        v.baselineMentions / Math.max(1, totalDocs - articleCount);
      const velocityRaw =
        (v.recentMentions - expectedRecent) / Math.sqrt(expectedRecent + 1);
      const velocity = Math.max(0, velocityRaw);
      const score =
        articleCount * 2.5 +
        tfidf * 2.0 +
        v.titleTf * 1.5 +
        velocity * 3.0 +
        v.entityBoost * 1.2;

      if (articleCount < 2 && v.weightedTf < 4) return null;
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

export function filterNewsByKeyword(
  items: NewsItem[],
  keyword: string
): NewsItem[] {
  if (!keyword.trim()) return items;
  const needle = normalizeToken(keyword).toLowerCase();
  return items.filter((item) => {
    const haystack =
      `${item.cleanTitle} ${item.cleanDescription}`.toLowerCase();
    return haystack.includes(needle);
  });
}
