// Supabase Postgres 클라이언트 — read-only 사용
// 같은 DB를 pickant-collector(쓰기) + pickant(읽기) 가 공유
import "server-only";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  // 빌드 시점엔 없을 수 있어서 throw 대신 lazy 에러
  console.warn("[db] DATABASE_URL is not set");
}

// 모듈 단위 싱글톤 — Next.js 핫리로드에서 다중 인스턴스 방지
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
