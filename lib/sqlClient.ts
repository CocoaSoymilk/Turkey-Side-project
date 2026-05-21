// Postgres 클라이언트 — stock_rank_snapshot 등 직접 SQL 읽기용
// (기존 lib/db.ts 는 Supabase REST 기반이라 그대로 두고, 여기서 분리)
import "server-only";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("[sqlClient] DATABASE_URL is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

export const sql =
  globalThis.__pgClient ??
  (globalThis.__pgClient = postgres(url!, {
    prepare: false, // Supabase Transaction Pooler 필수
    max: 5,
  }));
