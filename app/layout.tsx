import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "픽앤 Pick-Ant — 중요한 뉴스를 픽(Pick)하는 개미",
  description:
    "초보 개미 투자자를 위한 경제 뉴스 큐레이션. Naver 뉴스 + AI 요약으로 오늘의 시장을 한 눈에.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
