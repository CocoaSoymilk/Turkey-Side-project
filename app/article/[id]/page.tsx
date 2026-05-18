// import Link from "next/link";
// import { summarizeArticle } from "@/lib/openai";
// import { HighlightedBody } from "@/components/GlossaryTooltip";
// import { Logo } from "@/components/Logo";
// import { formatDateTime } from "@/lib/format";

// export const revalidate = 3600;

// type SearchParams = {
//   title?: string;
//   desc?: string;
//   link?: string;
//   source?: string;
//   pubDate?: string;
// };

// export default async function ArticlePage({
//   params,
//   searchParams,
// }: {
//   params: { id: string };
//   searchParams: SearchParams;
// }) {
//   const title = searchParams.title ?? "(제목 없음)";
//   const description = searchParams.desc ?? "";
//   const link = searchParams.link ?? "#";
//   const source = searchParams.source ?? "";
//   const pubDate = searchParams.pubDate ?? "";

//   let summary: string[] = [];
//   let keywords: string[] = [];
//   let glossary: { term: string; definition: string }[] = [];
//   let aiError: string | null = null;
//   try {
//     const res = await summarizeArticle({ title, description });
//     summary = res.summary;
//     keywords = res.keywords;
//     glossary = res.glossary;
//   } catch (e) {
//     aiError = e instanceof Error ? e.message : String(e);
//   }

//   return (
//     <main className="min-h-screen bg-[#F8FAFC]">
//       <header className="border-b border-slate-200 bg-white">
//         <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
//           <Logo variant="light" />
//           <Link href="/" className="text-sm text-slate-500 hover:text-navy">
//             ← 홈으로
//           </Link>
//         </div>
//       </header>

//       <div className="mx-auto max-w-6xl px-4 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
//         <article className="lg:col-span-3 space-y-6">
//           <div>
//             <h1 className="text-xl md:text-2xl font-bold text-navy leading-snug">
//               {title}
//             </h1>
//             <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
//               <span className="font-semibold text-slate-700">
//                 {source || "출처 미상"}
//               </span>
//               <span>{formatDateTime(pubDate)}</span>
//               <a
//                 href={link}
//                 target="_blank"
//                 rel="noreferrer noopener"
//                 className="text-point-blue hover:underline"
//               >
//                 원문 열기 ↗
//               </a>
//             </div>
//           </div>

//           {/* [Top] AI Summary */}
//           <section className="card p-5 md:p-6 border-l-4 border-point-blue">
//             <div className="flex items-center justify-between">
//               <h2 className="text-sm font-bold text-navy">AI 3줄 요약</h2>
//               <span className="chip">Pick-Ant AI</span>
//             </div>
//             {aiError ? (
//               <p className="mt-3 text-sm text-amber-700">
//                 요약을 생성하지 못했습니다: {aiError}
//               </p>
//             ) : summary.length === 0 ? (
//               <p className="mt-3 text-sm text-slate-500">
//                 요약을 생성하지 못했습니다.
//               </p>
//             ) : (
//               <ol className="mt-3 space-y-2 list-decimal list-inside text-sm text-slate-800">
//                 {summary.map((s, i) => (
//                   <li key={i}>{s}</li>
//                 ))}
//               </ol>
//             )}
//             {keywords.length > 0 && (
//               <div className="mt-4 flex flex-wrap gap-2">
//                 {keywords.map((k) => (
//                   <span key={k} className="chip">
//                     #{k}
//                   </span>
//                 ))}
//               </div>
//             )}
//           </section>

//           {/* [Body] Interactive body */}
//           <section className="card p-5 md:p-6">
//             <h2 className="text-sm font-bold text-navy mb-3">원문 요약</h2>
//             {description ? (
//               <HighlightedBody text={description} glossary={glossary} />
//             ) : (
//               <p className="text-sm text-slate-500">본문 스니펫이 없습니다.</p>
//             )}
//             <p className="mt-4 text-xs text-slate-400">
//               * 본문은 네이버 뉴스 검색 API가 제공하는 스니펫입니다. 전체
//               기사는 <a
//                 href={link}
//                 className="text-point-blue hover:underline"
//                 target="_blank"
//                 rel="noreferrer noopener"
//               >
//                 원문 링크
//               </a>
//               를 확인하세요.
//             </p>
//           </section>
//         </article>

//         {/* [Side] Glossary */}
//         <aside className="lg:col-span-1 space-y-4">
//           <section className="card p-5">
//             <h2 className="text-sm font-bold text-navy">주요 개념 및 설명</h2>
//             {glossary.length === 0 ? (
//               <p className="mt-2 text-xs text-slate-500">
//                 추출된 용어가 없습니다.
//               </p>
//             ) : (
//               <ul className="mt-3 space-y-3">
//                 {glossary.map((g) => (
//                   <li key={g.term} className="text-sm">
//                     <div className="font-semibold text-navy">{g.term}</div>
//                     <div className="text-slate-600 text-xs mt-1 leading-relaxed">
//                       {g.definition}
//                     </div>
//                   </li>
//                 ))}
//               </ul>
//             )}
//           </section>

//           <section className="card p-5 bg-navy text-white">
//             <h3 className="text-sm font-bold">읽는 팁</h3>
//             <p className="mt-2 text-xs text-white/70 leading-relaxed">
//               밑줄+하이라이트된 용어를 클릭하면 툴팁으로 쉬운 설명이 뜹니다.
//               사이드바의 용어 사전은 기사를 다 읽고 난 뒤 복습용으로 활용하세요.
//             </p>
//           </section>
//         </aside>
//       </div>
//     </main>
//   );
// }


import { createClient } from '@supabase/supabase-js'

// 1. 수파베이스 연결 (환경변수에서 주소와 키를 자동으로 가져옴)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function TestPage() {
  // 2. 팀원이 데이터 채워놓고 있는 stock_rank_snapshot 테이블 찔러보기
  const { data: rankings, error } = await supabase
    .from('stock_rank_snapshot')
    .select('*')
    .limit(5); // 딱 5개만 가져와보기

  // 3. 만약 뉴스를 확인하고 싶다면 아래 주석을 해제하세요
  // const { data: news } = await supabase.from('news_contents').select('*').limit(5);

  return (
    <div style={{ padding: '40px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#111827' }}>
        ⚡ 수파베이스 데이터 연동 테스트
      </h1>

      {/* 에러가 났다면 에러 메시지 출력 */}
      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px' }}>
          ❌ 에러 발생: {error.message}
        </div>
      )}

      {/* 성공했다면 가져온 생데이터(Raw JSON)를 화면에 이쁘게 출력 */}
      {rankings ? (
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#059669', fontWeight: 'bold', marginBottom: '10px' }}>
            ✅ 연결 성공! DB에서 실시간 데이터를 성공적으로 땡겨왔습니다.
          </p>
          <pre style={{ backgroundColor: '#1f2937', color: '#34d399', padding: '15px', borderRadius: '6px', overflowX: 'auto', fontSize: '14px' }}>
            {JSON.stringify(rankings, null, 2)}
          </pre>
        </div>
      ) : (
        <p>데이터를 불러오는 중이거나 테이블이 비어있습니다...</p>
      )}
    </div>
  )
}