"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { NewsItem, TrendKeyword } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

const INITIAL_VISIBLE_ARTICLES = 3;
const MAX_ARTICLES_PER_TREND = 8;

export function TrendingKeywords({
  trends,
  items: _items,
}: {
  trends: TrendKeyword[];
  items: NewsItem[];
}) {
  const [selected, setSelected] = useState<string>(trends[0]?.id ?? "");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ARTICLES);

  useEffect(() => {
    if (!trends.some((trend) => trend.id === selected)) {
      setSelected(trends[0]?.id ?? "");
      setVisibleCount(INITIAL_VISIBLE_ARTICLES);
    }
  }, [selected, trends]);

  const selectedTrend = trends.find((item) => item.id === selected);

  const articles = useMemo(() => {
    return (selectedTrend?.articles ?? []).slice(0, MAX_ARTICLES_PER_TREND);
  }, [selectedTrend]);

  const visibleArticles = articles.slice(0, visibleCount);
  const hasMore = articles.length > INITIAL_VISIBLE_ARTICLES;
  const isExpanded = visibleCount > INITIAL_VISIBLE_ARTICLES;

  return (
    <section className="card-dark p-5 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">트렌드 키워드</h2>
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
              onClick={() => {
                setSelected(trend.id);
                setVisibleCount(INITIAL_VISIBLE_ARTICLES);
              }}
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
        {visibleArticles.length > 0 ? (
          <>
            <ul key={selected} className="space-y-2">
              {visibleArticles.map((item) => (
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
            {hasMore && (
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((count) =>
                    count > INITIAL_VISIBLE_ARTICLES
                      ? INITIAL_VISIBLE_ARTICLES
                      : MAX_ARTICLES_PER_TREND
                  )
                }
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy hover:border-slate-300 hover:bg-slate-50 transition-colors duration-200"
              >
                {isExpanded ? "접기" : "더보기"}
              </button>
            )}
          </>
        ) : (
          <div className="h-full min-h-[188px] flex items-center justify-center text-sm text-slate-500">
            선택한 키워드에 해당하는 뉴스가 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
