type Props = { emoji: string; tip: string };

export function AntTipCard({ emoji, tip }: Props) {
  return (
    <section className="card p-5 bg-navy text-white overflow-hidden relative">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 82% 15%, rgba(245,158,11,0.35), transparent 35%), radial-gradient(circle at 12% 88%, rgba(121,236,206,0.28), transparent 38%)",
        }}
      />
      <h2 className="relative text-sm font-bold flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px] text-white">
          !
        </span>
        오늘의 개미 팁
      </h2>
      <p className="relative mt-2 text-xs text-white/85 leading-relaxed flex items-start gap-2">
        <span className="text-base leading-5 shrink-0">{emoji}</span>
        <span>{tip}</span>
      </p>
    </section>
  );
}
