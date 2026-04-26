import Link from "next/link";
import type { NewsItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

export function NewsCard({ item, rank }: { item: NewsItem; rank?: number }) {
  const rankTone =
    rank === 1
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : rank === 2
        ? "bg-slate-100 text-slate-700 border-slate-200"
        : rank === 3
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : "bg-blue-50 text-blue-700 border-blue-200";
  const rankIcon = rank === 1 ? "M1" : rank === 2 ? "M2" : rank === 3 ? "M3" : "M4";

  return (
    <Link
      href={`/article/${item.id}?title=${encodeURIComponent(item.cleanTitle)}&desc=${encodeURIComponent(
        item.cleanDescription
      )}&link=${encodeURIComponent(item.link)}&source=${encodeURIComponent(item.source)}&pubDate=${encodeURIComponent(
        item.pubDate
      )}`}
      className="card group p-4 block hover:-translate-y-1 hover:border-amber-300 transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        {typeof rank === "number" ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${rankTone}`}
          >
            <span>{rankIcon}</span>
            <span>#{rank}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="text-xs text-slate-400">
          {formatRelativeTime(item.pubDate)}
        </span>
      </div>

      <div className="mt-3 flex gap-3">
        <div className="h-16 w-20 shrink-0 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-white overflow-hidden">
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(245,158,11,0.22),transparent_42%)] flex items-end p-2">
            <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
              {item.source.slice(0, 8)}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="font-bold text-navy leading-snug line-clamp-2 group-hover:text-navy-700 transition-colors">
            {item.cleanTitle}
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
            {item.cleanDescription}
          </p>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-400">{item.source}</div>
    </Link>
  );
}
