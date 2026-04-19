import { NextRequest, NextResponse } from "next/server";
import { searchNaverNews } from "@/lib/naver";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") ?? "경제";
  const display = Number(searchParams.get("display") ?? "20");
  const sort = (searchParams.get("sort") as "sim" | "date") ?? "date";

  try {
    const items = await searchNaverNews({ query, display, sort });
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
