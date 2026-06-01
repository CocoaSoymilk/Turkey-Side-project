import OpenAI from "openai";
import type { LlmTrendKeyword, NewsItem, SummaryResult } from "./types";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  _client = new OpenAI({ apiKey });
  return _client;
}

const SYSTEM_PROMPT = `당신은 한국 경제/금융 뉴스 큐레이터 "픽앤(Pick-Ant)"입니다.
- 초보 투자자가 바로 이해할 수 있는 한국어로 답하세요.
- 과장/투자 권유 표현은 금지합니다.
- 반드시 지정된 JSON 스키마로만 응답합니다.`;

export async function summarizeArticle(input: {
  title: string;
  description: string;
}): Promise<SummaryResult> {
  const client = getOpenAI();
  const prompt = `아래 뉴스 제목과 본문 스니펫을 읽고 JSON으로 답하세요.

[제목]
${input.title}

[본문 스니펫]
${input.description}

[출력 JSON 스키마]
{
  "summary": ["핵심 요점 3줄, 각 줄은 80자 이내 한국어 문장"],
  "keywords": ["본문에서 뽑은 핵심 키워드 3~5개"],
  "glossary": [
    { "term": "용어", "definition": "한 문장 쉬운 설명" }
  ]
}

규칙:
- summary는 정확히 3개.
- keywords는 3~5개, 중복 없이.
- glossary는 초보자가 모를 법한 전문 용어만 2~4개.
- JSON 외 텍스트 절대 포함 금지.`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as Partial<SummaryResult>;
    return {
      summary: Array.isArray(parsed.summary) ? parsed.summary.slice(0, 3) : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
      glossary: Array.isArray(parsed.glossary) ? parsed.glossary.slice(0, 4) : [],
    };
  } catch {
    return { summary: [], keywords: [], glossary: [] };
  }
}

export async function summarizeMarket(headlines: string[]): Promise<string> {
  const client = getOpenAI();
  const list = headlines.slice(0, 20).map((h, i) => `${i + 1}. ${h}`).join("\n");
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `오늘의 주요 경제/증시 뉴스 헤드라인입니다. 한 문장(최대 70자)으로 "오늘의 시장은 ... 에 주목하고 있습니다." 형태로 요약해 주세요. 따옴표로 강조할 핵심 테마 1~2개를 포함하세요. JSON 말고 문장만 반환하세요.\n\n${list}`,
      },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

export async function generateTrendKeywords(
  items: NewsItem[],
  topN = 8
): Promise<LlmTrendKeyword[]> {
  const client = getOpenAI();
  const snippets = items
    .slice(0, 80)
    .map((item, index) => {
      const title = item.cleanTitle || item.title;
      const body =
        item.cleanDescription ||
        item.description ||
        "";
      return `${index + 1}. ${title}${body ? `\n   excerpt: ${body.slice(0, 220)}` : ""}`;
    })
    .join("\n");

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You extract concise Korean economy and stock-market trend keywords. Return only valid JSON. Do not give investment advice.",
      },
      {
        role: "user",
        content: `아래 뉴스 목록은 대부분 title만 있고 본문은 없을 수 있습니다. 제목에서 확인되는 사실만 근거로 오늘의 경제/증시 트렌드 키워드 ${topN}개를 뽑아 JSON으로 반환하세요.

규칙:
- 너무 넓은 단어(증시, 경제, 주식, 투자)는 단독 키워드로 쓰지 마세요.
- 같은 이슈는 하나로 합치세요.
- keyword는 화면 표시용 짧은 한국어 키워드입니다.
- query는 Naver 뉴스 재검색에 쓸 검색어입니다.
- summary는 왜 트렌드인지 60자 이내로 설명합니다.
- evidence_titles는 근거가 된 제목을 최대 3개 넣습니다.

출력 형식:
{
  "keywords": [
    {
      "keyword": "짧은 키워드",
      "query": "검색어",
      "summary": "짧은 설명",
      "evidence_titles": ["근거 제목"]
    }
  ]
}

뉴스:
${snippets}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as {
      keywords?: Array<{
        keyword?: unknown;
        query?: unknown;
        summary?: unknown;
        evidence_titles?: unknown;
        evidenceTitles?: unknown;
      }>;
    };

    return Array.isArray(parsed.keywords)
      ? parsed.keywords.slice(0, topN).map((item) => ({
          keyword: String(item.keyword ?? ""),
          query: String(item.query ?? item.keyword ?? ""),
          summary: String(item.summary ?? ""),
          evidenceTitles: Array.isArray(item.evidence_titles)
            ? item.evidence_titles.map(String)
            : Array.isArray(item.evidenceTitles)
              ? item.evidenceTitles.map(String)
              : [],
        }))
      : [];
  } catch (error) {
    console.error("[openai:trend-keywords:parse]", error, raw.slice(0, 500));
    return [];
  }
}
