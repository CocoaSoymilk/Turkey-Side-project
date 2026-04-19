# 픽앤 (Pick-Ant)

중요한 뉴스를 픽(Pick)하는 개미. 초보 투자자를 위한 경제 뉴스 AI 큐레이션 사이드 프로젝트.

## 스택
- Next.js 14 (App Router) + TypeScript + TailwindCSS
- Naver News Search Open API
- OpenAI (gpt-4o-mini): 3줄 요약, 키워드 추출, 용어 사전

## 환경 변수 (`.env.local`)
```
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
OPENAI_API_KEY=sk-...
```
**주의**: `.env.local`은 커밋 금지. 키가 외부에 노출되면 즉시 폐기·재발급하세요.

## 실행
```bash
npm install
npm run dev
```
http://localhost:3000

## 디렉토리
- `app/page.tsx` — 대시보드 (Hero + 이슈 가중치 카드 + 트렌딩 키워드 + 리스트)
- `app/article/[id]/page.tsx` — 기사 상세 (AI 3줄 요약 + 용어 하이라이트 + 용어 사전 사이드바)
- `app/api/news` — Naver 뉴스 검색 프록시
- `app/api/summarize` — OpenAI 요약 엔드포인트
- `app/api/trending` — 헤드라인 + 트렌딩 키워드 집계
- `lib/naver.ts`, `lib/openai.ts` — 외부 API 클라이언트
- `components/*` — HeroCard, NewsCard, NewsListRow, TrendingKeywords, GlossaryTooltip 등

## 설계 연계 (Figma)
- Trust & Professional 컬러 팔레트: Navy `#1A2B4C`, Point Blue `#3B82F6`, Gold `#F59E0B`
- Accent Mint `#79ECCE`는 배지/강조용
- Hero Section: 오늘의 시장 한 줄 요약 + KPI + 트렌드 키워드 칩
- Middle: 이슈 가중치 Top 카드 4개
- Bottom: 최신순 뉴스 리스트
- 상세 페이지: [Top] AI 요약 / [Body] 용어 하이라이트 툴팁 / [Side] 용어 사전
