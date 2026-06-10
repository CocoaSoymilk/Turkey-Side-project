<p align="center">
  <img src="./public/images/pickant.svg" alt="Pick-Ant" width="280" />
</p>

<h1 align="center">Pick-Ant</h1>

<p align="center">
  초보 투자자를 위한 AI 기반 경제 뉴스·시장 브리핑 서비스
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-Database-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/OpenAI-AI-412991?logo=openai&logoColor=white" alt="OpenAI" />
</p>

Pick-Ant는 국내 증시와 경제 뉴스를 빠르게 파악할 수 있도록 네이버 뉴스, 한국투자증권(KIS), Yahoo Finance, Supabase 데이터를 조합합니다. 주요 시장 지표, 실시간 뉴스 토픽, 트렌드 키워드, 종목 순위와 AI 요약을 한 화면에서 제공합니다.

## 주요 기능

- KOSPI, KOSDAQ, NASDAQ, USD/KRW 시장 지표 제공
- 최신 경제·증시 뉴스 토픽 제공
- 뉴스 제목과 본문을 기반으로 트렌드 키워드 추출
- 키워드별 관련 기사 묶음 제공
- 거래대금, 상승률, 하락률, 거래량 기준 종목 순위 제공
- 시장 데이터와 뉴스 헤드라인을 조합한 오늘의 이슈 생성
- 기사별 AI 3줄 요약, 핵심 키워드, 금융 용어 설명 제공
- 시간 단위 트렌드 스냅샷 저장 및 재사용
- Vercel Cron을 이용한 뉴스 점수 산정 및 홈 화면 데이터 갱신

## 기술 스택

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- OpenAI API
- Naver Search API
- 한국투자증권 Open Trading API
- Yahoo Finance
- Vercel Cron

## 데이터 흐름

1. 홈 화면은 Supabase의 최신 뉴스 데이터를 우선 조회합니다.
2. DB 뉴스가 없거나 1시간 이상 오래된 경우 Naver Search API를 사용합니다.
3. KOSPI와 KOSDAQ은 KIS API, 해외 지수와 환율은 Yahoo Finance에서 조회합니다.
4. 트렌드 키워드는 OpenAI가 우선 생성하고, 실패하면 규칙 기반 점수 계산 결과를 사용합니다.
5. 생성된 트렌드는 시간 단위로 Supabase에 저장하며 같은 시간대 요청에서 재사용합니다.
6. 종목 순위와 오늘의 이슈는 `stock_rank_snapshot`의 최신 데이터를 기준으로 생성합니다.

## 시작하기

### 요구 사항

- Node.js 18.17 이상
- npm
- Naver Search API 애플리케이션
- OpenAI API 키
- 한국투자증권 Open API 앱 키
- 프로젝트에서 사용하는 테이블이 구성된 Supabase/PostgreSQL

### 설치

```bash
npm install
```

### 환경변수

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 설정합니다.

```env
# Naver Search API
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# 한국투자증권 Open Trading API
KIS_APP_KEY=your_kis_app_key
KIS_APP_SECRET=your_kis_app_secret
KIS_BASE=https://openapi.koreainvestment.com:9443

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Supabase PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:6543/postgres

# Vercel Cron authorization
CRON_SECRET=your_cron_secret

# Optional: custom table names
SUPABASE_NEWS_TABLE=news
SUPABASE_NEWS_RAW_TABLE=news_raw
SUPABASE_ISSUE_TABLE=issue
SUPABASE_ISSUE_NEWS_TABLE=issue_news
```

`KIS_BASE`와 Supabase 테이블명은 기본값이 있으므로 기본 구성을 사용한다면 생략할 수 있습니다. `CRON_SECRET`은 운영 환경의 `/api/test-scoring` 요청 검증에 사용됩니다.

`NODE_ENV`는 Next.js 실행 명령에 따라 자동으로 설정되므로 `.env.local`에 추가하지 않습니다.

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

### 프로덕션 빌드

```bash
npm run build
npm run start
```

## 데이터베이스

현재 애플리케이션은 다음 테이블을 참조합니다.

| 테이블 | 용도 |
| --- | --- |
| `news` | 정제된 뉴스와 발행 시각 저장 |
| `news_raw` | 원본 뉴스 링크와 API 응답 저장 |
| `issue` | 시간대별 트렌드 키워드와 점수 저장 |
| `issue_news` | 트렌드와 관련 뉴스 매핑 |
| `stock_rank_snapshot` | 종목별 순위, 가격, 등락률, 거래량 스냅샷 |
| `mart_home` | 뉴스 점수 산정 결과와 홈 노출 대상 저장 |

`stock_rank_snapshot`은 최소한 다음 데이터를 제공해야 합니다.

```text
rank, code, name, price, change_pct, bucket, base_ts,
acml_volume, avg_volume, prdy_volume
```

홈 화면의 종목 순위는 `trade_value`, `rise`, `fall`, `volume` 버킷을 사용하며, 오늘의 이슈 생성 과정에서는 `volume_surge` 버킷도 조회합니다.

## API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/news` | Naver 뉴스 검색 결과 반환 |
| `POST` | `/api/summarize` | 기사 요약, 키워드, 용어 설명 생성 |
| `GET` | `/api/trending` | 현재 시간대 트렌드와 관련 기사 반환 |
| `GET` | `/api/market` | 국내외 시장 지표 스냅샷 반환 |
| `GET` | `/api/test-scoring` | 뉴스 점수 계산 후 `mart_home` 갱신 |

뉴스 검색 API 예시:

```text
/api/news?query=증시&display=20&sort=date
```

기사 요약 API 요청 예시:

```json
{
  "title": "기사 제목",
  "description": "기사 본문 요약"
}
```

## 프로젝트 구조

```text
app/
  api/                  API Route Handlers
  article/[id]/         기사 상세 및 AI 요약 페이지
  page.tsx              메인 대시보드
components/             화면 UI 컴포넌트
lib/
  db.ts                 Supabase REST 데이터 접근
  kis.ts                KIS 국내 지수 조회
  market.ts             Yahoo Finance 시장 데이터 조회
  naver.ts              Naver 뉴스 검색
  openai.ts             시장·기사·트렌드 AI 처리
  rank.ts               종목 순위 PostgreSQL 조회
  scoring.ts            뉴스 노출 점수 계산
  today.ts              오늘의 이슈 생성
  trending.ts           규칙 기반 트렌드 점수 계산
  trendPipeline.ts      AI 및 규칙 기반 트렌드 파이프라인
  trendSnapshot.ts      시간대별 트렌드 저장 및 재사용
public/images/          로고 등 정적 이미지
```

## 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | Next.js 린트 실행 |

## 배포

Vercel 배포 시 로컬의 `.env.local` 값과 동일한 환경변수를 프로젝트 설정에 등록해야 합니다.

`vercel.json`은 매시간 다음 엔드포인트를 호출하도록 설정되어 있습니다.

```text
0 * * * * -> /api/test-scoring
```

운영 환경에서는 Vercel Cron 요청의 `Authorization: Bearer <CRON_SECRET>` 헤더를 확인합니다.

## 참고 사항

- Yahoo Finance 데이터는 실시간이 아니며 지연될 수 있습니다.
- 외부 API 호출이 실패하면 일부 카드에 데이터 없음 상태가 표시될 수 있습니다.
- AI가 생성한 요약과 이슈는 투자 권유가 아니며 원문과 실제 시장 데이터를 함께 확인해야 합니다.
- `.env.local`과 API 비밀키는 저장소에 커밋하지 마세요.
