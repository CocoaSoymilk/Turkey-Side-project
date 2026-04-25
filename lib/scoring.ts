import type { NewsItem } from "./types";

// 1. 실시간 트렌딩 키워드 가져오기 (팀원의 API 연동)
export async function fetchTrendingKeywords(): Promise<string[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/trending`);
    if (!response.ok) throw new Error("Trending API fetch failed");
    const data = await response.json();
    return data.keywords || [];
  } catch (error) {
    console.error("키워드 로드 실패:", error);
    return ["증시", "경제", "금리", "반도체"]; // 폴백 키워드
  }
}

/*
2. 매체 신뢰도 가중치
주요도순 정렬 시 보조 변수로 활용.
 */
function getPublisherWeight(source: string): number {
  const src = source.toLowerCase();
  // 경제 전문지 및 통신사에 가중치 부여
  if (src.includes("hankyung") || src.includes("mk.co.kr")) return 1.5; 
  if (src.includes("yna.co.kr") || src.includes("biz.chosun")) return 1.2; 
  return 1.0;
}

// 3. 주요도 점수 계산 (중력 모델 + 키워드 + 매체 신뢰도)
export function calculateHotTopicScore(
  item: NewsItem, 
  trendingKeywords: string[]
): number {
  const GRAVITY = 1.8;
  const pubDate = new Date(item.pubDate);
  if (isNaN(pubDate.getTime())) return 0;

  // 시간 경과(시간 단위)
  const hoursSincePublished = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);

  // 가중치 적용
  const publisherWeight = getPublisherWeight(item.source);
  const hasKeyword = trendingKeywords.some((keyword) => item.cleanTitle.includes(keyword));
  const keywordWeight = hasKeyword ? 5.0 : 1.0; // 키워드 일치 시 50% 가산

  // 조회수는 현재 API 제약상 기본값(0)을 주되, DB 연결 시 item.viewCount로 대체
  const views = item.viewCount || 0;

  // 최종 점수 공식
  const score =
    ((views + 1) * publisherWeight * keywordWeight) /
    Math.pow(hoursSincePublished + 2, GRAVITY);

  return Number(score.toFixed(4));
}

// 4. 최종 정렬 함수 (최신순 / 조회수순 / 주요도순)
export async function sortNews(
  newsList: NewsItem[], 
  sortType: string, 
  trendingKeywords: string[] = [] // 기본값을 빈 배열로 설정
) {
  const sortedList = [...newsList];

  switch (sortType) {
    case "latest":
      return sortedList.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    case "views":
      return sortedList.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));

    case "hotTopic":
      // [중요] 여기서 이제 외부에서 넘겨받은 trendingKeywords를 사용하게 됩니다.
      return sortedList.sort((a, b) => 
        calculateHotTopicScore(b, trendingKeywords) - 
        calculateHotTopicScore(a, trendingKeywords)
      );

    default:
      return sortedList;
  }
}