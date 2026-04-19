import { NextResponse } from "next/server";
import { getIndexQuote, type IndexQuote } from "@/lib/kis";
import { getQuotes, type Quote } from "@/lib/market";

export const runtime = "nodejs";
// Cache the aggregated snapshot for 60s to protect both KIS (1s/20 req) and yfinance
export const revalidate = 60;

export type MarketSnapshot = {
  kr: IndexQuote[];
  global: Quote[];
  fetchedAt: string;
  errors: { source: string; message: string }[];
};

export async function GET() {
  const errors: { source: string; message: string }[] = [];

  const [kospi, kosdaq] = await Promise.all([
    getIndexQuote("kospi").catch((e) => {
      errors.push({ source: "kis:kospi", message: String(e?.message ?? e) });
      return null;
    }),
    getIndexQuote("kosdaq").catch((e) => {
      errors.push({ source: "kis:kosdaq", message: String(e?.message ?? e) });
      return null;
    }),
  ]);

  const global = await getQuotes(["nasdaq", "sp500", "vix", "usdkrw"]).catch(
    (e) => {
      errors.push({ source: "yfinance", message: String(e?.message ?? e) });
      return [] as Quote[];
    }
  );

  const kr = [kospi, kosdaq].filter((x): x is IndexQuote => Boolean(x));
  const snapshot: MarketSnapshot = {
    kr,
    global,
    fetchedAt: new Date().toISOString(),
    errors,
  };
  return NextResponse.json(snapshot);
}
