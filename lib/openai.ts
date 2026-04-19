import OpenAI from "openai";
import type { SummaryResult } from "./types";

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
