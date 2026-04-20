"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NewsItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";
import { filterNewsByKeyword } from "@/lib/trending";

export function TrendingKeywords({
  keywords,
  items,
}: {
  keywords: string[];
  items: NewsItem[];
}) {
  const [selected, setSelected] = useState<string>(keywords[0] ?? "");

  const filtered = useMemo(() => {
    if (!selected) return items.slice(0, 8);
    return filterNewsByKeyword(items, selected).slice(0, 8);
  }, [items, selected]);

  return (
    <section className="card-dark p-5 md:p-6">
      <h2 className="text-xl font-bold text-white">트렌딩 키워드</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {keywords.map((k) => {
          const active = selected === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSelected(k)}
              className={
                active
                  ? "rounded-full border border-accent-gold px-3 py-1.5 text-sm text-white"
                  : "rounded-full border border-white/50 px-3 py-1.5 text-sm text-white/90 hover:border-white"
              }
            >
              #{k}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-3xl bg-slate-100 p-4 min-h-[220px]">
        {filtered.length > 0 ? (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/article/${item.id}?title=${encodeURIComponent(item.cleanTitle)}&desc=${encodeURIComponent(item.cleanDescription)}&link=${encodeURIComponent(item.link)}&source=${encodeURIComponent(item.source)}&pubDate=${encodeURIComponent(item.pubDate)}`}
                  className="block rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 transition"
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
          <div className="h-full min-h-[188px] flex items-center justify-center text-slate-400">
            뉴스
          </div>
        )}
      </div>
    </section>
  );
}
