// KIS Open Trading API client (server-only).
// Docs: https://apiportal.koreainvestment.com/apiservice
// - POST /oauth2/tokenP  -> access_token (valid ~24h, rate-limited to 1/min)
// - GET  /uapi/domestic-stock/v1/quotations/inquire-index-price (TR FHPUP02100000)

const BASE = process.env.KIS_BASE ?? "https://openapi.koreainvestment.com:9443";
const APP_KEY = process.env.KIS_APP_KEY ?? "";
const APP_SECRET = process.env.KIS_APP_SECRET ?? "";

type Cached<T> = { value: T; expiresAt: number };

// Module-level cache (per-process, fine for Next dev + single-node prod)
let tokenCache: Cached<string> | null = null;
let tokenInflight: Promise<string> | null = null;

async function fetchAccessToken(): Promise<string> {
  if (!APP_KEY || !APP_SECRET) {
    throw new Error("KIS_APP_KEY / KIS_APP_SECRET not configured");
  }
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.value;
  }
  // Single-flight: collapse concurrent callers onto one network fetch
  if (tokenInflight) return tokenInflight;
  tokenInflight = (async () => {
    const res = await fetch(`${BASE}/oauth2/tokenP`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: APP_KEY,
        appsecret: APP_SECRET,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`KIS token ${res.status}: ${body}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };
    tokenCache = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  })();
  try {
    return await tokenInflight;
  } finally {
    tokenInflight = null;
  }
}

export type IndexQuote = {
  symbol: string; // e.g. "0001"
  name: string; // e.g. "코스피"
  price: number; // current index value
  change: number; // absolute change vs previous close
  changePct: number; // percent change
  sign: "up" | "down" | "flat";
};

// KIS market-index codes (inquire-index-price)
const INDEX_MAP: Record<string, { code: string; name: string }> = {
  kospi: { code: "0001", name: "코스피" },
  kosdaq: { code: "1001", name: "코스닥" },
  kospi200: { code: "2001", name: "코스피200" },
};

export async function getIndexQuote(key: keyof typeof INDEX_MAP): Promise<IndexQuote> {
  const meta = INDEX_MAP[key];
  if (!meta) throw new Error(`Unknown index key: ${key}`);
  const token = await fetchAccessToken();
  const url = new URL(`${BASE}/uapi/domestic-stock/v1/quotations/inquire-index-price`);
  url.searchParams.set("FID_COND_MRKT_DIV_CODE", "U");
  url.searchParams.set("FID_INPUT_ISCD", meta.code);

  const res = await fetch(url.toString(), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
      appkey: APP_KEY,
      appsecret: APP_SECRET,
      tr_id: "FHPUP02100000",
      custtype: "P",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`KIS index ${res.status}: ${body}`);
  }
  const data = (await res.json()) as {
    rt_cd: string;
    msg1: string;
    output?: {
      bstp_nmix_prpr: string; // 현재지수
      bstp_nmix_prdy_vrss: string; // 전일대비
      prdy_vrss_sign: string; // 1 상한 2 상승 3 보합 4 하한 5 하락
      bstp_nmix_prdy_ctrt: string; // 등락률
    };
  };
  if (data.rt_cd !== "0" || !data.output) {
    throw new Error(`KIS index payload: ${data.msg1 || "unknown"}`);
  }
  const o = data.output;
  const price = parseFloat(o.bstp_nmix_prpr);
  const change = parseFloat(o.bstp_nmix_prdy_vrss);
  const changePct = parseFloat(o.bstp_nmix_prdy_ctrt);
  const sign: IndexQuote["sign"] =
    change > 0 ? "up" : change < 0 ? "down" : "flat";
  return { symbol: meta.code, name: meta.name, price, change, changePct, sign };
}
