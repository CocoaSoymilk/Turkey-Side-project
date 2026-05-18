"use client";

import { useState, useEffect } from "react";

// 🐜 픽앤 뼈 때리는 개미 팁 50선 데이터 배열
const ANT_TIPS = [
  { id: 1, type: "매매", text: "가치를 보라면서요 버핏 형님... 제가 사니까 가치가 왜 같이 폭락하죠?" },
  { id: 2, type: "심리", text: "공포에 샀더니 더 큰 핵공포가 찾아왔습니다. 환희는커녕 환전할 돈도 없네요." },
  { id: 3, type: "익절", text: "3% 먹고 신나서 팔았더니 상한가 직행. 내 멘탈은 언제나 옳지 않다." },
  { id: 4, type: "분산", text: "바구니를 5개로 나눠 담았는데 5개 바구니가 동시에 깨지는 마술을 보았습니다." },
  { id: 5, type: "인내", text: "통로 입구에서 3년째 버티고 있는데 제 돈은 대체 누구에게 넘어가고 있는 걸까요?" },
  { id: 6, type: "손절", text: "방패를 너무 자주 휘둘러서 자산이 아니라 내 계좌가 쪼개졌습니다. (손절중독)" },
  { id: 7, type: "추격", text: "달리는 말인 줄 알고 탔는데 떨어지는 메테오였습니다. 뇌동매수 멈춰!" },
  { id: 8, type: "거품", text: "날아오르던 칠면조가 갑자기 수직 낙하 중입니다. 아, 거품이었구나." },
  { id: 9, type: "멘탈", text: "정신력으로 버티다가 정신과에 갈 것 같습니다. 오늘 장도 릴랙스~" },
  { id: 10, type: "확신", text: "확신은 100%인데 잔고는 -50%입니다. 내 확신은 도대체 어디서 온 걸까?" },
  { id: 11, type: "소문", text: "소문에 샀는데 뉴스가 안 나옵니다. 혹시 나만 알고 있는 영원한 소문인가요?" },
  { id: 12, type: "관망", text: "예적금 금리 3% 비웃다가 주식으로 -30% 계좌 보고 눈물 흘리는 중. 가만히 있을 걸." },
  { id: 13, type: "차트", text: "족적을 열심히 분석했는데 왜 발등을 찍혔을까요? 차트는 과거일 뿐!" },
  { id: 14, type: "본업", text: "주식 창 보느라 부장님 결재 타이밍 놓쳤습니다. 본업부터 챙깁시다 개미들!" },
  { id: 15, type: "공부", text: "이름이 이뻐서 샀는데 뭐 하는 회사인지 오늘 알았습니다. 반성합시다." },
  { id: 16, type: "물타기", text: "물타기 하다가 대주주 될 뻔했습니다. 추매는 추세 전환을 확인하고 하세요." },
  { id: 17, type: "비중", text: "남자는 몰빵이라며 외치던 김대리, 요즘 점심에 도시락만 싸 들고 옵니다." },
  { id: 18, type: "욕심", text: "무릎에 사서 어깨에 팔라는데, 제 계좌는 왜 늘 정수리에 사서 발바닥에 팔죠?" },
  { id: 19, type: "정보", text: "유튜브 급등 추천 영상 조회수가 50만 회네요. 대한민국 50만 명이 같이 물린 곳입니다." },
  { id: 20, type: "신용", text: "신용 미수 쓰다가 반대매매 당했습니다. 내 돈 아닌 돈으로 칼춤 추지 마세요." },
  { id: 21, type: "트렌드", text: "친구 맺으려고 다가가니 절교 선언하듯 주가가 꺾이네요. 뒤차 타지 맙시다." },
  { id: 22, type: "시황", text: "시장은 옳다는데 왜 내 계좌만 홀로 외롭게 틀리고 있는 걸까요?" },
  { id: 23, type: "장기", text: "강제 장기 투자 5년 차... 이쯤 되면 주주총회 가서 발언권이라도 얻어야겠습니다." },
  { id: 24, type: "단타", text: "오늘 단타 50번 쳐서 수익은 5백 원, 수수료는 5만 원 냈습니다. 증권사 우수고객님." },
  { id: 25, type: "심리", text: "자신과 싸우다가 제가 졌습니다. 손가락이 멋대로 매수 버튼을 누르더군요." },
  { id: 26, type: "매도", text: "기술은 대충 배웠는데 예술의 경지(최고점 매도)는 신의 영역입니다. 줄 때 먹자!" },
  { id: 27, type: "소신", text: "남들 다 팔 때 혼자 소신 있게 샀다가 역사적 고점에 홀로 조난당했습니다." },
  { id: 28, type: "비밀", text: "'너만 알고 있어'라고 들은 종목, 옆 팀 단톡방에서도 추천 주식으로 올라와 있네요." },
  { id: 29, type: "예측", text: "내일 주가 맞춘다는 리딩방 리더님, 그렇게 잘 맞추면 왜 회비를 만 원씩 받으실까?" },
  { id: 30, type: "원금", text: "버핏 형님, 규칙 1번부터 어겼는데 리셋 버튼 어디 있나요?" },
  { id: 31, type: "배당", text: "배당 5% 받으려다 주가 20% 떨어졌습니다. 배당락의 무서움을 잊지 마세요." },
  { id: 32, type: "감정", text: "손실이 너무 커서 헤어질 수 없는 미운 정 고운 정 다 든 주식이 생겼습니다." },
  { id: 33, type: "속도", text: "느리게 부자 되려다 늙어서 부자 될 거 같아 급등주 탔다가 그냥 가난해졌습니다." },
  { id: 34, type: "습관", text: "자고 일어나면 미국 주식 프리장부터 확인하는 나쁜 습관부터 고쳐봅시다." },
  { id: 35, type: "위기", text: "위기인 줄 알고 기회라 생각하며 들어갔는데 위기지하 2층이 더 있었습니다." },
  { id: 36, text: "보조지표 20개 켜놓고 분석하다가 정작 매수 타이밍을 놓쳤습니다. 심플이 베스트!", type: "단순" },
  { id: 37, text: "실수 기록장을 적다 보니 책 한 권이 나왔습니다. 베스트셀러 작가 될 기세.", type: "기록" },
  { id: 38, text: "총알(현금)이 없어서 진짜 기회가 왔을 때 구경만 했습니다. 항상 현금을 남겨두세요.", type: "예수금" },
  { id: 39, text: "세금 걱정 해보고 싶습니다. 맨날 손실이라 종합소득세 환급 대상자네요.", type: "세금" },
  { id: 40, text: "물타기로 평단은 낮췄는데 내 마음의 평화는 안 찾아옵니다. 계좌 덩치만 비대해짐.", type: "평단" },
  { id: 41, text: "장 마감 5분 전 급하게 추격 매수했다가 시간에 쫓겨 물렸습니다. 내일도 장은 열립니다.", type: "조급" },
  { id: 42, text: "터질 땐 화려한데 끝난 뒤엔 까만 재만 남습니다. 불꽃이 꺼지기 전에 탈출하세요!", type: "테마" },
  { id: 43, text: "카더라 통신 믿고 전 재산 태우신 분, 요즘 카카오톡 알림 꺼놓고 사십니다.", type: "귀동냥" },
  { id: 44, text: "내 종목이 틀렸음을 직시하고 빠르게 포지션을 바꾸는 것도 엄청난 용기입니다.", type: "유연" },
  { id: 45, text: "수익 5%면 판다던 나만의 원칙, 주가가 4.9% 찍고 내려올 때 무너졌습니다.", type: "원칙" },
  { id: 46, text: "목표가 도달했는데 욕심부리다 본전 밑으로 내려왔습니다. 익절 라인은 칼같이!", type: "목표" },
  { id: 47, text: "동기 녀석 코인 대박 났다는 소리에 흔들려 무리하게 베팅 금지. 페이스를 유지하세요.", type: "비교" },
  { id: 48, text: "횡보장, 하락장에는 주식 앱 지우고 산책이나 다녀오세요. 휴식도 훌륭한 투자입니다.", type: "휴식" },
  { id: 49, text: "모의투자 수익률 100% 찍고 실전 들어왔다가 첫날 바로 마이너스 찍었습니다. 실전은 냉혹함!", type: "실전" },
  { id: 50, text: "오늘도 픽앤 대시보드 보면서 뇌동매수 꾹 참고 현명한 투자 이어가기! 화이팅! 🐜", type: "픽앤" }
];

