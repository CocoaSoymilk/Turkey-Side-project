"use client";

import { useMemo, useState } from "react";

type Glossary = { term: string; definition: string }[];

// Replace glossary terms in text with interactive <button> spans
export function HighlightedBody({
  text,
  glossary,
}: {
  text: string;
  glossary: Glossary;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const nodes = useMemo(() => {
    if (!glossary.length || !text) return [text];
    const terms = glossary
      .map((g) => g.term)
      .filter((t) => t && t.length > 1)
      .sort((a, b) => b.length - a.length);
    if (!terms.length) return [text];
    const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`(${escaped.join("|")})`, "g");
    return text.split(re);
  }, [text, glossary]);

  const def = (term: string) =>
    glossary.find((g) => g.term === term)?.definition ?? "";

  return (
    <p className="leading-relaxed text-slate-800">
      {nodes.map((chunk, i) => {
        const match = glossary.find((g) => g.term === chunk);
        if (!match) return <span key={i}>{chunk}</span>;
        const isOpen = open === `${i}-${chunk}`;
        return (
          <span key={i} className="relative inline-block">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : `${i}-${chunk}`)}
              className="underline decoration-accent-gold decoration-2 underline-offset-2 text-navy font-semibold hover:bg-accent-gold/10 rounded px-0.5"
            >
              {chunk}
            </button>
            {isOpen && (
              <span
                role="tooltip"
                className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 w-64 rounded-lg bg-navy text-white text-xs p-3 shadow-lg"
              >
                <strong className="block text-accent-mint mb-1">
                  {chunk}
                </strong>
                {def(chunk)}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}
