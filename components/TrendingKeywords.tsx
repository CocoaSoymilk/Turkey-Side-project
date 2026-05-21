"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NewsItem, TrendKeyword } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

export function TrendingKeywords({
  trends,
  items,
}: {
  trends: TrendKeyword[];
  items: NewsItem[];
}) {
  const [selected, setSelected] = useState<string>(trends[0]?.id ?? "");

  const filtered = useMemo(() => {
    const trend = trends.find((item) => item.id === selected);
    return (trend?.articles.length ? trend.articles : items).slice(0, 8);
  }, [items, selected, trends]);

  const selectedTrend = trends.find((item) => item.id === selected);

  return (
    <section className="card-dark p-5 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">트렌딩 키워드</h2>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        {trends.map((trend, idx) => {
          const active = selected === trend.id;
          const sizeClass =
            idx === 0
              ? "text-base"
              : idx < 3
                ? "text-[15px]"
                : idx < 6
                  ? "text-sm"
                  : "text-xs";
          return (
            <button
              key={trend.id}
              type="button"
              onClick={() => setSelected(trend.id)}
              className={
                active
                  ? `rounded-full border border-accent-gold bg-white/15 px-3 py-1.5 font-semibold text-white ${sizeClass}`
                  : `rounded-full border border-white/40 px-3 py-1.5 text-white/90 hover:border-white hover:bg-white/5 transition-colors duration-200 ${sizeClass}`
              }
            >
              #{trend.keyword}
            </button>
          );
        })}
      </div>

      {selectedTrend?.summary && (
        <p className="mt-3 text-sm text-white/75">{selectedTrend.summary}</p>
      )}

      <div className="mt-5 rounded-3xl bg-white/90 p-4 min-h-[220px]">
        {filtered.length > 0 ? (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/article/${item.id}?title=${encodeURIComponent(item.cleanTitle)}&desc=${encodeURIComponent(item.cleanDescription)}&link=${encodeURIComponent(item.link)}&source=${encodeURIComponent(item.source)}&pubDate=${encodeURIComponent(item.pubDate)}`}
                  className="block rounded-xl border border-slate-200 bg-white px-3 py-2 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                >
                  <p className="text-sm font-medium text-navy line-clamp-1">
                    {item.cleanTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.source} · {formatRelativeTime(item.pubDate)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="h-full min-h-[188px] flex items-center justify-center text-sm text-slate-500">
            선택한 키워드에 해당하는 뉴스가 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
