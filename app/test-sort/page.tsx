'use client';

import { useEffect, useState } from 'react';
import { sortNews } from '@/lib/scoring'; 
import { NewsItem } from '@/lib/types';

const STOPWORDS = new Set<string>([
  "있다", "없다", "그리고", "그러나", "하지만", "이번", "오늘", "관련", "대한", "에서",
  "으로", "에서의", "이라고", "위해", "대해", "지난", "이날", "최근", "통해", "따라",
  "동안", "이상", "이하", "기준", "전망", "예상", "강조", "발표", "밝혔다", "말했다",
  "전했다", "있는", "없는", "많은", "큰", "등", "및", "또", "위한", "것으로", "것이다",
  "했다", "됐다", "된다", "한다", "하는", "했던", "됐던", "이후",
]);

function extractKeywords(texts: string[], topN = 8): string[] {
  const counts = new Map<string, number>();
  const re = /[가-힣A-Za-z0-9]{2,}/g;
  for (const t of texts) {
    const matches = t.match(re) || [];
    for (const raw of matches) {
      const w = raw.trim();
      if (w.length < 2 || /^\d+$/.test(w) || STOPWORDS.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([k]) => k);
}

export default function TestSortPage() {
  const [news, setNews] = useState<NewsItem[]>([]); 
  const [keywords, setKeywords] = useState<string[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [currentSort, setCurrentSort] = useState<'latest' | 'views' | 'hotTopic'>('latest');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/news?query=경제&display=100');
        const data = await response.json();
        
        if (data.items) {
          const uniqueItems = data.items.filter((item: NewsItem, index: number, self: NewsItem[]) =>
            index === self.findIndex((t) => t.id === item.id)
          );

          // [수정] 외부 API 대신 현재 뉴스 리스트에서 직접 키워드 추출
          const currentKeywords = extractKeywords(
          uniqueItems.map((i: NewsItem) => `${i.cleanTitle} ${i.cleanDescription}`)
          );
          setKeywords(currentKeywords);

          // 추출된 키워드를 기반으로 정렬 초기화
          const initialSorted = await sortNews(uniqueItems, 'latest', currentKeywords);
          setNews(initialSorted);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      }
    }
    fetchData();
  }, []);

  const handleSort = async (type: 'latest' | 'views' | 'hotTopic') => {
    setIsLoading(true);
    setCurrentSort(type);

    try {
      // [수정] 정렬할 때마다 현재 리스트에서 다시 키워드를 분석하여 최신 트렌드 반영
      const currentKeywords = extractKeywords(
        news.map((i) => `${i.cleanTitle} ${i.cleanDescription}`)
      );
      setKeywords(currentKeywords);
      
      // 분석된 키워드를 sortNews의 3번째 인자로 전달
      const reSorted = await sortNews([...news], type, currentKeywords);
      setNews(reSorted);

      console.log(`${type} 정렬 실행됨! (자체 추출 키워드 기반)`); 

    } catch (error) {
      console.error(`${type} 정렬 실패:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-5">실시간 뉴스 정렬 테스트 (Self-Extract)</h1>
      
      {/* 1. 정렬 버튼 영역 */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => handleSort('latest')} 
          className={`px-4 py-2 rounded transition-colors ${currentSort === 'latest' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          disabled={isLoading}
        >
          최신순
        </button>
        <button 
          onClick={() => handleSort('views')} 
          className={`px-4 py-2 rounded transition-colors ${currentSort === 'views' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          disabled={isLoading}
        >
          조회수순
        </button>
        <button 
          onClick={() => handleSort('hotTopic')} 
          className={`px-4 py-2 rounded transition-colors ${currentSort === 'hotTopic' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          disabled={isLoading}
        >
          주요도순 (Hot Topic)
        </button>
      </div>

      {/* 2. 실시간 분석 키워드 대시보드 (자체 추출 결과 표시) */}
      <div className="mb-8 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-sm font-bold text-gray-400 mb-3 flex items-center uppercase tracking-wider">
          <span className="flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          현재 리스트 내 빈도수 기반 키워드
        </h2>
        <div className="flex flex-wrap gap-2">
          {keywords.length > 0 ? (
            keywords.map((word, i) => (
              <span key={i} className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg font-bold">
                #{word}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">분석된 키워드가 없습니다.</span>
          )}
        </div>
      </div>

      {/* 3. 뉴스 리스트 로직 동일 */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex justify-center items-start pt-20 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <ul className="space-y-4">
          {news.map((item, index) => (
            <li key={`${item.id}-${index}`} className="p-5 border rounded-xl bg-white flex justify-between items-start hover:shadow-md transition-shadow">
              <div className="flex-1 pr-4">
                <h2 className="font-bold text-lg mb-2 leading-tight text-gray-900">{item.cleanTitle}</h2>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-400">{item.pubDate}</p>
                  {keywords.some(k => item.cleanTitle.includes(k)) && (
                    <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold border border-red-100">
                      HOT ISSUE
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex flex-col items-end min-w-[130px]">
                <span className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded text-gray-500 mb-2">{item.source}</span>
                <div className="text-xs text-gray-400">조회수 <span className="font-mono text-gray-600">{item.viewCount || 0}</span></div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}