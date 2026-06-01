"use client";

import { useState } from "react";
import { NewsCard } from "@/components/NewsCard";
import type { NewsItem } from "@/lib/types";

const INITIAL_VISIBLE_ITEMS = 4;

export function NewsTopicCards({ items }: { items: NewsItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? items : items.slice(0, INITIAL_VISIBLE_ITEMS);
  const hasMore = items.length > INITIAL_VISIBLE_ITEMS;

  if (items.length === 0) return <EmptyCards />;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleItems.map((item, idx) => (
          <NewsCard key={item.id} item={item} rank={idx + 1} />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy hover:border-slate-300 hover:bg-slate-50 transition-colors duration-200"
        >
          {showAll ? "접기" : "더보기"}
        </button>
      )}
    </>
  );
}

function EmptyCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-dashed border-slate-200 h-32 flex items-center justify-center text-xs text-slate-400"
        >
          카드 {i + 1}
        </div>
      ))}
    </div>
  );
}
