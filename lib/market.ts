// Global market + FX via yahoo-finance2 (server-only).
// Free, ~15-min delayed. No API key required.
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export type Quote = {
  key: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  sign: "up" | "down" | "flat";
  currency?: string;
};

const SYMBOLS: Record<string, { symbol: string; name: string }> = {
  nasdaq: { symbol: "^IXIC", name: "나스닥" },
  sp500: { symbol: "^GSPC", name: "S&P 500" },
  dow: { symbol: "^DJI", name: "다우" },
  vix: { symbol: "^VIX", name: "VIX" },
  usdkrw: { symbol: "KRW=X", name: "원/달러" },
  wti: { symbol: "CL=F", name: "WTI 유가" },
  us10y: { symbol: "^TNX", name: "미 10년물" },
};

type QuoteResult = {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
};

export async function getQuote(key: keyof typeof SYMBOLS): Promise<Quote> {
  const meta = SYMBOLS[key];
  if (!meta) throw new Error(`Unknown symbol key: ${key}`);
  const q = (await yahooFinance.quote(meta.symbol)) as QuoteResult;
  const price = Number(q.regularMarketPrice ?? 0);
  const change = Number(q.regularMarketChange ?? 0);
  const changePct = Number(q.regularMarketChangePercent ?? 0);
  const sign: Quote["sign"] =
    change > 0 ? "up" : change < 0 ? "down" : "flat";
  return {
    key,
    symbol: meta.symbol,
    name: meta.name,
    price,
    change,
    changePct,
    sign,
    currency: q.currency,
  };
}

export async function getQuotes(
  keys: (keyof typeof SYMBOLS)[]
): Promise<Quote[]> {
  const results = await Promise.allSettled(keys.map((k) => getQuote(k)));
  const ok: Quote[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") ok.push(r.value);
    else console.error(`[market] ${keys[i]} failed:`, r.reason);
  }
  return ok;
}
