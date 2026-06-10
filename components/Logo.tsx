import Link from "next/link";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span
        className={`inline-flex h-10 w-[132px] overflow-hidden rounded-lg md:h-14 md:w-[160px] ${
          variant === "dark" ? "bg-white/10" : "bg-white"
        }`}
        aria-hidden
      >
        <img
          src="/images/pickant.svg"
          alt=""
          className="block h-full w-full object-contain"
        />
      </span>
    </Link>
  );
}
