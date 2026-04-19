import { NextRequest, NextResponse } from "next/server";
import { summarizeArticle } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body?.title ?? "").slice(0, 500);
    const description = String(body?.description ?? "").slice(0, 4000);
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const result = await summarizeArticle({ title, description });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
