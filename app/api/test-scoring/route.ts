import { NextResponse } from "next/server";
import { runNewsScoringPipeline } from "@/lib/scoring"; 

// Next.js에게 이 API는 호출될 때마다 새로 연산하는 동적 API임을 명시
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 🔒 [보안 장치] 운영(배포) 환경인 배포 서버에서는 이 테스트 페이지를 아예 404로 숨겨버립니다.
    // 오직 로컬(개발 환경)에서 실행할 때만 아래 알고리즘 로직이 작동합니다.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: '운영 환경에서는 제공되지 않는 페이지입니다.' }, 
        { status: 404 }
      );
    }

    // 우리가 만든 알고리즘 함수 강제 실행!
    await runNewsScoringPipeline();
    
    return NextResponse.json({ 
      success: true, 
      message: "알고리즘 실행 성공! 터미널 창을 확인하세요." 
    });

  } catch (error: any) {
    console.error("❌ 테스트 라우트 연산 중 에러:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}