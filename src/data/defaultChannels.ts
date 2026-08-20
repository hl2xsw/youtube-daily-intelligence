import { YouTubeChannel } from '../types';

export const DEFAULT_CHANNELS: YouTubeChannel[] = [
  {
    id: 'ch-shuka',
    channelId: 'UCsJ6RuBiTVWRX156FVbeaGg',
    title: '슈카월드',
    handle: '@shukaworld',
    description: '경제, 금융, 시사 이슈를 쉽고 재미있게 풀어주는 경제/인문 채널',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=150&auto=format&fit=crop&q=80',
    category: '경제/재테크',
    isActive: true,
    subscriberCount: '340만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-jocoding',
    channelId: 'UCQNE2JmbasNYbjGAcuBiRRg',
    title: '조코딩 JoCoding',
    handle: '@jocoding',
    description: '누구나 쉽게 배우는 최신 AI 툴과 테크 트렌드 및 프로그래밍',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534972195531-a756b1146f75?w=150&auto=format&fit=crop&q=80',
    category: 'IT/테크',
    isActive: true,
    subscriberCount: '62만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-sampro',
    channelId: 'UChLrzhoZhnngiCE0n6P97vg',
    title: '삼프로TV_경제의신과함께',
    handle: '@samprotv',
    description: '국내외 거시경제 분석, 글로벌 증시 및 기업 심층 브리핑',
    thumbnailUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=150&auto=format&fit=crop&q=80',
    category: '경제/재테크',
    isActive: true,
    subscriberCount: '250만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-unrealscience',
    channelId: 'UCaAmw_tXQOq6n2yP8vDqFSw',
    title: '안될과학 Unrealscience',
    handle: '@unrealscience',
    description: '양자역학부터 우주, 첨단 AI 반도체까지 알기 쉬운 과학 지식',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&auto=format&fit=crop&q=80',
    category: '과학/지식',
    isActive: true,
    subscriberCount: '115만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-nomad',
    channelId: 'UCUpJs89fSBXNolQGOYKn0YQ',
    title: '노마드 코더 Nomad Coders',
    handle: '@nomadcoders',
    description: '글로벌 최신 테크 소식과 개발자 커리어, 신기술 리뷰',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150&auto=format&fit=crop&q=80',
    category: 'IT/테크',
    isActive: true,
    subscriberCount: '51만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-eo',
    channelId: 'UC6tTZ_yP_Kx6kHjU3_oE1sQ',
    title: 'EO 이오',
    handle: '@eoeoeo',
    description: '글로벌 스타트업 혁신가들과 비즈니스 리더들의 스토리',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=150&auto=format&fit=crop&q=80',
    category: '비즈니스/스타트업',
    isActive: true,
    subscriberCount: '68만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-geekble',
    channelId: 'UCpjyq22P5mJ-gM9LwP8_0yA',
    title: '긱블 Geekble',
    handle: '@geekble',
    description: '쓸모없어 보이지만 기발한 공학 실험과 테크 메이킹',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=80',
    category: '과학/지식',
    isActive: true,
    subscriberCount: '110만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-donga',
    channelId: 'UCbF7d7tNq9qD_yC6Xq7V6Qw',
    title: '동아일보 이슈포커스',
    handle: '@dongai',
    description: '주요 국내외 시사 뉴스 및 심층 분석 리포트',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&auto=format&fit=crop&q=80',
    category: '뉴스/시사',
    isActive: true,
    subscriberCount: '90만명',
    addedAt: new Date().toISOString()
  }
];

export const CHANNEL_PRESET_PACKS = [
  {
    name: '🚀 IT & AI 혁신 팩',
    description: '최신 인공지능, 개발 생태계 및 빅테크 트렌드 집중 모니터링',
    channels: [
      {
        channelId: 'UCQNE2JmbasNYbjGAcuBiRRg',
        title: '조코딩 JoCoding',
        handle: '@jocoding',
        category: 'IT/테크' as const,
        thumbnailUrl: 'https://images.unsplash.com/photo-1534972195531-a756b1146f75?w=150&auto=format&fit=crop&q=80',
        subscriberCount: '62만명'
      },
      {
        channelId: 'UCUpJs89fSBXNolQGOYKn0YQ',
        title: '노마드 코더 Nomad Coders',
        handle: '@nomadcoders',
        category: 'IT/테크' as const,
        thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150&auto=format&fit=crop&q=80',
        subscriberCount: '51만명'
      },
      {
        channelId: 'UCsXVk37bltHxD1rDPwtNM8Q',
        title: 'Kurzgesagt – In a Nutshell',
        handle: '@kurzgesagt',
        category: '과학/지식' as const,
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&auto=format&fit=crop&q=80',
        subscriberCount: '2200만명'
      }
    ]
  },
  {
    name: '💰 경제 & 글로벌 금융 팩',
    description: '글로벌 거시경제, 환율, 금리, 주식 시장 실시간 인사이트',
    channels: [
      {
        channelId: 'UCsJ6RuBiTVWRX156FVbeaGg',
        title: '슈카월드',
        handle: '@shukaworld',
        category: '경제/재테크' as const,
        thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=150&auto=format&fit=crop&q=80',
        subscriberCount: '340만명'
      },
      {
        channelId: 'UChLrzhoZhnngiCE0n6P97vg',
        title: '삼프로TV_경제의신과함께',
        handle: '@samprotv',
        category: '경제/재테크' as const,
        thumbnailUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=150&auto=format&fit=crop&q=80',
        subscriberCount: '250만명'
      }
    ]
  },
  {
    name: '💡 스타트업 & 미래 인사이트 팩',
    description: '차세대 유니콘, 비즈니스 모델 혁신 및 리더십 인터뷰',
    channels: [
      {
        channelId: 'UC6tTZ_yP_Kx6kHjU3_oE1sQ',
        title: 'EO 이오',
        handle: '@eoeoeo',
        category: '비즈니스/스타트업' as const,
        thumbnailUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=150&auto=format&fit=crop&q=80',
        subscriberCount: '68만명'
      },
      {
        channelId: 'UCaAmw_tXQOq6n2yP8vDqFSw',
        title: '안될과학 Unrealscience',
        handle: '@unrealscience',
        category: '과학/지식' as const,
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&auto=format&fit=crop&q=80',
        subscriberCount: '115만명'
      }
    ]
  }
];
