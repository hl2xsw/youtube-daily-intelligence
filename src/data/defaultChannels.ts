import { YouTubeChannel } from '../types';

export const DEFAULT_CHANNELS: YouTubeChannel[] = [
  {
    id: 'ch-shuka',
    channelId: 'UCsJ6RuBiTVWRX156FVbeaGg',
    title: '슈카월드',
    handle: '@shukaworld',
    description: '경제, 금융, 시사 이슈를 쉽고 재미있게 풀어주는 경제/인문 채널',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k8bBv4g9t-s7v-t8m_t9z=s900-c-k-c0x00ffffff-no-rj',
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
    thumbnailUrl: 'https://yt3.googleusercontent.com/Ju_n8o_3uH37U9jI01iWjLz2t8Yc8k8l7p=s900-c-k-c0x00ffffff-no-rj',
    category: 'IT/테크',
    isActive: true,
    subscriberCount: '62만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-ttimes',
    channelId: 'UCelFN6fJ6OY6v8pbc_SLiXA',
    title: '티타임즈TV',
    handle: '@TTimesTV',
    description: '세상의 혁신과 비즈니스, 테크 트렌드를 가장 깊이 있게 분석하는 티타임즈TV 공식 채널',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_lk_PZbzPbJP9ZNfuzPC0U8_Q2dafVkwKhoNGi_G2pcjg=s900-c-k-c0x00ffffff-no-rj',
    category: '비즈니스/스타트업',
    isActive: true,
    subscriberCount: '35.5만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-sampro',
    channelId: 'UChLrzhoZhnngiCE0n6P97vg',
    title: '삼프로TV_경제의신과함께',
    handle: '@samprotv',
    description: '국내외 거시경제 분석, 글로벌 증시 및 기업 심층 브리핑',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_n4L5P-s8v=s900-c-k-c0x00ffffff-no-rj',
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
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_unreal=s900-c-k-c0x00ffffff-no-rj',
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
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_nomad=s900-c-k-c0x00ffffff-no-rj',
    category: 'IT/테크',
    isActive: true,
    subscriberCount: '51만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-sbsnews',
    channelId: 'UCkinYTS9IHqOEwR1Sze2JTw',
    title: 'SBS 뉴스',
    handle: '@sbsnews8',
    description: '대한민국 No.1 SBS뉴스 공식 채널입니다. 실시간 주요 속보 및 심층 보도',
    thumbnailUrl: 'https://yt3.googleusercontent.com/SqFZwlQcqLs4JMZd3lthkg79kCHi68eerNpkkahvEYSPWhm2afUNqFkbMC6J6JJcy9JJ_DzQ8w=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    isActive: true,
    subscriberCount: '527만명',
    addedAt: new Date().toISOString()
  },
  {
    id: 'ch-kimkwangsuk',
    channelId: 'UC3pfEoxaRDT6hvZZjpHu7Tg',
    title: '경제 읽어주는 남자(김광석TV)',
    handle: '@경읽남_김광석TV',
    description: '실물경제, 거시경제 분석 및 자산 시장 투자 인사이트',
    thumbnailUrl: 'https://yt3.googleusercontent.com/Tai2Mxx-1IWzJ6EyiRDAQfp5c3ZAV_A_jNk7ESsTmrhk2Ju7b8xecJ35HVTcaCSB98392kxxydc=s900-c-k-c0x00ffffff-no-rj',
    category: '경제/재테크',
    isActive: true,
    subscriberCount: '51.7만명',
    addedAt: new Date().toISOString()
  }
];

