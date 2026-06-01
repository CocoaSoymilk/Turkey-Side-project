import { NextResponse } from "next/server";
import { runNewsScoringPipeline } from "@/lib/scoring"; 

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 🔒 [보안 가드] Vercel Cron 스케줄러의 정당한 호출인지 헤더 검증
    // 로컬 개발 환경(development)에서는 검증을 건너뛰어 자유로운 테스트 지원
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
          { error: '인증되지 않은 요청입니다.' }, 
          { status: 401 }
        );
      }
    }

    // 알고리즘 파이프라인 가동
    await runNewsScoringPipeline();
    
    return NextResponse.json({ 
      success: true, 
      message: "1시간 주기 실시간 뉴스 토픽 정렬 알고리즘 연산 및 mart_home 적재 성공!" 
    });

  } catch (error: any) {
    console.error("❌ 배치 연산 중 서버 에러:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}