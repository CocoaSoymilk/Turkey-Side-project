"use client";

import { useState, useEffect } from "react";

// 탭 정의
const TABS = [
  { key: "rise", label: "급상승", badge: "상승률" }, 
  { key: "fall", label: "급하락", badge: "하락률" },
  { key: "trade_value", label: "거래대금", badge: "대금순" },
  { key: "volume", label: "거래량", badge: "거래량순" },
];

export function StockRankingsSidebar({ rankingsData }: { rankingsData: any[] | null }) {
  const [activeTab, setActiveTab] = useState("trade_value");

  // 1. 한국투자증권 명세서 기준 - ETF 및 스팩 필터링 함수
  const filterEtfAndSpec = (item: any) => {
    const etfRegex = /(KODEX|TIGER|ACE|HANARO|RISE|ETN|ETF|스팩)/;
    const etnCodeRegex = /^[A-Z]/;
    return !etfRegex.test(item.name) && !etnCodeRegex.test(item.code);
  };

// StockRankingsSidebar.tsx 내부 데이터 받아오는 곳 근처
console.log("실제 들어오는 데이터 샘플:", rankingsData?.filter((x: any) => x.bucket === "volume"));

  // 2. 5초마다 자동으로 다음 탭으로 스위칭하는 타이머
  useEffect(() => {
    if (!rankingsData) return;

    const timer = setInterval(() => {
      const currentIndex = TABS.findIndex((tab) => tab.key === activeTab);
      const nextIndex = (currentIndex + 1) % TABS.length;
      setActiveTab(TABS[nextIndex].key);
    }, 5000);

    return () => clearInterval(timer);
  }, [activeTab, rankingsData]);

  const activeIndex = TABS.findIndex((tab) => tab.key === activeTab);
  const activeTabInfo = TABS[activeIndex];

  return (
    <section className="card p-5 bg-white border border-slate-100 shadow-sm rounded-2xl relative overflow-hidden">
      
      {/* 헤더 영역 및 상단 미니 탭 컨트롤러 */}
      <div className="flex flex-col gap-3 mb-4 relative z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] text-indigo-700">
              📊
            </span>
            오늘의 종목 랭킹
          </h2>
          <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded transition-all">
            {activeTabInfo?.badge}
          </span>
        </div>

        {/* 탭 버튼 바 */}
        <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 text-center">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🏃‍♂️ 뷰포트 컨테이너 */}
      <div className="overflow-hidden w-full">
        <div 
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 25}%)`, width: '400%' }}
        >
          {TABS.map((tab) => {
            const currentStocks = rankingsData
            ? rankingsData
                .filter((item: any) => {
                    // 1. 수집기가 belong: "3"으로 긁어와 저장한 'volume' 버킷 데이터를 필터링합니다.
                    return item.bucket === tab.key;
                })
                .filter(filterEtfAndSpec)
                .sort((a: any, b: any) => {
                    if (tab.key === "rise") return Number(b.change_pct) - Number(a.change_pct);
                    if (tab.key === "fall") return Number(a.change_pct) - Number(b.change_pct);
                    
                    // 2. [거래대금 탭 정렬] 기존 기획대로 금액(체급)이 큰 순서대로 정렬
                    if (tab.key === "trade_value") return Number(b.price) - Number(a.price); 
                    
                    // 3. ⭐ [거래량 탭 정렬] 오늘 터진 진짜 순수 누적 거래량(volume)이 큰 순서대로 재정렬!
                    return Number(b.volume) - Number(a.volume);
                })
                .slice(0, 5)
            : [];

            return (
              <div key={tab.key} className="w-[25%] flex-shrink-0 space-y-2 px-1 box-border">
                {currentStocks.length > 0 ? (
                  currentStocks.map((stock: any, index: number) => {
                    const priceVal = Number(stock.price || 0);
                    const volumeVal = Number(stock.volume || 0);
                    const changePctVal = Number(stock.change_pct || 0);

                    const isPlus = changePctVal > 0;
                    const isMinus = changePctVal < 0;
                    
                    return (
                      <div 
                        key={`${tab.key}-${stock.code}`} 
                        className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100/80 transition-all border border-slate-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 text-left font-bold text-slate-400 text-xs">{index + 1}위</span>
                          <div>
                            <h4 className="font-semibold text-xs text-slate-700 truncate max-w-[110px]">{stock.name}</h4>
                            <span className="text-[10px] text-slate-400 block font-mono">{stock.code}</span>
                          </div>
                        </div>

                        {/* 우측 수치 렌더링 영역 */}
                        <div className="text-right">
                          {tab.key === "volume" ? (
                            <>
                              <p className="text-xs font-bold text-indigo-600 font-mono">
                                {volumeVal.toLocaleString()}주
                              </p>
                              <span className="text-[10px] text-slate-400">당일 누적 거래량</span>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-semibold text-slate-800">{priceVal.toLocaleString()}원</p>
                              <span className={`text-[10px] font-bold ${isPlus ? 'text-red-500' : isMinus ? 'text-blue-500' : 'text-slate-500'}`}>
                                {isPlus ? `+${changePctVal.toFixed(2)}` : changePctVal.toFixed(2)}%
                              </span>
                            </>
                          )}
                        </div>

                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 text-center py-8">데이터를 불러오는 중입니다.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}