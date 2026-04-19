import Link from "next/link";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const ant = variant === "dark" ? "text-white" : "text-navy";
  return (
    <Link href="/" className="flex items-center gap-2">
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
          variant === "dark" ? "bg-white/10" : "bg-navy"
        }`}
        aria-hidden
      >
        <span className={variant === "dark" ? "text-accent-mint" : "text-white"}>🐜</span>
      </span>
      <span className={`font-bold tracking-tight ${ant}`}>
        Pick<span className="text-point-blue">·</span>Ant
      </span>
    </Link>
  );
}