export const CHANNEL_PRESET_PACKS = [
  {
    id: 'pack-news',
    name: '📰 주요 뉴스 & 24H 시사 미디어 팩',
    badge: '추천 뉴스',
    description: '실시간 국내외 주요 속보, 탐사 보도 및 24시간 시사 브리핑 채널 모음',
    channels: [
      {
        channelId: 'UCkinYTS9IHqOEwR1Sze2JTw',
        title: 'SBS 뉴스',
        handle: '@sbsnews8',
        category: '뉴스/시사' as const,
        description: '대한민국 No.1 SBS뉴스 공식 채널',
        thumbnailUrl: 'https://yt3.googleusercontent.com/SqFZwlQcqLs4JMZd3lthkg79kCHi68eerNpkkahvEYSPWhm2afUNqFkbMC6J6JJcy9JJ_DzQ8w=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '527만명'
      },
      {
        channelId: 'UCF4Wxdo3inmxP-Y59wXDsFw',
        title: 'MBCNEWS',
        handle: '@MBCNEWS11',
        category: '뉴스/시사' as const,
        description: '세상과 소통하는 시간, MBC 뉴스 공식 유튜브 채널',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_nKpBrT7zzqTfdlfUHzw60wMU5KqV-kBmiFjU9dvMI8ePo=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '480만명'
      },
      {
        channelId: 'UCTHCOPwqNfZ0uiKOvFyhGwg',
        title: '연합뉴스TV',
        handle: '@yonhapnewstv23',
        category: '뉴스/시사' as const,
        description: '빠르고 정확한 24시간 대한민국 뉴스 채널 연합뉴스TV',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k6k-Z5sA63aN66RkU8e7bS7yO9_hM8jD=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '270만명'
      },
      {
        channelId: 'UChlgI3UHCOnwUGzWzbJ3H5w',
        title: 'YTN',
        handle: '@ytnnews24',
        category: '뉴스/시사' as const,
        description: '대한민국 24시간 뉴스 전문 채널 YTN 공식 유튜브',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_m8v=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '460만명'
      },
      {
        channelId: 'UCsU-I-vHLiaMfV_ceaYz5rQ',
        title: 'JTBC News',
        handle: '@jtbc_news',
        category: '뉴스/시사' as const,
        description: '진실이 뉴스가 됩니다, JTBC 뉴스 공식 유튜브',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_jtbc=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '390만명'
      },
      {
        channelId: 'UCfq4V1DAuaojnr2ryvWNysw',
        title: '채널A 뉴스',
        handle: '@channelA-news',
        category: '뉴스/시사' as const,
        description: '실시간 정치, 경제, 사회 속보 채널A 뉴스 공식 유튜브',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_channela=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '240만명'
      },
      {
        channelId: 'UCG9aFJTZ-lMCHAiO1KJsirg',
        title: 'MBN News',
        handle: '@mbn_news',
        category: '뉴스/시사' as const,
        description: 'MBN 뉴스 공식 유튜브 채널, 정확하고 빠른 보도',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_mbn=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '230만명'
      },
      {
        channelId: 'UCWlV3Lz_55UaX4JsMj-z__Q',
        title: '뉴스TVCHOSUN',
        handle: '@tvchosunnews',
        category: '뉴스/시사' as const,
        description: 'TV CHOSUN 뉴스 공식 유튜브 채널',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_tvchosun=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '220만명'
      },
      {
        channelId: 'UCF8AeLlUbEpKju6v1H6p8Eg',
        title: '한국경제TV',
        handle: '@한국경제TV',
        category: '뉴스/시사' as const,
        description: '대한민국 대표 경제 및 실시간 증시 뉴스 전문 방송',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_hankyung=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '110만명'
      }
    ]
  },
  {
    id: 'pack-it',
    name: '🚀 IT & AI 혁신 팩',
    badge: '인기 테크',
    description: '최신 인공지능, 개발 생태계, 빅테크 혁신 및 테크 트렌드 집중 모니터링',
    channels: [
      {
        channelId: 'UCQNE2JmbasNYbjGAcuBiRRg',
        title: '조코딩 JoCoding',
        handle: '@jocoding',
        category: 'IT/테크' as const,
        description: '누구나 쉽게 배우는 최신 AI 툴과 테크 트렌드',
        thumbnailUrl: 'https://yt3.googleusercontent.com/Ju_n8o_3uH37U9jI01iWjLz2t8Yc8k8l7p=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '62만명'
      },
      {
        channelId: 'UCUpJs89fSBXNolQGOYKn0YQ',
        title: '노마드 코더 Nomad Coders',
        handle: '@nomadcoders',
        category: 'IT/테크' as const,
        description: '글로벌 최신 테크 소식과 개발자 커리어, 신기술 리뷰',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_nomad=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '51만명'
      },
      {
        channelId: 'UCelFN6fJ6OY6v8pbc_SLiXA',
        title: '티타임즈TV',
        handle: '@TTimesTV',
        category: '비즈니스/스타트업' as const,
        description: '혁신 기업과 글로벌 테크 트렌드 심층 분석',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_lk_PZbzPbJP9ZNfuzPC0U8_Q2dafVkwKhoNGi_G2pcjg=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '35.5만명'
      },
      {
        channelId: 'UCe_P1k1G1zI0Nf_F7dKqT0w',
        title: '테크몽 Techmong',
        handle: '@techmong',
        category: 'IT/테크' as const,
        description: '쉽고 친절한 IT 기기 및 테크 제품 심층 분석',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_techmong=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '75만명'
      }
    ]
  },
  {
    id: 'pack-economy',
    name: '💰 경제 & 글로벌 금융 팩',
    badge: '추천 금융',
    description: '글로벌 거시경제, 환율, 금리, 주식 시장 실시간 분석 및 투자 인사이트',
    channels: [
      {
        channelId: 'UCsJ6RuBiTVWRX156FVbeaGg',
        title: '슈카월드',
        handle: '@shukaworld',
        category: '경제/재테크' as const,
        description: '경제, 금융, 시사 이슈를 쉽고 재미있게 풀어주는 경제 채널',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k8bBv4g9t-s7v-t8m_t9z=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '340만명'
      },
      {
        channelId: 'UChLrzhoZhnngiCE0n6P97vg',
        title: '삼프로TV_경제의신과함께',
        handle: '@samprotv',
        category: '경제/재테크' as const,
        description: '국내외 거시경제 분석, 글로벌 증시 및 기업 심층 브리핑',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_n4L5P-s8v=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '250만명'
      },
      {
        channelId: 'UC3pfEoxaRDT6hvZZjpHu7Tg',
        title: '경제 읽어주는 남자(김광석TV)',
        handle: '@경읽남_김광석TV',
        category: '경제/재테크' as const,
        description: '실물경제, 거시경제 분석 및 자산 시장 투자 인사이트',
        thumbnailUrl: 'https://yt3.googleusercontent.com/Tai2Mxx-1IWzJ6EyiRDAQfp5c3ZAV_A_jNk7ESsTmrhk2Ju7b8xecJ35HVTcaCSB98392kxxydc=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '51.7만명'
      }
    ]
  },
  {
    id: 'pack-startup',
    name: '💡 스타트업 & 미래 인사이트 팩',
    badge: '스타트업/과학',
    description: '차세대 유니콘, 비즈니스 모델 혁신, 첨단 과학 및 리더십 인터뷰',
    channels: [
      {
        channelId: 'UC6tTZ_yP_Kx6kHjU3_oE1sQ',
        title: 'EO 이오',
        handle: '@eoeoeo',
        category: '비즈니스/스타트업' as const,
        description: '글로벌 스타트업 혁신가들과 비즈니스 리더들의 스토리',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_eo=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '68만명'
      },
      {
        channelId: 'UCaAmw_tXQOq6n2yP8vDqFSw',
        title: '안될과학 Unrealscience',
        handle: '@unrealscience',
        category: '과학/지식' as const,
        description: '양자역학부터 우주, 첨단 AI 반도체까지 알기 쉬운 과학 지식',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_unreal=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '115만명'
      },
      {
        channelId: 'UCkglhL_29gGqP_lA7b52dJQ',
        title: '1분만',
        handle: '@1minonly',
        category: '과학/지식' as const,
        description: '세상의 모든 흥미로운 1분 지식과 이야기',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_1min=s900-c-k-c0x00ffffff-no-rj',
        subscriberCount: '135만명'
      }
    ]
  }
];
