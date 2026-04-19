export function TrendingKeywords({ keywords }: { keywords: string[] }) {
  if (!keywords.length) return null;
  return (
    <section className="card p-5 md:p-6">
      <h2 className="text-sm font-bold text-navy">트렌딩 키워드</h2>
      <p className="text-xs text-slate-500 mt-1">
        최근 뉴스에서 가장 많이 언급된 용어
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {keywords.map((k) => (
          <span key={k} className="chip">
            #{k}
          </span>
        ))}
      </div>
    </section>
  );
}
