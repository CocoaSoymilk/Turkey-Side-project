import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface NewsItem {
  id: string | number;
  title: string;
  pub_dt: string;
}

interface StockItem {
  name: string;
  change_pct: string | number;
  price: string | number;
  acml_volume: string | number;
}

interface ProcessedNews {
  news_id: string | number;
  title: string;
  rank_score: number;
  tokens: string[];
}

function anyTypeStockSnapshots(snapshots: any[]): any[] {
  return snapshots.map(s => ({
    name: String(s.name || ''),
    change_pct: s.change_pct,
    price: s.price,
    volume: s.volume || s.acml_volume || 0
  }));
}

export async function runNewsScoringPipeline() {
  console.log("⏱️ [알고리즘 고도화] 거래대금 반영 및 중복 제거 연산 시작...");
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. 데이터 수집
  const { data: recentNews, error: newsError } = await supabase
    .from('news')
    .select('id, title, pub_dt')
    .order('pub_dt', { ascending: false })
    .limit(100);

  if (newsError || !recentNews || recentNews.length === 0) {
    console.error("❌ news 로드 실패:", newsError);
    return;
  }

  const { data: stockSnapshots, error: stockError } = await supabase
    .from('stock_rank_snapshot')
    .select('name, change_pct, price, acml_volume');

  if (stockError || !stockSnapshots) {
    console.error("❌ 주식 스냅샷 로드 실패:", stockError);
    return;
  }

  const processedResults: ProcessedNews[] = [];

  const typedNews = recentNews as NewsItem[];

  // 2. 뉴스별 스코어 연산
  for (const news of typedNews) {
    const pubDate = new Date(news.pub_dt || now);
    const deltaTimeHours = Math.abs(now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
    
    const freshnessBonus = deltaTimeHours < 1 ? 2.0 : 1.0; 
    const timeDecay = Math.pow(deltaTimeHours + 1, 2.5); 

    // 단어 토큰 정제
    const words = news.title
      .split(/\s+/)
      .map(w => w.replace(/[^\wㄱ-ㅎㅏ-ㅣ가-힣]/g, ''))
      .filter(w => w.length > 1);

    let headlineFrequency = 0;
    for (const otherNews of typedNews) {
      if (news.id === otherNews.id) continue;
      if (words.some(word => otherNews.title.includes(word))) {
        headlineFrequency++;
      }
    }
    const logFrequency = Math.log(headlineFrequency + 2);

    let maxFinanceBonus = 0;

    for (const stock of anyTypeStockSnapshots(stockSnapshots)) {
      const isDerivative = /(레버리지|인버스|KODEX|TIGER|SOL|RISE|ETN)/i.test(stock.name);
      if (isDerivative) continue;

      if (news.title.includes(stock.name)) {
        const absChange = Math.abs(Number(stock.change_pct || 0));
        const tradingValue = Number(stock.price || 0) * Number(stock.volume || 0);
        
        const logTradingValue = Math.log10(tradingValue > 0 ? tradingValue : 1);
        const currentBonus = (absChange / 50) * logTradingValue;

        if (currentBonus > maxFinanceBonus) {
          maxFinanceBonus = currentBonus;
        }
      }
    }
    const financeBonus = 1 + maxFinanceBonus;

    const finalScore = (logFrequency * financeBonus * freshnessBonus) / timeDecay;

    processedResults.push({
      news_id: news.id,
      title: news.title,
      rank_score: finalScore,
      tokens: words.length > 0 ? words : [news.title.substring(0, 5)]
    });
  }

  // 1차 정렬
  processedResults.sort((a, b) => b.rank_score - a.rank_score);

  // 3. 자카드 유사도 기반 중복 필터링
  const finalTop4: ProcessedNews[] = [];
  
  for (const candidate of processedResults) {
    if (finalTop4.length >= 4) break; 

    let isDuplicate = false;
    
    for (const selected of finalTop4) {
      const setB = new Set(selected.tokens);
      const intersection = candidate.tokens.filter(token => setB.has(token));
      const union = new Set([...candidate.tokens, ...selected.tokens]);
      
      const unionSize = union.size > 0 ? union.size : 1;
      const similarity = intersection.length / unionSize;

      if (similarity > 0.25) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      finalTop4.push(candidate);
    }
  }

  if (finalTop4.length < 4) {
    for (const cand of processedResults) {
      if (finalTop4.length >= 4) break;
      if (!finalTop4.some(f => f.news_id === cand.news_id)) {
        finalTop4.push(cand);
      }
    }
  }

  // 4. 터미널 결과 출력
  console.log("📊 [필터링 완료] 최종 실시간 TOP 4 뉴스 리스트 (거래대금 반영):");
  console.table(finalTop4.map((n, idx) => ({ 
    순위: idx + 1, 
    뉴스ID: n.news_id,
    점수: n.rank_score.toExponential(4),
    제목: n.title.substring(0, 50) + "..."
  })));

  // 5. mart_home 테이블 적재
  console.log(`💾 최종 ${finalTop4.length}개의 데이터를 mart_home에 적재(upsert)합니다.`);
  for (const item of finalTop4) {
    const { error: insertError } = await supabase
      .from('mart_home')
      .upsert({
        news_id: item.news_id,
        rank_score: item.rank_score,
        base_dt: todayStr,
        daily_brief: "" 
      }, {
        onConflict: 'base_dt,news_id'
      });
      
    if (insertError) {
      console.error("적재 에러:", insertError);
    }
  }

  console.log("🏁 [작업 완료] 모든 파이프라인이 성공적으로 끝났습니다.");
}