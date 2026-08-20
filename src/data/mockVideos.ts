import { YouTubeVideo } from '../types';

// Helper to get dates relative to now
const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

export const INITIAL_VIDEOS: YouTubeVideo[] = [
  {
    id: 'vid-1',
    videoId: 'shuka_macro_ai_2026',
    channelId: 'UCsJ6RuBiTVWRX156FVbeaGg',
    channelTitle: '슈카월드',
    channelThumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=150&auto=format&fit=crop&q=80',
    title: 'AI 반도체 전쟁의 2막: 전력 인프라와 원자력이 주도하는 글로벌 패권',
    description: '빅테크 기업들이 AI 데이터센터 전력 공급을 위해 소형모듈원전(SMR)과 민간 원전 계약에 뛰어들고 있습니다. 왜 지금 에너지 전쟁이 벌어지는지 분석합니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    publishedAt: yesterday.toISOString(),
    duration: '28:45',
    viewCount: 482000,
    videoUrl: 'https://www.youtube.com/watch?v=shuka_macro_ai_2026',
    category: '경제/재테크',
    isYesterday: true,
    isSummarized: true,
    isBookmarked: true,
    createdAt: yesterday.toISOString(),
    summary: {
      coreTopic: 'AI 연산량 폭증에 따른 글로벌 빅테크의 전력망 및 차세대 원전(SMR) 확보 전쟁',
      keyPoints: [
        '최신 AI 모델 훈련 및 추론 전력 수요가 기존 데이터센터 대비 5배 이상 급증',
        '마이크로소프트, 아마존, 구글 등 주요 빅테크가 원전 재가동 및 SMR 장기 공급계약 체결 가속화',
        '단순 GPU 칩셋 확보 경쟁에서 송배전 인프라, 전력망 유틸리티 기업으로 시장 밸류체인 확장',
        '한국 및 글로벌 원전/전력기기 기업들의 중장기 수혜 가능성과 규제 리스크'
      ],
      detailedSummary: '본 영상은 AI 모델 고도화로 인한 전력 공급 병목 현상을 집중 조명합니다. 1개의 AI 질의당 소모되는 전력이 일반 검색의 수 배에 달하며, 데이터센터 확장이 전력망 한계에 부딪히고 있습니다. 이에 따라 빅테크 기업들은 탄소 배출 없는 24시간 안정 전력원인 원자력 발전소와 장기 계약(PPA)을 맺고 있으며, 이는 전력기기, 변압기, 전선, 원전 밸류체인 전반에 새로운 구조적 성장 기회를 창출하고 있습니다.',
      timelineSummary: [
        { timestamp: '00:00', title: 'AI 발전 뒤에 숨은 전력 부족의 진실', point: '데이터센터 전력 소모량의 기하급수적 증가 현황' },
        { timestamp: '08:30', title: '빅테크와 원자력 발전소의 만남', point: '스리마일 원전 재가동 등 글로벌 빅테크 PPA 분석' },
        { timestamp: '17:15', title: '전력망 인프라 병목 현상', point: '변압기 교체 주기 및 송배전망 증설의 기술적 한계' },
        { timestamp: '24:00', title: '한국 산업계에 미칠 영향과 결론', point: '국내 전력기기 및 부품 제조사의 수혜 요인 정리' }
      ],
      takeaways: [
        'AI 투자 테마를 단순 반도체/소프트웨어에서 에너지 인프라 및 유틸리티 영역으로 다각화 고려 필요',
        '송배전망 현대화 정책 및 국가별 탄소중립 전력 수급 정책 모니터링 필수'
      ],
      keywords: ['AI전력', 'SMR', '데이터센터', '빅테크', '송배전망', '변압기', '슈카월드'],
      sentiment: 'insightful',
      sentimentLabel: '구조적 산업 분석 (통찰적)',
      readingTimeMinutes: 3
    }
  },
  {
    id: 'vid-2',
    videoId: 'jocoding_gemini_agent_2026',
    channelId: 'UCQNE2JmbasNYbjGAcuBiRRg',
    channelTitle: '조코딩 JoCoding',
    channelThumbnail: 'https://images.unsplash.com/photo-1534972195531-a756b1146f75?w=150&auto=format&fit=crop&q=80',
    title: '이제 코딩 몰라도 풀스택 웹서비스 10분 만에 배포하는 최신 AI Agent 실전 튜토리얼',
    description: '최신 멀티모달 AI 코딩 에이전트를 활용해 프론트엔드부터 백엔드 API, 배포까지 10분 만에 완성하는 실전 파이프라인을 시연합니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    publishedAt: yesterday.toISOString(),
    duration: '16:20',
    viewCount: 195000,
    videoUrl: 'https://www.youtube.com/watch?v=jocoding_gemini_agent_2026',
    category: 'IT/테크',
    isYesterday: true,
    isSummarized: true,
    isBookmarked: true,
    createdAt: yesterday.toISOString(),
    summary: {
      coreTopic: '최신 AI 코딩 에이전트를 활용한 노코드/로우코드 풀스택 웹 애플리케이션 원스톱 제작 및 배포',
      keyPoints: [
        '자연어 프롬프트 몇 줄로 TypeScript, React, Tailwind, 서버 API 코드 동시 생성',
        '에이전트가 자체적으로 빌드 오류 및 린트 에러를 감지하고 자가 교정(Self-healing) 수행',
        'GitHub 연동 및 클라우드 컨테이너 1클릭 배포 워크플로우 실습',
        '비개발자도 실무 업무 자동화 도구 및 MVP(최소 기능 제품)를 당일 출시하는 방법'
      ],
      detailedSummary: '조코딩 채널에서는 최근 급부상한 AI 에이전트 기반 개발 환경을 소개했습니다. 기존의 단순 코드 자동 완성을 넘어 전체 프로젝트 구조 설계, 패키지 의존성 설치, 에러 수정, 실시간 웹 배포까지 완결형으로 수행하는 에이전트의 워크플로우를 실제 토이 프로젝트(유튜브 요약 대시보드 제작)를 통해 실시간으로 검증하였습니다.',
      timelineSummary: [
        { timestamp: '00:00', title: 'AI 코딩 에이전트 패러다임 변화', point: '채팅형 어시스턴트에서 자율 실행 에이전트로의 진화' },
        { timestamp: '04:10', title: '프롬프트 설계 및 프로젝트 초기화', point: '명확한 요구사항 명세 작성 노하우' },
        { timestamp: '09:45', title: '에러 자동 수정 및 브라우저 프리뷰', point: '실시간 피드백 루프를 통한 완성도 제고' },
        { timestamp: '14:00', title: '무료 호스팅 배포 및 커스텀 도메인', point: '최종 결과물 공유 및 배포 팁' }
      ],
      takeaways: [
        '개발 진입장벽이 획기적으로 낮아져 기획력과 문제 정의 능력이 핵심 역량으로 부상',
        '사내 업무 자동화 및 개인 사이드 프로젝트 제작에 적극 도입 추천'
      ],
      keywords: ['AI에이전트', '자동화', '바이브코딩', '웹개발', 'MVP', '조코딩'],
      sentiment: 'positive',
      sentimentLabel: '혁신적 & 실용적 (긍정)',
      readingTimeMinutes: 2
    }
  },
  {
    id: 'vid-3',
    videoId: 'sampro_fed_rate_analysis',
    channelId: 'UChLrzhoZhnngiCE0n6P97vg',
    channelTitle: '삼프로TV_경제의신과함께',
    channelThumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=150&auto=format&fit=crop&q=80',
    title: '연준 금리 결정 후폭풍: 고용 지표 둔화와 원달러 환율 전망 심층 진단',
    description: '미국 연준의 최근 통화정책 회의 결과와 고용시장 데이터 변화가 한국 외환시장과 코스피에 미치는 영향을 거시경제 전문가와 진단합니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
    publishedAt: yesterday.toISOString(),
    duration: '42:10',
    viewCount: 310000,
    videoUrl: 'https://www.youtube.com/watch?v=sampro_fed_rate_analysis',
    category: '경제/재테크',
    isYesterday: true,
    isSummarized: true,
    isBookmarked: false,
    createdAt: yesterday.toISOString(),
    summary: {
      coreTopic: '미국 통화정책 방향 전환과 글로벌 환율 변동성에 따른 자산 배분 전략',
      keyPoints: [
        '미국 비농업 고용 지표 둔화세가 확인되면서 점진적 기준금리 인하 기조 재확인',
        '원달러 환율의 단기 변동성 확대 요인(수출 결제 수요 vs 글로벌 달러 약세 압력) 분석',
        '국내 반도체 및 2차전지 등 주요 대형 수출주에 미치는 영향 점검',
        '단기 채권 및 분할 매수 중심의 보수적 포트폴리오 운용 권고'
      ],
      detailedSummary: '삼프로TV에서는 글로벌 매크로 전문가 패널과 함께 연준의 통화정책 기조와 외환 시장 동향을 점검했습니다. 고용 지표 냉각에 따른 경기 연착륙(Soft Landing) 가능성에 무게가 실리고 있으나, 원달러 환율의 급격한 변동에 대비하여 자산별 포트폴리오 밸런싱이 중요한 시점임을 강조했습니다.',
      takeaways: [
        '환율 변동성 완화 시점까지 무리한 레버리지 지양',
        '달러 자산과 원화 자산의 적정 비율 유지 및 배당/채권형 인컴 자산 비중 점검'
      ],
      keywords: ['기준금리', '환율', '미국연준', '고용지표', '삼프로TV', '자산배분'],
      sentiment: 'caution',
      sentimentLabel: '시장 리스크 관리 (주의/균형)',
      readingTimeMinutes: 3
    }
  },
  {
    id: 'vid-4',
    videoId: 'unrealscience_fusion_breakthrough',
    channelId: 'UCaAmw_tXQOq6n2yP8vDqFSw',
    channelTitle: '안될과학 Unrealscience',
    channelThumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&auto=format&fit=crop&q=80',
    title: '인공태양이 마침내 1억도 플라즈마 10분 운전에 성공했다고? 핵융합 최신 근황',
    description: '꿈의 에너지라 불리는 핵융합 발전이 최근 1억도 초고온 플라즈마 연속 운전 기록을 대폭 갱신했습니다. 상용화까지 남은 기술적 난제들을 과학적으로 해설합니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    publishedAt: yesterday.toISOString(),
    duration: '21:15',
    viewCount: 280000,
    videoUrl: 'https://www.youtube.com/watch?v=unrealscience_fusion_breakthrough',
    category: '과학/지식',
    isYesterday: true,
    isSummarized: true,
    isBookmarked: false,
    createdAt: yesterday.toISOString(),
    summary: {
      coreTopic: '초전도 핵융합 토카막 장치의 1억도 초고온 플라즈마 장시간 유지 신기록 달성 및 상용화 로드맵',
      keyPoints: [
        'KSTAR 및 글로벌 핵융합 실험로에서 1억 도 이상의 고온 플라즈마 안정 제어 시간 비약적 상승',
        '텅스텐 디버터와 고온 초전도 자석(HTS) 기술이 만들어낸 물리적 제어 돌파구',
        'Q값(투입 에너지 대비 산출 에너지 비율) 1 초과 이후 실증로(DEMO) 건설 계획',
        '2030년대 후반 전력망 연결을 목표로 하는 민관 핵융합 스타트업 생태계 급성장'
      ],
      detailedSummary: '안될과학 궤도 박사가 설명하는 핵융합 최신 소식입니다. 핵융합은 방사성 폐기물이 극도로 적고 온실가스를 배출하지 않는 궁극의 무한 청정에너지입니다. 최근 초전도 자석 제어 기술의 발전으로 플라즈마 불안정성(ELM) 억제 기술이 완성 단계에 접어들며 상용화 시점이 10년 이상 앞당겨질 가능성이 제기되었습니다.',
      takeaways: [
        '핵융합 상용화는 인류의 에너지 패러다임을 근본적으로 전환할 핵심 게임체인저',
        '고온초전도체 및 첨단 신소재 산업의 동반 성장에 주목'
      ],
      keywords: ['핵융합', '인공태양', '플라즈마', '초전도체', 'KSTAR', '안될과학'],
      sentiment: 'positive',
      sentimentLabel: '과학적 진보 (긍정적)',
      readingTimeMinutes: 2
    }
  },
  {
    id: 'vid-5',
    videoId: 'nomadcoders_react19_deepdive',
    channelId: 'UCUpJs89fSBXNolQGOYKn0YQ',
    channelTitle: '노마드 코더 Nomad Coders',
    channelThumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150&auto=format&fit=crop&q=80',
    title: 'React 19 마이그레이션 총정리: useActionState부터 Server Actions까지 완벽 가이드',
    description: 'React 19에서 새롭게 도입된 핵심 훅과 서버 컴포넌트 생태계 변화, useFormStatus 및 useOptimistic 실제 프로덕션 적용법을 알아봅니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=80',
    publishedAt: yesterday.toISOString(),
    duration: '14:30',
    viewCount: 142000,
    videoUrl: 'https://www.youtube.com/watch?v=nomadcoders_react19_deepdive',
    category: 'IT/테크',
    isYesterday: true,
    isSummarized: true,
    isBookmarked: false,
    createdAt: yesterday.toISOString(),
    summary: {
      coreTopic: 'React 19 공식 릴리즈 주요 기능 및 비동기 상태 관리 간소화 패턴',
      keyPoints: [
        'useActionState 및 useFormStatus를 통한 폼 상태 및 비동기 pending 처리 단순화',
        'useOptimistic 훅을 통한 낙관적 UI 업데이트 구현 시간 90% 단축',
        'ref를 일반 prop으로 전달 가능해짐에 따라 forwardRef 보일러플레이트 제거',
        'React Compiler 도입으로 useMemo, useCallback 수동 최적화 불필요화 전망'
      ],
      detailedSummary: '노마드 코더 니꼬쌤이 React 19의 핵심 변경사항을 실제 코드 예시와 함께 설명합니다. 개발자 경험(DX) 향상에 집중하여 복잡했던 비동기 폼 상태 처리와 옵티미스틱 업데이트를 표준 내장 훅으로 손쉽게 처리할 수 있게 되었습니다.',
      takeaways: [
        '기존 프로젝트의 복잡한 커스텀 비동기 훅을 React 19 표준 훅으로 리팩토링 검토',
        '컴파일러 생태계 변화에 맞춰 더 직관적인 클린 코드 작성 권장'
      ],
      keywords: ['React19', 'Nextjs', '웹개발', '자바스크립트', '노마드코더'],
      sentiment: 'positive',
      sentimentLabel: '개발자 생산성 향상 (긍정)',
      readingTimeMinutes: 2
    }
  },
  {
    id: 'vid-6',
    videoId: 'eo_siliconvalley_startup_ai',
    channelId: 'UC6tTZ_yP_Kx6kHjU3_oE1sQ',
    channelTitle: 'EO 이오',
    channelThumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=150&auto=format&fit=crop&q=80',
    title: '"1인 창업으로 월 매출 1억" 실리콘밸리가 주목하는 차세대 AI 마이크로 SaaS 창업기',
    description: '직원 없이 혼자서 AI 에이전트와 클라우드 인프라를 활용해 연 100만 달러 ARR을 달성한 한국인 창업자의 생생한 인터뷰입니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&auto=format&fit=crop&q=80',
    publishedAt: yesterday.toISOString(),
    duration: '31:50',
    viewCount: 360000,
    videoUrl: 'https://www.youtube.com/watch?v=eo_siliconvalley_startup_ai',
    category: '비즈니스/스타트업',
    isYesterday: true,
    isSummarized: true,
    isBookmarked: true,
    createdAt: yesterday.toISOString(),
    summary: {
      coreTopic: 'AI 에이전트 기술을 활용한 1인 마이크로 SaaS(Micro-SaaS) 창업 및 글로벌 스케일업 전략',
      keyPoints: [
        '과거 대규모 팀이 필요했던 고객지원, 마케팅, 코드 유지보수를 AI 자동화 파이프라인으로 대체',
        '니치(Niche)한 버티컬 B2B 시장의 명확한 페인포인트(Pain-point) 타겟팅 전략',
        'Product Hunt 및 X(트위터) 커뮤니티 기반의 무비용 바이럴 오가닉 마케팅',
        '높은 영업이익률(85% 이상)을 유지하며 지속가능한 현금흐름 구축 노하우'
      ],
      detailedSummary: 'EO 채널에서는 실리콘밸리에서 AI 기술을 지렛대 삼아 1인 기업으로 고수익 SaaS를 운영하는 대표의 스토리를 담았습니다. 대규모 투자 유치 중심의 전통적 스타트업 방식에서 벗어나, 탄탄한 유료 구독 모델과 즉각적인 현금 창출 중심의 부트스트래핑(Bootstrapping) 접근법을 소개합니다.',
      takeaways: [
        '초기 창업 시 무리한 조직 확장보다 자동화 툴을 통한 극도의 운영 효율화 선행',
        '글로벌 타겟의 틈새 소프트웨어 시장에 기회가 풍부함'
      ],
      keywords: ['1인창업', 'SaaS', '스타트업', '실리콘밸리', '부트스트래핑', 'EO이오'],
      sentiment: 'insightful',
      sentimentLabel: '비즈니스 롤모델 (통찰적)',
      readingTimeMinutes: 3
    }
  },
  {
    id: 'vid-7',
    videoId: 'geekble_ironman_robot_arm',
    channelId: 'UCpjyq22P5mJ-gM9LwP8_0yA',
    channelTitle: '긱블 Geekble',
    channelThumbnail: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=80',
    title: '진짜로 뇌파를 읽어서 움직이는 아이언맨 외골격 로봇팔을 만들어보았습니다',
    description: '생체 전위 신호(EMG/EEG) 센서를 역설계하고 3D 프린팅 공학 메커니즘을 결합해 생각대로 작동하는 착용형 로봇팔을 직접 제작했습니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    publishedAt: twoDaysAgo.toISOString(),
    duration: '18:40',
    viewCount: 520000,
    videoUrl: 'https://www.youtube.com/watch?v=geekble_ironman_robot_arm',
    category: '과학/지식',
    isYesterday: false,
    isSummarized: true,
    isBookmarked: false,
    createdAt: twoDaysAgo.toISOString(),
    summary: {
      coreTopic: '생체 근전도(EMG) 센서와 서보 모터 피드백 제어를 활용한 핸즈프리 웨어러블 로봇팔 프로토타이핑',
      keyPoints: [
        '팔 근육의 미세 전기 신호를 필터링하여 노이즈 제거 및 디지털 모터 제어 신호로 변환',
        '경량화 탄소섬유 복합소재와 3D 프린팅 관절 설계를 통한 착용감 및 출력 토크 확보',
        '공학적 실패 과정을 투명하게 공개하며 메이커 문화의 문제 해결력 공유'
      ],
      detailedSummary: '긱블 메이커 팀이 뇌파 및 근전도 센서를 활용하여 손가락과 팔 관절의 움직임을 실시간 모사하는 웨어러블 외골격 암을 제작했습니다. 센서 캘리브레이션과 모터 과열 문제 등 다양한 물리적 난관을 해결하는 과정이 흥미롭게 전개됩니다.',
      takeaways: ['생체 신호 인터페이스(BMI) 기술의 대중화와 DIY 하드웨어 메이킹의 잠재력 확인'],
      keywords: ['로봇팔', '웨어러블', '공학', '메이커', '긱블'],
      sentiment: 'positive',
      sentimentLabel: '흥미진진한 공학 실험',
      readingTimeMinutes: 2
    }
  },
  {
    id: 'vid-8',
    videoId: 'donga_global_trade_war_review',
    channelId: 'UCbF7d7tNq9qD_yC6Xq7V6Qw',
    channelTitle: '동아일보 이슈포커스',
    channelThumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&auto=format&fit=crop&q=80',
    title: '미국-EU-중국 관세 장벽 격돌: 공급망 재편 속 한국 수출 기업의 돌파구는?',
    description: '보호무역주의 확산과 핵심 광물 및 전기차 관세 인상이 글로벌 공급망에 미치는 파장과 한국 산업계의 대응 전략을 집중 취재했습니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80',
    publishedAt: yesterday.toISOString(),
    duration: '15:10',
    viewCount: 165000,
    videoUrl: 'https://www.youtube.com/watch?v=donga_global_trade_war_review',
    category: '뉴스/시사',
    isYesterday: true,
    isSummarized: true,
    isBookmarked: false,
    createdAt: yesterday.toISOString(),
    summary: {
      coreTopic: '글로벌 무역 블록화와 보호무역 관세 정책 강화에 따른 한국 수출 산업 대응책',
      keyPoints: [
        '주요 강대국 간 친환경 기술 및 반도체 대상 상호 보복관세 움직임 심화',
        '현지 생산 공장 투자 및 다변화된 제3국 대체 공급망 구축 필요성 증대',
        '원자재 공급망 안보와 통상 외교의 중요성 부각'
      ],
      detailedSummary: '동아일보 시사 취재팀은 글로벌 관세 장벽이 높아지는 상황에서 한국 제조업체가 겪고 있는 규제 준수 비용 상승과 시장 다변화 전략을 분석했습니다. 미국과 유럽의 신통상 규범에 신속히 대응할 수 있는 민관 합동 컨트롤타워의 필요성을 제기했습니다.',
      takeaways: ['수출 다변화 및 글로벌 현지화 전략 강화 필요'],
      keywords: ['공급망', '관세', '수출', '통상외교', '시사뉴스'],
      sentiment: 'caution',
      sentimentLabel: '대외 경제 리스크 분석',
      readingTimeMinutes: 2
    }
  }
];
