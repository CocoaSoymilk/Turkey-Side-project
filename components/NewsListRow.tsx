import Link from "next/link";
import type { NewsItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

export function NewsListRow({ item, rank }: { item: NewsItem; rank: number }) {
  return (
    <Link
      href={`/article/${item.id}?title=${encodeURIComponent(item.cleanTitle)}&desc=${encodeURIComponent(
        item.cleanDescription
      )}&link=${encodeURIComponent(item.link)}&source=${encodeURIComponent(item.source)}&pubDate=${encodeURIComponent(
        item.pubDate
      )}`}
      className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-md px-2 -mx-2 transition"
    >
      <span className="w-6 shrink-0 text-sm font-bold text-point-blue tabular-nums">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-navy line-clamp-2">
          {item.cleanTitle}
        </p>
        <div className="mt-1 text-xs text-slate-500 flex gap-2">
          <span>{item.source}</span>
          <span>·</span>
          <span>{formatRelativeTime(item.pubDate)}</span>
        </div>
      </div>
    </Link>
  );
}
