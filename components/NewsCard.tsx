import Link from "next/link";
import type { NewsItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

export function NewsCard({ item, rank }: { item: NewsItem; rank?: number }) {
  return (
    <Link
      href={`/article/${item.id}?title=${encodeURIComponent(item.cleanTitle)}&desc=${encodeURIComponent(
        item.cleanDescription
      )}&link=${encodeURIComponent(item.link)}&source=${encodeURIComponent(item.source)}&pubDate=${encodeURIComponent(
        item.pubDate
      )}`}
      className="card p-5 block hover:-translate-y-0.5 hover:shadow-md transition"
    >
      <div className="flex items-center justify-between">
        {typeof rank === "number" ? (
          <span className="text-xs font-bold text-point-blue">#{rank}</span>
        ) : (
          <span />
        )}
        <span className="text-xs text-slate-400">
          {formatRelativeTime(item.pubDate)}
        </span>
      </div>
      <h3 className="mt-2 font-semibold text-navy leading-snug line-clamp-2">
        {item.cleanTitle}
      </h3>
      <p className="mt-2 text-sm text-slate-600 line-clamp-2">
        {item.cleanDescription}
      </p>
      <div className="mt-3 text-xs text-slate-400">{item.source}</div>
    </Link>
  );
}
