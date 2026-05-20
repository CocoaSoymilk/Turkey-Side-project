// stock_rank_snapshot 읽기 — pickant-collector가 적재한 데이터
import "server-only";
import { sql } from "./db";

export type RankRow = {
  rank: number;
  code: string;
  name: string;
  price: number;
  changePct: number;
  acmlVolume: bigint;
  avgVolume: bigint;
  prdyVolume: bigint;
};

const ETF_EXCLUDE_RE = /(KODEX|TIGER|ACE|HANARO|RISE|ETN|ETF|스팩|채권|회사채)/;

/** 최신 스냅샷의 거래대금 TOP N (ETF/스팩 제외) */
export async function readTradeValueTop(limit = 5): Promise<RankRow[]> {
  const rows = await sql<RankRow[]>`
    with latest as (
      select max(base_ts) as ts from stock_rank_snapshot
      where base_ts >= now() - interval '36 hours'
    )
    select rank,
           code,
           name,
           price::float        as "price",
           change_pct::float   as "changePct",
           acml_volume         as "acmlVolume",
           avg_volume          as "avgVolume",
           prdy_volume         as "prdyVolume"
    from stock_rank_snapshot
    where base_ts = (select ts from latest)
      and bucket = 'trade_value'
      and code !~ '^[A-Z]'
      and name !~ ${ETF_EXCLUDE_RE.source}
    order by rank
    limit ${limit}
  `;
  return rows;
}

/** 등락률 상승/하락 TOP N */
export async function readMoversTop(limit = 5): Promise<{
  rise: RankRow[];
  fall: RankRow[];
}> {
  const rows = await sql<(RankRow & { bucket: "rise" | "fall" })[]>`
    with latest as (
      select max(base_ts) as ts from stock_rank_snapshot
      where base_ts >= now() - interval '36 hours'
    )
    select bucket,
           rank,
           code,
           name,
           price::float        as "price",
           change_pct::float   as "changePct",
           acml_volume         as "acmlVolume",
           avg_volume          as "avgVolume",
           prdy_volume         as "prdyVolume"
    from stock_rank_snapshot
    where base_ts = (select ts from latest)
      and bucket in ('rise', 'fall')
      and rank <= ${limit}
    order by bucket, rank
  `;
  return {
    rise: rows.filter((r) => r.bucket === "rise"),
    fall: rows.filter((r) => r.bucket === "fall"),
  };
}

/** 거래량 폭증 TOP (ETN/스팩 제외 + 최소 거래량) */
export async function readSurgeTop(limit = 5): Promise<RankRow[]> {
  const rows = await sql<RankRow[]>`
    with latest as (
      select max(base_ts) as ts from stock_rank_snapshot
      where base_ts >= now() - interval '36 hours'
    )
    select rank,
           code,
           name,
           price::float        as "price",
           change_pct::float   as "changePct",
           acml_volume         as "acmlVolume",
           avg_volume          as "avgVolume",
           prdy_volume         as "prdyVolume"
    from stock_rank_snapshot
    where base_ts = (select ts from latest)
      and bucket = 'volume_surge'
      and code !~ '^[A-Z]'
      and name !~ ${ETF_EXCLUDE_RE.source}
      and acml_volume >= 1000000
    order by rank
    limit ${limit}
  `;
  return rows;
}

/** 최신 스냅샷 시각 */
export async function readLatestSnapshotTs(): Promise<Date | null> {
  const rows = await sql<{ ts: Date | null }[]>`
    select max(base_ts) as ts
    from stock_rank_snapshot
    where base_ts >= now() - interval '36 hours'
  `;
  return rows[0]?.ts ?? null;
}