export function AntTipsWidget() {
  const [currentTip, setCurrentTip] = useState(ANT_TIPS[0]);
  const [fade, setFade] = useState(true);

  // 💡 [치트키] 매일 혹은 새로고침할 때마다 다른 팁이 맵핑되도록 분기연산 설정
  useEffect(() => {
    // 날짜 정보를 인덱스로 활용하여 하루에 하나씩 변경되게 하거나 완전 무작위 추출
    const dayOfYear = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
    const randomIndex = dayOfYear % ANT_TIPS.length;
    setCurrentTip(ANT_TIPS[randomIndex]);
  }, []);

  // 수동으로 다른 조언 뽑아보기 버튼 액션
  const handleNextTip = () => {
    setFade(false);
    setTimeout(() => {
      const nextIndex = Math.floor(Math.random() * ANT_TIPS.length);
      setCurrentTip(ANT_TIPS[nextIndex]);
      setFade(true);
    }, 200);
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100/70 p-5 rounded-2xl shadow-sm relative overflow-hidden transition-all">
      {/* 장식용 뒷배경 개미 이모지 */}
      <span className="absolute -right-4 -bottom-4 text-6xl opacity-10 pointer-events-none select-none">
        🐜
      </span>

      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500 text-white text-xs font-bold shadow-sm">
            💡
          </span>
          <h3 className="text-sm font-bold text-slate-800">오늘의 개미 명언</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-mono">
            #{currentTip.type}
          </span>
        </div>
        
        {/* 새로고침 주사위 버튼 */}
        <button
          type="button"
          onClick={handleNextTip}
          className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 transition-colors bg-white px-2.5 py-1 rounded-xl border border-orange-100 shadow-2xs"
        >
          🎲 다른 팁 보기
        </button>
      </div>

      {/* 텍스트 노출 공간 애니메이션 효과 */}
      <div className={`transition-opacity duration-200 ${fade ? "opacity-100" : "opacity-0"}`}>
        <p className="text-xs font-medium text-slate-700 leading-relaxed tracking-tight break-keep">
          "{currentTip.text}"
        </p>
      </div>
    </div>
  );
}