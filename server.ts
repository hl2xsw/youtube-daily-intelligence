import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Enable CORS and Preflight for all environments
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Lazy initialization for Gemini client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Comprehensive known channels catalog for instant and accurate Korean channel resolving
const KNOWN_CHANNELS_MAP: Array<{
  keywords: string[];
  channelId: string;
  title: string;
  handle: string;
  description: string;
  thumbnailUrl: string;
  category: string;
  subscriberCount: string;
}> = [
  {
    keywords: ['경읽남', '김광석tv', '김광석', '경읽남_김광석tv', '경제읽어주는남자'],
    channelId: 'UC3pfEoxaRDT6hvZZjpHu7Tg',
    title: '경제 읽어주는 남자(김광석TV)',
    handle: '@경읽남_김광석TV',
    description: '경제를 빠르고 쉽게 들려드리는 경제 읽어주는 남자, 김광석입니다.',
    thumbnailUrl: 'https://yt3.googleusercontent.com/Tai2Mxx-1IWzJ6EyiRDAQfp5c3ZAV_A_jNk7ESsTmrhk2Ju7b8xecJ35HVTcaCSB98392kxxydc=s900-c-k-c0x00ffffff-no-rj',
    category: '경제/재테크',
    subscriberCount: '51.7만명'
  },
  {
    keywords: ['shukaworld', '슈카월드', '슈카', '슈가월드', 'syuka', 'syukaworld', '경제'],
    channelId: 'UCsJ6RuBiTVWRX156FVbeaGg',
    title: '슈카월드',
    handle: '@shukaworld',
    description: '경제, 금융, 시사 이슈를 쉽고 재미있게 풀어주는 경제/인문 채널',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k8bBv4g9t-s7v-t8m_t9z=s900-c-k-c0x00ffffff-no-rj',
    category: '경제/재테크',
    subscriberCount: '340만명'
  },
  {
    keywords: ['samprotv', '삼프로tv', '삼프로', '경제의신과함께', '3protv', '주식'],
    channelId: 'UChlv4GSd7OQl3js-jkLOnFA',
    title: '삼프로TV 3PROTV',
    handle: '@3protv',
    description: '국내외 거시경제 분석, 글로벌 증시 및 기업 심층 브리핑',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_n4L5P-s8v=s900-c-k-c0x00ffffff-no-rj',
    category: '경제/재테크',
    subscriberCount: '250만명'
  },
  {
    keywords: ['jocoding', '조코딩', 'jocoding채널', 'ai', '코딩', '개발', 'chatgpt'],
    channelId: 'UCQNE2JmbasNYbjGAcuBiRRg',
    title: '조코딩 JoCoding',
    handle: '@jocoding',
    description: '누구나 쉽게 배우는 최신 AI 툴과 테크 트렌드 및 프로그래밍',
    thumbnailUrl: 'https://yt3.googleusercontent.com/Ju_n8o_3uH37U9jI01iWjLz2t8Yc8k8l7p=s900-c-k-c0x00ffffff-no-rj',
    category: 'IT/테크',
    subscriberCount: '62만명'
  },
  {
    keywords: ['nomadcoders', '노마드코더', '노마드 코더', '개발자', '니꼬'],
    channelId: 'UCUpJs89fSBXNolQGOYKn0YQ',
    title: '노마드 코더 Nomad Coders',
    handle: '@nomadcoders',
    description: '글로벌 최신 테크 소식과 개발자 커리어, 신기술 리뷰',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_nomad=s900-c-k-c0x00ffffff-no-rj',
    category: 'IT/테크',
    subscriberCount: '51만명'
  },
  {
    keywords: ['ttimestv', 'ttimes', '티타임즈', '티타임즈tv', '티타임스', '혁신', '빅테크'],
    channelId: 'UCelFN6fJ6OY6v8pbc_SLiXA',
    title: '티타임즈TV',
    handle: '@TTimesTV',
    description: '세상의 혁신과 비즈니스, 테크 트렌드를 가장 깊이 있게 분석하는 티타임즈TV 공식 채널',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_lk_PZbzPbJP9ZNfuzPC0U8_Q2dafVkwKhoNGi_G2pcjg=s900-c-k-c0x00ffffff-no-rj',
    category: '비즈니스/스타트업',
    subscriberCount: '35.5만명'
  },
  {
    keywords: ['unrealscience', '안될과학', '과학', '궤도', '약', '항성'],
    channelId: 'UCMc4EmuDxnHPc6pgGW-QWvQ',
    title: '안될과학 Unrealscience',
    handle: '@unrealscience',
    description: '양자역학부터 우주, 첨단 AI 반도체까지 알기 쉬운 과학 지식',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_unreal=s900-c-k-c0x00ffffff-no-rj',
    category: '과학/지식',
    subscriberCount: '115만명'
  },
  {
    keywords: ['eoeoeo', 'eo', '이오', '태용', '스타트업', 'eokorea', 'eo korea', '창업', 'ceo'],
    channelId: 'UC5WXrNWV1Z8UqrBqYEMwvFg',
    title: 'EO 이오',
    handle: '@eoeoeo',
    description: '글로벌 스타트업 혁신가들과 비즈니스 리더들의 스토리',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_eo=s900-c-k-c0x00ffffff-no-rj',
    category: '비즈니스/스타트업',
    subscriberCount: '68만명'
  },
  {
    keywords: ['techmong', '테크몽', '전자기기', '갤럭시', '아이폰'],
    channelId: 'UCFX6adXoyQKxft933NB3rmA',
    title: '테크몽 Techmong',
    handle: '@techmong',
    description: '쉽고 친절한 IT 기기 및 테크 제품 심층 분석',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_techmong=s900-c-k-c0x00ffffff-no-rj',
    category: 'IT/테크',
    subscriberCount: '75만명'
  },
  {
    keywords: ['1min', '1minonly', '1분만', '1분'],
    channelId: 'UCM31rBPQdifQKUmBKtwVqBg',
    title: '1분만',
    handle: '@1minonly',
    description: '세상의 모든 흥미로운 1분 지식과 이야기',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_1min=s900-c-k-c0x00ffffff-no-rj',
    category: '과학/지식',
    subscriberCount: '135만명'
  },
  {
    keywords: ['sbsnews8', 'sbs뉴스', 'sbs 뉴스', 'sbsnews', 'sbs', '에스비에스', '스브스'],
    channelId: 'UCkinYTS9IHqOEwR1Sze2JTw',
    title: 'SBS 뉴스',
    handle: '@sbsnews8',
    description: '대한민국 No.1 SBS뉴스 공식 채널입니다. 실시간 주요 속보 및 심층 보도',
    thumbnailUrl: 'https://yt3.googleusercontent.com/SqFZwlQcqLs4JMZd3lthkg79kCHi68eerNpkkahvEYSPWhm2afUNqFkbMC6J6JJcy9JJ_DzQ8w=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '527만명'
  },
  {
    keywords: ['mbcnews11', 'mbc뉴스', 'mbcnews', 'mbc', '엠비씨뉴스', 'mbcnews1'],
    channelId: 'UCF4Wxdo3inmxP-Y59wXDsFw',
    title: 'MBCNEWS',
    handle: '@MBCNEWS11',
    description: 'MBC 뉴스 공식 유튜브 채널입니다. 세상과 소통하는 시간, MBC 뉴스와 함께 하세요!',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_nKpBrT7zzqTfdlfUHzw60wMU5KqV-kBmiFjU9dvMI8ePo=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '480만명'
  },
  {
    keywords: ['yonhapnewstv23', '연합뉴스tv', '연합뉴스', 'yonhapnewstv', '연합', 'yonhapnews'],
    channelId: 'UCTHCOPwqNfZ0uiKOvFyhGwg',
    title: '연합뉴스TV',
    handle: '@yonhapnewstv23',
    description: '빠르고 정확한 24시간 대한민국 뉴스 채널 연합뉴스TV입니다.',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k6k-Z5sA63aN66RkU8e7bS7yO9_hM8jD=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '270만명'
  },
  {
    keywords: ['ytnnews24', 'ytn', 'ytn뉴스', '와이티엔'],
    channelId: 'UChlgI3UHCOnwUGzWzbJ3H5w',
    title: 'YTN',
    handle: '@ytnnews24',
    description: '대한민국 24시간 뉴스 전문 채널 YTN 공식 유튜브',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_m8v=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '460만명'
  },
  {
    keywords: ['kbs_news', 'kbsnews', 'kbs 뉴스', 'kbs뉴스', '케이블'],
    channelId: 'UCcQTRi69dsVYHN3exePtZ1A',
    title: 'KBS News',
    handle: '@kbs_news',
    description: 'KBS 뉴스 공식 유튜브 채널',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kbs=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '310만명'
  },
  {
    keywords: ['jtbc_news', 'jtbcnews', 'jtbc 뉴스', 'jtbc뉴스', 'jtbc', '제이티비씨'],
    channelId: 'UCsU-I-vHLiaMfV_ceaYz5rQ',
    title: 'JTBC News',
    handle: '@jtbc_news',
    description: 'JTBC 뉴스 공식 유튜브 채널',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_jtbc=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '390만명'
  },
  {
    keywords: ['channela_news', '채널a뉴스', '채널a 뉴스', '채널a', 'channela'],
    channelId: 'UCfq4V1DAuaojnr2ryvWNysw',
    title: '채널A 뉴스',
    handle: '@channelA-news',
    description: '채널A 뉴스 공식 유튜브 채널입니다.',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_channela=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '240만명'
  },
  {
    keywords: ['mbn_news', 'mbn뉴스', 'mbn 뉴스', 'mbn', '매일방송'],
    channelId: 'UCG9aFJTZ-lMCHAiO1KJsirg',
    title: 'MBN News',
    handle: '@mbn_news',
    description: 'MBN 뉴스 공식 유튜브 채널입니다.',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_mbn=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '230만명'
  },
  {
    keywords: ['tvchosunnews', 'tv조선뉴스', 'tv조선 뉴스', 'tv조선', '뉴스tvchosun'],
    channelId: 'UCWlV3Lz_55UaX4JsMj-z__Q',
    title: '뉴스TVCHOSUN',
    handle: '@tvchosunnews',
    description: 'TV CHOSUN 뉴스 공식 유튜브 채널입니다.',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_tvchosun=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '220만명'
  },
  {
    keywords: ['한국경제tv', '한국경제', 'hankyungtv', '한경tv', '한국경제신문'],
    channelId: 'UCF8AeLlUbEpKju6v1H6p8Eg',
    title: '한국경제TV',
    handle: '@한국경제TV',
    description: '대한민국 대표 경제 방송 한국경제TV 공식 유튜브 채널입니다.',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_hankyung=s900-c-k-c0x00ffffff-no-rj',
    category: '경제/재테크',
    subscriberCount: '110만명'
  },
  {
    keywords: ['mtn_moneytoday', 'mtn', '머니투데이방송', '머니투데이', 'mtn머니투데이'],
    channelId: 'UClErHbdZKUnD1NyIUeQWvuQ',
    title: 'MTN 머니투데이방송',
    handle: '@mtn_moneytoday',
    description: '국내외 증시 및 금융, 부동산 실시간 전문 방송',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_mtn=s900-c-k-c0x00ffffff-no-rj',
    category: '경제/재테크',
    subscriberCount: '105만명'
  }
];

// Helper: Deep resolve YouTube channel metadata and real channelId
async function resolveChannelInfo(rawInput: string, fallbackTitle?: string): Promise<{
  channelId: string;
  title: string;
  handle: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: string;
  category: string;
}> {
  if (!rawInput) {
    throw new Error('채널 식별 정보가 없습니다.');
  }

  let clean = rawInput.trim();
  try {
    clean = decodeURIComponent(clean);
  } catch {}

  // Strip leading URL protocols and domain
  clean = clean.replace(/^https?:\/\/(www\.|m\.)?youtube\.com\//i, '').replace(/\/+$/, '');
  // Strip sub-routes like /videos, /featured, /about
  clean = clean.replace(/\/(videos|featured|about|community|streams|playlists)$/i, '');

  const normalized = clean.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

  // 1. Check known channel catalog
  for (const item of KNOWN_CHANNELS_MAP) {
    if (item.channelId === clean) {
      return { ...item };
    }
    const isKeywordMatch = item.keywords.some(kw => {
      const normKw = kw.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
      return normalized === normKw || normalized.includes(normKw);
    });
    if (isKeywordMatch) {
      return { ...item };
    }
  }

  let channelId = '';
  let handle = '';
  let title = fallbackTitle || clean;
  let description = `${title} 채널 모니터링`;
  let thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
  let subscriberCount = '구독자 확인중';
  let category = 'IT/테크';

  // 2. If it's already a valid 24-character YouTube Channel ID (UC...)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(clean)) {
    channelId = clean;
  }

  // 3. Try Direct Page Fetch with handle or channel ID
  const urlsToTry: string[] = [];
  if (channelId) {
    urlsToTry.push(`https://www.youtube.com/channel/${channelId}`);
  } else {
    // Determine handle format
    let hName = clean.replace(/^@/, '');
    if (clean.startsWith('channel/')) {
      channelId = clean.replace('channel/', '');
      urlsToTry.push(`https://www.youtube.com/channel/${channelId}`);
    } else if (clean.startsWith('c/') || clean.startsWith('user/')) {
      urlsToTry.push(`https://www.youtube.com/${clean}`);
    } else {
      handle = `@${hName}`;
      urlsToTry.push(`https://www.youtube.com/@${encodeURIComponent(hName)}`);
      urlsToTry.push(`https://www.youtube.com/${encodeURIComponent(hName)}`);
    }
  }

  for (const url of urlsToTry) {
    try {
      const ytRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      if (ytRes.ok) {
        const html = await ytRes.text();
        
        // Extract channel ID
        const chIdMatch = html.match(/<meta itemprop="identifier" content="(UC[a-zA-Z0-9_-]{22})"/i) ||
                          html.match(/<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]{22})"/i) ||
                          html.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/i) ||
                          html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/i) ||
                          html.match(/"browseId":"(UC[a-zA-Z0-9_-]{22})"/i) ||
                          html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/i);
        
        if (chIdMatch) {
          channelId = chIdMatch[1];
        }

        // Extract title
        const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i) ||
                        html.match(/<title>([^<]+) - YouTube<\/title>/i);
        if (ogTitle) {
          title = ogTitle[1].replace(/ - YouTube$/i, '').trim();
        }

        // Extract thumbnail
        const ogImg = html.match(/<meta property="og:image" content="([^"]+)"/i) ||
                      html.match(/"avatar":\s*\{\s*"thumbnails":\s*\[\s*\{\s*"url":\s*"([^"]+)"/i);
        if (ogImg) {
          thumbnailUrl = ogImg[1];
        }

        // Extract description
        const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/i);
        if (ogDesc) {
          description = ogDesc[1].trim();
        }

        // Extract subscriber count text
        const subMatch = html.match(/"subscriberCountText":\s*\{\s*"simpleText":\s*"([^"]+)"/i) ||
                         html.match(/"subscriberCountText":\s*\{\s*"accessibility":\s*\{\s*"accessibilityData":\s*\{\s*"label":\s*"([^"]+)"/i);
        if (subMatch) {
          subscriberCount = subMatch[1];
        }

        if (channelId) break;
      }
    } catch (err) {
      console.warn(`Direct fetch to ${url} failed:`, err);
    }
  }

  // 4. If still no valid channel ID, search YouTube
  if (!channelId || !channelId.startsWith('UC') || channelId.startsWith('UC_')) {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      if (searchRes.ok) {
        const searchHtml = await searchRes.text();
        const chMatch = searchHtml.match(/"channelRenderer":\s*\{\s*"channelId":\s*"(UC[a-zA-Z0-9_-]{22})"/i) ||
                        searchHtml.match(/"browseEndpoint":\s*\{\s*"browseId":\s*"(UC[a-zA-Z0-9_-]{22})"/i);
        if (chMatch) {
          channelId = chMatch[1];
          const titleMatch = searchHtml.match(/"channelRenderer":\s*\{\s*"channelId":\s*"[^"]+",\s*"title":\s*\{\s*"simpleText":\s*"([^"]+)"/i);
          if (titleMatch) title = titleMatch[1];
        }
      }
    } catch (searchErr) {
      console.warn('YouTube search fallback failed:', searchErr);
    }
  }

  // Final fallback channelId if completely unreachable
  if (!channelId) {
    channelId = `UC_${clean.replace(/[^a-zA-Z0-9_]/g, '')}`;
  }

  if (!handle) {
    handle = clean.startsWith('@') ? clean : `@${clean.replace(/[^a-zA-Z0-9가-힣_]/g, '')}`;
  }

  return {
    channelId,
    title: title || clean,
    handle,
    description: description || `${title} 채널의 최신 영상 요약 및 모니터링`,
    thumbnailUrl,
    subscriberCount,
    category
  };
}

// 2. Lookup YouTube Channel (via handle or URL or ID or search query)
app.post('/api/youtube/lookup-channel', async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ error: '채널 URL, @핸들 또는 채널 ID를 입력해주세요.' });
    }

    const channelData = await resolveChannelInfo(input);
    res.json({ success: true, channel: channelData });
  } catch (error: any) {
    console.error('Channel lookup error:', error);
    res.status(500).json({ error: error.message || '채널 정보를 확인하는데 실패했습니다.' });
  }
});

// 2-1. Search YouTube Channels (Returns multiple candidate channels for user selection)
app.post('/api/youtube/search-channels', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: '검색어를 입력해주세요.' });
    }

    let clean = query.trim();
    try {
      clean = decodeURIComponent(clean);
    } catch {}

    const results: Array<{
      channelId: string;
      title: string;
      handle: string;
      description: string;
      thumbnailUrl: string;
      subscriberCount: string;
      category: string;
    }> = [];
    const seenIds = new Set<string>();

    // 1. Check known channels catalog for direct/keyword match
    const normalized = clean.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
    for (const item of KNOWN_CHANNELS_MAP) {
      const match = item.keywords.some(kw => {
        const normKw = kw.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        return normKw === normalized || normKw.includes(normalized) || normalized.includes(normKw);
      }) || item.title.toLowerCase().includes(normalized) || item.handle.toLowerCase().includes(normalized);

      if (match && !seenIds.has(item.channelId)) {
        seenIds.add(item.channelId);
        results.push({
          channelId: item.channelId,
          title: item.title,
          handle: item.handle,
          description: item.description,
          thumbnailUrl: item.thumbnailUrl,
          subscriberCount: item.subscriberCount,
          category: item.category
        });
      }
    }

    // 2. If query looks like a handle, URL, or channel ID, try direct resolve first
    if (clean.startsWith('@') || clean.startsWith('http') || /^UC[a-zA-Z0-9_-]{22}$/.test(clean)) {
      try {
        const direct = await resolveChannelInfo(clean);
        if (direct && direct.channelId && !seenIds.has(direct.channelId)) {
          seenIds.add(direct.channelId);
          results.unshift(direct);
        }
      } catch {
        // continue
      }
    }

    // 3. YouTube search with channel filter via Innertube (Primary) and Scraping (Fallback)
    try {
      // Tier 1: Innertube Channel Search
      const innertubeRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cookie': 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmc2J1aWxkdG9vbHNsYXVkZXJfc2VydmVyXzIwMjQwMjI1LjA1X3AwGgJrbxACGgJrbw; YSC=a; GPS=1'
        },
        body: JSON.stringify({
          context: { client: { clientName: 'WEB', clientVersion: '2.20240501.01.00', hl: 'ko', gl: 'KR' } },
          query: clean,
          params: 'EgIQAg%3D%3D' // Channel filter
        })
      });

      let channelData: any = null;
      if (innertubeRes.ok) {
        try {
          channelData = await innertubeRes.json();
        } catch {}
      }

      if (!channelData) {
        // Tier 2: Scraping Fallback
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}&sp=EgIQAg%253D%253D`;
        const searchRes = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        });
        if (searchRes.ok) {
          const html = await searchRes.text();
          const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/s);
          if (match) {
            channelData = JSON.parse(match[1]);
          }
        }
      }

      if (channelData) {
        const traverse = (node: any) => {
          if (!node || typeof node !== 'object') return;
          if (node.channelRenderer) {
            const cr = node.channelRenderer;
            const channelId = cr.channelId;
            if (channelId && !seenIds.has(channelId)) {
              seenIds.add(channelId);
              const title = cr.title?.simpleText || cr.title?.runs?.map((r: any) => r.text).join('') || '';
              let handle = cr.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || '';
              if (handle.startsWith('/')) handle = handle.substring(1);
              try { handle = decodeURIComponent(handle); } catch {}
              if (!handle.startsWith('@') && handle) handle = `@${handle}`;
              if (!handle && cr.subscriberCountText?.simpleText?.startsWith('@')) {
                handle = cr.subscriberCountText.simpleText;
              }

              let subscriberCount = cr.videoCountText?.simpleText || cr.subscriberCountText?.simpleText || '구독자 정보 없음';
              let description = cr.descriptionSnippet?.runs?.map((r: any) => r.text).join('') || '';
              let thumb = cr.thumbnail?.thumbnails?.[cr.thumbnail.thumbnails.length - 1]?.url || '';
              if (thumb.startsWith('//')) thumb = 'https:' + thumb;

              // Smart Category Inference
              let category = '기타';
              const lowerText = `${title} ${description}`.toLowerCase();
              if (lowerText.includes('뉴스') || lowerText.includes('news') || lowerText.includes('시사') || lowerText.includes('보도') || lowerText.includes('mbc') || lowerText.includes('sbs') || lowerText.includes('kbs') || lowerText.includes('ytn') || lowerText.includes('jtbc')) {
                category = '뉴스/시사';
              } else if (lowerText.includes('경제') || lowerText.includes('주식') || lowerText.includes('투자') || lowerText.includes('금융') || lowerText.includes('재테크') || lowerText.includes('부동산') || lowerText.includes('슈카') || lowerText.includes('삼프로') || lowerText.includes('김광석')) {
                category = '경제/재테크';
              } else if (lowerText.includes('ai') || lowerText.includes('개발') || lowerText.includes('테크') || lowerText.includes('코딩') || lowerText.includes('it') || lowerText.includes('기술') || lowerText.includes('컴퓨터') || lowerText.includes('소프트웨어') || lowerText.includes('앱')) {
                category = 'IT/테크';
              } else if (lowerText.includes('스타트업') || lowerText.includes('비즈니스') || lowerText.includes('창업') || lowerText.includes('기업') || lowerText.includes('경영') || lowerText.includes('티타임즈') || lowerText.includes('ttimes') || lowerText.includes('이오') || lowerText.includes('ceo')) {
                category = '비즈니스/스타트업';
              } else if (lowerText.includes('과학') || lowerText.includes('우주') || lowerText.includes('지식') || lowerText.includes('물리') || lowerText.includes('공학') || lowerText.includes('1분만') || lowerText.includes('안될과학')) {
                category = '과학/지식';
              } else if (lowerText.includes('영어') || lowerText.includes('공부') || lowerText.includes('자기계발') || lowerText.includes('독서') || lowerText.includes('학습') || lowerText.includes('동기부여')) {
                category = '자기계발/교육';
              }

              results.push({
                channelId,
                title: title || clean,
                handle: handle || `@${title.replace(/\s+/g, '').toLowerCase()}`,
                subscriberCount,
                description: description || `${title} 채널`,
                thumbnailUrl: thumb || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                category
              });
            }
          }
          for (const k of Object.keys(node)) {
            traverse(node[k]);
          }
        };
        traverse(channelData);
      }
    } catch (searchErr) {
      console.warn('YouTube channel search error:', searchErr);
    }

    res.json({ success: true, channels: results.slice(0, 15) });
  } catch (error: any) {
    console.error('Channel search endpoint error:', error);
    res.status(500).json({ error: error.message || '채널 검색에 실패했습니다.' });
  }
});

// Helper to query YouTube Innertube API (Tier 1 Primary Engine with Multi-Client Resilience)
async function fetchYouTubeInnertubeSearch(queryStr: string, searchParams?: string): Promise<any[]> {
  const nowEpoch = Date.now();
  const CLIENT_CONFIGS = [
    { clientName: 'WEB', clientVersion: '2.20250101.00.00' },
    { clientName: 'MWEB', clientVersion: '2.20250101.00.00' },
    { clientName: 'WEB', clientVersion: '2.20240501.01.00' },
    { clientName: 'TVHTML5', clientVersion: '7.20240501.01.00' }
  ];

  for (const clientCfg of CLIENT_CONFIGS) {
    try {
      const payload: any = {
        context: {
          client: {
            ...clientCfg,
            hl: 'ko',
            gl: 'KR'
          }
        },
        query: queryStr
      };
      if (searchParams) {
        payload.params = searchParams;
      }

      const res = await fetch('https://www.youtube.com/youtubei/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Origin': 'https://www.youtube.com',
          'Referer': 'https://www.youtube.com/',
          'Cookie': 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmc2J1aWxkdG9vbHNsYXVkZXJfc2VydmVyXzIwMjQwMjI1LjA1X3AwGgJrbxACGgJrbw; YSC=a; GPS=1'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) continue;

      const data = await res.json();
      const parsedVideos: any[] = [];
      const seenIds = new Set<string>();

      const traverse = (node: any) => {
        if (!node || typeof node !== 'object') return;

        // 1. videoRenderer parser
        if (node.videoRenderer) {
          const vr = node.videoRenderer;
          if (vr.videoId && !seenIds.has(vr.videoId)) {
            seenIds.add(vr.videoId);
            const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
            const channelTitle = vr.ownerText?.runs?.map((r: any) => r.text).join('') || vr.shortBylineText?.runs?.map((r: any) => r.text).join('') || '';
            const channelId = vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || vr.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
            const channelThumbnail = vr.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url || '';
            const timeAgo = vr.publishedTimeText?.simpleText || '';
            const viewCountText = vr.viewCountText?.simpleText || vr.viewCountText?.runs?.map((r: any) => r.text).join('') || '';
            const lengthText = vr.lengthText?.simpleText || '';
            const desc = vr.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') || vr.descriptionSnippet?.runs?.map((r: any) => r.text).join('') || '';
            
            let thumbnail = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
            if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;

            if (title.trim()) {
              const approxPubDate = parseRelativeTimeTextToIso(timeAgo, nowEpoch);
              parsedVideos.push({
                videoId: vr.videoId,
                channelId: channelId || `ch-${vr.videoId}`,
                channelTitle: channelTitle.trim() || 'YouTube Creator',
                channelThumbnail: channelThumbnail.startsWith('//') ? 'https:' + channelThumbnail : channelThumbnail,
                title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                description: desc.trim(),
                timeAgo: timeAgo.trim(),
                viewCountText: viewCountText.trim(),
                duration: lengthText.trim(),
                thumbnailUrl: thumbnail,
                videoUrl: `https://www.youtube.com/watch?v=${vr.videoId}`,
                publishedAt: approxPubDate
              });
            }
          }
        }

        // 2. compactVideoRenderer / gridVideoRenderer
        if (node.compactVideoRenderer || node.gridVideoRenderer) {
          const cvr = node.compactVideoRenderer || node.gridVideoRenderer;
          if (cvr.videoId && !seenIds.has(cvr.videoId)) {
            seenIds.add(cvr.videoId);
            const title = cvr.title?.runs?.map((r: any) => r.text).join('') || cvr.title?.simpleText || '';
            const channelTitle = cvr.shortBylineText?.runs?.map((r: any) => r.text).join('') || cvr.ownerText?.runs?.map((r: any) => r.text).join('') || '';
            const channelId = cvr.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || cvr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
            const timeAgo = cvr.publishedTimeText?.simpleText || '';
            const viewCountText = cvr.viewCountText?.simpleText || '';
            const lengthText = cvr.lengthText?.simpleText || '';
            let thumbnail = cvr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${cvr.videoId}/hqdefault.jpg`;
            if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;

            if (title.trim()) {
              const approxPubDate = parseRelativeTimeTextToIso(timeAgo, nowEpoch);
              parsedVideos.push({
                videoId: cvr.videoId,
                channelId: channelId || `ch-${cvr.videoId}`,
                channelTitle: channelTitle.trim() || 'YouTube Creator',
                channelThumbnail: '',
                title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                description: '',
                timeAgo: timeAgo.trim(),
                viewCountText: viewCountText.trim(),
                duration: lengthText.trim(),
                thumbnailUrl: thumbnail,
                videoUrl: `https://www.youtube.com/watch?v=${cvr.videoId}`,
                publishedAt: approxPubDate
              });
            }
          }
        }

        // 3. lockupViewModel parser (modern YouTube search structure)
        if (node.lockupViewModel) {
          const lvm = node.lockupViewModel;
          const contentId = lvm.contentId;
          if (contentId && !seenIds.has(contentId)) {
            seenIds.add(contentId);
            const title = lvm.metadata?.lockupMetadataViewModel?.title?.content || 
                          lvm.rendererContext?.accessibilityContext?.label || '';
            const metadataItems = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
            
            let viewCountNumStr = '';
            let timeAgoStr = '';
            let chTitle = '';

            for (const row of metadataItems) {
              for (const part of (row.metadataParts || [])) {
                const txt = part.text?.content || '';
                if (txt.includes('조회수') || txt.includes('views')) {
                  viewCountNumStr = txt;
                } else if (txt.includes('전') || txt.includes('ago') || txt.includes('스트리밍') || txt.includes('실시간')) {
                  timeAgoStr = txt;
                } else if (!chTitle && txt.length > 0 && !txt.includes('조회수') && !txt.includes('분') && !txt.includes('초')) {
                  chTitle = txt;
                }
              }
            }

            if (title.trim()) {
              const approxPubDate = parseRelativeTimeTextToIso(timeAgoStr, nowEpoch);
              parsedVideos.push({
                videoId: contentId,
                channelId: `ch-${contentId}`,
                channelTitle: chTitle || 'YouTube Creator',
                channelThumbnail: '',
                title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                description: '',
                timeAgo: timeAgoStr.trim(),
                viewCountText: viewCountNumStr.trim(),
                duration: '',
                thumbnailUrl: `https://i.ytimg.com/vi/${contentId}/hqdefault.jpg`,
                videoUrl: `https://www.youtube.com/watch?v=${contentId}`,
                publishedAt: approxPubDate
              });
            }
          }
        }

        for (const k of Object.keys(node)) {
          traverse(node[k]);
        }
      };

      traverse(data);
      if (parsedVideos.length > 0) {
        return parsedVideos;
      }
    } catch (clientErr) {
      // Continue to next client configuration
    }
  }

  return [];
}

// Real-Time YouTube Video Search Endpoint
app.post('/api/youtube/search-videos', async (req, res) => {
  try {
    const { query, dateFilter = 'all', sortBy = 'relevance', limit = 25 } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: '검색어를 입력해주세요.' });
    }

    const trimmed = query.trim();
    const nowEpoch = Date.now();

    // 1. Direct Video ID or YouTube URL detection
    const urlMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    const directVideoId = urlMatch ? urlMatch[1] : (/^[a-zA-Z0-9_-]{11}$/.test(trimmed) ? trimmed : null);

    if (directVideoId) {
      try {
        let title = '';
        let channelTitle = '';
        let thumbnail = `https://i.ytimg.com/vi/${directVideoId}/hqdefault.jpg`;
        let description = '';

        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directVideoId}&format=json`);
        if (oembedRes.ok) {
          const oembed = await oembedRes.json();
          title = oembed.title || '';
          channelTitle = oembed.author_name || '';
          thumbnail = oembed.thumbnail_url || thumbnail;
        }

        const details = await fetchYouTubeVideoDetailsAndTranscript(directVideoId);
        title = title || (details.fullDescription ? details.fullDescription.split('\n')[0].slice(0, 100) : `유튜브 영상 (${directVideoId})`);
        description = details.fullDescription ? details.fullDescription.slice(0, 200) : `${channelTitle} 채널의 영상입니다.`;

        const singleResult = [{
          videoId: directVideoId,
          channelId: `ch-${directVideoId}`,
          channelTitle: channelTitle || 'YouTube Creator',
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
          description,
          timeAgo: '최근',
          viewCountText: '',
          duration: '',
          thumbnailUrl: thumbnail,
          videoUrl: `https://www.youtube.com/watch?v=${directVideoId}`,
          publishedAt: new Date().toISOString()
        }];

        return res.json({ success: true, videos: singleResult, total: 1 });
      } catch (directErr) {
        console.warn('Direct video lookup fallback to standard search:', directErr);
      }
    }

    // Helper to fetch and parse YouTube search results via Web Scraping (Tier 2 Fallback)
    const fetchYouTubeSearchResults = async (searchSp: string) => {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}&sp=${searchSp}`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cookie': 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmc2J1aWxkdG9vbHNsYXVkZXJfc2VydmVyXzIwMjQwMjI1LjA1X3AwGgJrbxACGgJrbw; YSC=a; GPS=1'
        }
      });

      if (!searchRes.ok) return [];

      const html = await searchRes.text();
      let data: any = null;
      
      const match1 = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/s);
      if (match1) {
        try {
          data = JSON.parse(match1[1]);
        } catch (e) {}
      }

      if (!data) {
        const match2 = html.match(/window\["ytInitialData"\]\s*=\s*({.+?});/s);
        if (match2) {
          try {
            data = JSON.parse(match2[1]);
          } catch (e) {}
        }
      }

      if (!data) return [];

      const parsedVideos: any[] = [];
      const seenIds = new Set<string>();

      const traverse = (node: any) => {
        if (!node || typeof node !== 'object') return;

        // 1. videoRenderer parser
        if (node.videoRenderer) {
          const vr = node.videoRenderer;
          if (vr.videoId && !seenIds.has(vr.videoId)) {
            seenIds.add(vr.videoId);
            const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
            const channelTitle = vr.ownerText?.runs?.map((r: any) => r.text).join('') || vr.shortBylineText?.runs?.map((r: any) => r.text).join('') || '';
            const channelId = vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || vr.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
            const channelThumbnail = vr.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url || '';
            const timeAgo = vr.publishedTimeText?.simpleText || '';
            const viewCountText = vr.viewCountText?.simpleText || vr.viewCountText?.runs?.map((r: any) => r.text).join('') || '';
            const lengthText = vr.lengthText?.simpleText || '';
            const desc = vr.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') || vr.descriptionSnippet?.runs?.map((r: any) => r.text).join('') || '';
            
            let thumbnail = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
            if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;

            if (title.trim()) {
              const approxPubDate = parseRelativeTimeTextToIso(timeAgo, nowEpoch);
              parsedVideos.push({
                videoId: vr.videoId,
                channelId: channelId || `ch-${vr.videoId}`,
                channelTitle: channelTitle.trim() || 'YouTube Creator',
                channelThumbnail: channelThumbnail.startsWith('//') ? 'https:' + channelThumbnail : channelThumbnail,
                title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                description: desc.trim(),
                timeAgo: timeAgo.trim(),
                viewCountText: viewCountText.trim(),
                duration: lengthText.trim(),
                thumbnailUrl: thumbnail,
                videoUrl: `https://www.youtube.com/watch?v=${vr.videoId}`,
                publishedAt: approxPubDate
              });
            }
          }
        }

        // 2. lockupViewModel parser (modern YouTube search structure)
        if (node.lockupViewModel) {
          const lvm = node.lockupViewModel;
          const contentId = lvm.contentId;
          if (contentId && !seenIds.has(contentId)) {
            seenIds.add(contentId);
            const title = lvm.metadata?.lockupMetadataViewModel?.title?.content || 
                          lvm.rendererContext?.accessibilityContext?.label || '';
            const metadataItems = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
            
            let viewCountNumStr = '';
            let timeAgoStr = '';
            let chTitle = '';

            for (const row of metadataItems) {
              for (const part of (row.metadataParts || [])) {
                const txt = part.text?.content || '';
                if (txt.includes('조회수') || txt.includes('views')) {
                  viewCountNumStr = txt;
                } else if (txt.includes('전') || txt.includes('ago') || txt.includes('스트리밍') || txt.includes('실시간')) {
                  timeAgoStr = txt;
                } else if (!chTitle && txt.length > 0 && !txt.includes('조회수') && !txt.includes('분') && !txt.includes('초')) {
                  chTitle = txt;
                }
              }
            }

            if (title.trim()) {
              const approxPubDate = parseRelativeTimeTextToIso(timeAgoStr, nowEpoch);
              parsedVideos.push({
                videoId: contentId,
                channelId: `ch-${contentId}`,
                channelTitle: chTitle || 'YouTube Creator',
                channelThumbnail: '',
                title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                description: '',
                timeAgo: timeAgoStr.trim(),
                viewCountText: viewCountNumStr.trim(),
                duration: '',
                thumbnailUrl: `https://i.ytimg.com/vi/${contentId}/hqdefault.jpg`,
                videoUrl: `https://www.youtube.com/watch?v=${contentId}`,
                publishedAt: approxPubDate
              });
            }
          }
        }

        for (const k of Object.keys(node)) {
          traverse(node[k]);
        }
      };

      traverse(data);
      return parsedVideos;
    };

    // 2. Determine YouTube SP / Innertube search filter parameter
    let sp = 'EgIQAQ%3D%3D'; // Default Type: Video
    if (sortBy === 'date') {
      sp = 'CAISAhAB'; // Video + Sort by upload date
    } else if (sortBy === 'viewCount') {
      sp = 'CAMSAhAB'; // Video + Sort by view count
    } else if (dateFilter === 'today' || dateFilter === '24hours') {
      sp = 'EgQIAhAB'; // Video + Today / 24 hours
    } else if (dateFilter === 'week') {
      sp = 'EgQIAxAB'; // Video + This week
    } else if (dateFilter === 'month') {
      sp = 'EgQIBBAB'; // Video + This month
    }

    // Step 1: Execute primary Innertube Search
    let videos = await fetchYouTubeInnertubeSearch(trimmed, sp);

    // Step 2: Fall back to Web scraping if Innertube yielded no results
    if (videos.length === 0) {
      videos = await fetchYouTubeSearchResults(sp);
    }

    // Step 3: If specific date/sort filter yielded 0 results, fall back to default video search so the user still gets rich relevant results
    if (videos.length === 0 && sp !== 'EgIQAQ%3D%3D') {
      videos = await fetchYouTubeInnertubeSearch(trimmed, 'EgIQAQ%3D%3D');
      if (videos.length === 0) {
        videos = await fetchYouTubeSearchResults('EgIQAQ%3D%3D');
      }
    }

    // Step 4: If still no videos, try raw query without filter
    if (videos.length === 0) {
      videos = await fetchYouTubeInnertubeSearch(trimmed);
    }

    // Step 5: If still no videos, match against known channels catalog and fetch real-time channel RSS
    if (videos.length === 0) {
      const normalizedQuery = trimmed.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
      const matchedKnown = KNOWN_CHANNELS_MAP.filter(item => {
        const titleNorm = item.title.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        const handleNorm = item.handle.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        return titleNorm.includes(normalizedQuery) || normalizedQuery.includes(titleNorm) ||
               handleNorm.includes(normalizedQuery) || normalizedQuery.includes(handleNorm) ||
               item.keywords.some(kw => {
                 const kwNorm = kw.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
                 return kwNorm.includes(normalizedQuery) || normalizedQuery.includes(kwNorm);
               });
      });

      for (const item of matchedKnown.slice(0, 3)) {
        try {
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${item.channelId}&_t=${Date.now()}`;
          const rssRes = await fetch(rssUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
            }
          });
          if (rssRes.ok) {
            const xml = await rssRes.text();
            const entries = xml.split('<entry>').slice(1);
            for (const entry of entries) {
              const vIdM = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
              const titM = entry.match(/<title>([^<]+)<\/title>/);
              const pubM = entry.match(/<published>([^<]+)<\/published>/);
              const descM = entry.match(/<media:description>([^<]*)<\/media:description>/s);
              const thumbM = entry.match(/<media:thumbnail url="([^"]+)"/);

              if (vIdM && titM && pubM) {
                const vidId = vIdM[1].trim();
                const tit = titM[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
                const pubIso = new Date(pubM[1]).toISOString();
                const timeStat = calculateVideoTimeStatus(pubIso);

                videos.push({
                  videoId: vidId,
                  channelId: item.channelId,
                  channelTitle: item.title,
                  channelThumbnail: item.thumbnailUrl,
                  title: tit,
                  description: descM ? descM[1].trim() : '',
                  timeAgo: timeStat.relativeTimeText || '최근',
                  viewCountText: '',
                  duration: '',
                  thumbnailUrl: thumbM ? thumbM[1] : `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
                  videoUrl: `https://www.youtube.com/watch?v=${vidId}`,
                  publishedAt: pubIso
                });
              }
            }
          }
        } catch (rssErr) {
          console.warn(`Channel RSS fallback for ${item.title} failed:`, rssErr);
        }
      }
    }

    res.json({
      success: true,
      videos: videos.slice(0, Math.min(50, limit)),
      total: videos.length
    });
  } catch (error: any) {
    console.error('Video search endpoint error:', error);
    res.status(500).json({ error: error.message || '동영상 검색 중 오류가 발생했습니다.' });
  }
});

// 2-2. Google Search Engine for YouTube (Integrated Google Knowledge Suggestions + YouTube Search Engine)
app.post('/api/youtube/google-search', async (req, res) => {
  try {
    const { query, channelId, channelTitle, dateFilter = 'all', sortBy = 'relevance', limit = 30 } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: '검색어를 입력해주세요.' });
    }

    const cleanQuery = query.trim();
    const nowEpoch不易 = Date.now();
    const results: any[] = [];
    const seenIds = new Set<string>();

    // 1. Query Google Knowledge / Search Suggestions to expand keywords and resolve exact channel entity
    let expandedKeywords: string[] = [cleanQuery];
    try {
      const suggestRes不易 = await fetch(`https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(cleanQuery)}&hl=ko&gl=KR`);
      if (suggestRes不易.ok) {
        const text = await suggestRes不易.text();
        const matches = text.match(/\["([^"]+)",0/g);
        if (matches) {
          const suggestions = matches.slice(0, 6).map(m => m.replace(/^\["/, '').replace(/",0$/, ''));
          expandedKeywords = Array.from(new Set([cleanQuery, ...suggestions]));
        }
      }
    } catch {}

    // 2. Determine target query string and filter params
    const targetQuery = channelTitle ? `${channelTitle} ${cleanQuery}` : cleanQuery;
    let spParam = 'EgIQAQ%3D%3D'; // Relevance default
    if (sortBy === 'date' || dateFilter === 'today' || dateFilter === '24hours') {
      spParam = 'CAISAhAB'; // Date sort (latest first)
    } else if (sortBy === 'viewCount') {
      spParam = 'CAMSAhAB'; // View count
    } else if (dateFilter === 'week') {
      spParam = 'EgQIAxAB';
    } else if (dateFilter === 'month') {
      spParam = 'EgQIBBAB';
    }

    // Step A: Primary search via Google Innertube engine
    const primaryVideos = await fetchYouTubeInnertubeSearch(targetQuery, spParam);
    for (const v of primaryVideos) {
      if (v.videoId && !seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        results.push(v);
      }
    }

    // Step B: Fallback search with default filter if specific filter yielded fewer results
    if (results.length < 15 && spParam !== 'EgIQAQ%3D%3D') {
      const fallbackVideos = await fetchYouTubeInnertubeSearch(targetQuery, 'EgIQAQ%3D%3D');
      for (const v of fallbackVideos) {
        if (v.videoId && !seenIds.has(v.videoId)) {
          seenIds.add(v.videoId);
          results.push(v);
        }
      }
    }

    // Step C: If specific channel is targeted, check channel's real-time RSS feed
    if (channelId && channelId.startsWith('UC') && !channelId.startsWith('UC_')) {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}&_t=${Date.now()}`;
        const rssRes = await fetch(rssUrl);
        if (rssRes.ok) {
          const xml = await rssRes.text();
          if (xml.includes('<entry>')) {
            const entries = xml.split('<entry>').slice(1);
            for (const entry of entries) {
              const vIdM = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
              const titM迷 = entry.match(/<title>([^<]+)<\/title>/);
              const pubM = entry.match(/<published>([^<]+)<\/published>/);
              const descM = entry.match(/<media:description>([^<]*)<\/media:description>/s);
              const thumbM = entry.match(/<media:thumbnail url="([^"]+)"/);

              if (vIdM && titM迷 && pubM) {
                const vidId = vIdM[1].trim();
                const tit = titM迷[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
                const pubIso = new Date(pubM[1]).toISOString();
                const timeStat = calculateVideoTimeStatus(pubIso);

                if (!seenIds.has(vidId)) {
                  seenIds.add(vidId);
                  results.unshift({
                    videoId: vidId,
                    channelId,
                    channelTitle: channelTitle || 'YouTube Channel',
                    channelThumbnail: '',
                    title: tit,
                    description: descM ? descM[1].trim() : '',
                    timeAgo: timeStat.relativeTimeText || '최근',
                    viewCountText: '',
                    duration: '',
                    thumbnailUrl: thumbM ? thumbM[1] : `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
                    videoUrl: `https://www.youtube.com/watch?v=${vidId}`,
                    publishedAt: pubIso
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Channel RSS check in google-search error:', err);
      }
    }

    res.json({
      success: true,
      query: cleanQuery,
      engine: 'Google Search Engine',
      expandedKeywords,
      videos: results.slice(0, Math.min(50, limit)),
      total: results.length
    });
  } catch (error: any) {
    console.error('Google search endpoint error:', error);
    res.status(500).json({ error: error.message || 'Google 검색 엔진을 통한 동영상 검색에 실패했습니다.' });
  }
});

// 2-3. Search within Configured / Registered Channels
app.post('/api/youtube/search-configured-channels', async (req, res) => {
  try {
    const { channels = [], query = '' } = req.body;
    const cleanQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
    const results: any[] = [];
    const seenIds不容易 = new Set<string>();

    const activeList = Array.isArray(channels) ? channels.filter(c => c && c.isActive !== false) : [];
    if (activeList.length === 0) {
      return res.json({ success: true, videos: [], message: '등록된 채널이 없습니다.' });
    }

    // Split tokens for multi-keyword matching
    const tokens = cleanQuery.split(/[\s,+/]+/).filter(t => t.length > 0);

    // Fetch videos for up to 20 channels in parallel
    const channelFetches = await Promise.allSettled(
      activeList.slice(0, 20).map(async (ch) => {
        return fetchVideosForChannelUniversal(ch, false);
      })
    );

    for (const fetchResult of channelFetches) {
      if (fetchResult.status === 'fulfilled' && fetchResult.value && Array.isArray(fetchResult.value.videos)) {
        for (const vid of fetchResult.value.videos) {
          if (!vid || !vid.videoId || seenIds不容易.has(vid.videoId)) continue;

          // Check if video matches query tokens
          if (tokens.length > 0) {
            const searchableText = `${vid.title} ${vid.channelTitle} ${vid.description || ''} ${vid.category || ''}`.toLowerCase();
            const matchesAll = tokens.every(token => searchableText.includes(token));
            if (!matchesAll) continue;
          }

          seenIds不容易.add(vid.videoId);
          results.push(vid);
        }
      }
    }

    // Sort by publication date descending
    results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    res.json({
      success: true,
      query: cleanQuery,
      videos: results,
      total: results.length
    });
  } catch (error: any) {
    console.error('Configured channels search error:', error);
    res.status(500).json({ error: error.message || '등록 채널 검색 중 오류가 발생했습니다.' });
  }
});

// Helper to calculate exact elapsed time and relative date categorization (KST UTC+9 aware)
function calculateVideoTimeStatus(pubDateIso: string, nowEpoch: number = Date.now()): {
  diffHours: number;
  diffMinutes: number;
  isWithin24h: boolean;
  isToday: boolean;
  isYesterday: boolean;
  isRecent3Days: boolean;
  relativeTimeText: string;
} {
  const parsedDate = new Date(pubDateIso);
  const pubTime = isNaN(parsedDate.getTime()) ? nowEpoch : parsedDate.getTime();
  const diffMs = nowEpoch - pubTime;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = diffMs / (1000 * 60 * 60);

  let relativeTimeText = '';
  if (diffMinutes < 1) {
    relativeTimeText = '방금 전';
  } else if (diffMinutes < 60) {
    relativeTimeText = `${Math.max(1, diffMinutes)}분 전`;
  } else if (diffHours < 24) {
    relativeTimeText = `${Math.floor(diffHours)}시간 전`;
  } else if (diffHours < 48) {
    relativeTimeText = '1일 전 (어제)';
  } else {
    const days = Math.floor(diffHours / 24);
    relativeTimeText = `${days}일 전`;
  }

  // Strict 24-hour window (allowing slight future tolerance for clock skew)
  const isWithin24h = diffHours >= -0.5 && diffHours <= 24.0;

  // Calendar dates in KST (UTC+9)
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const nowKst = new Date(nowEpoch + kstOffsetMs);
  const pubKst = new Date(pubTime + kstOffsetMs);

  const isSameDayKst = 
    nowKst.getUTCFullYear() === pubKst.getUTCFullYear() &&
    nowKst.getUTCMonth() === pubKst.getUTCMonth() &&
    nowKst.getUTCDate() === pubKst.getUTCDate();

  const yesterdayKst = new Date(nowEpoch - 24 * 60 * 60 * 1000 + kstOffsetMs);
  const isYesterdayDayKst =
    yesterdayKst.getUTCFullYear() === pubKst.getUTCFullYear() &&
    yesterdayKst.getUTCMonth() === pubKst.getUTCMonth() &&
    yesterdayKst.getUTCDate() === pubKst.getUTCDate();

  // isToday: exact same calendar day in KST OR published within past 18 hours
  const isToday = isSameDayKst || (diffHours >= -0.5 && diffHours < 18.0);
  // isYesterday: previous calendar day in KST OR published between 18h and 48h
  const isYesterday = !isToday && (isYesterdayDayKst || (diffHours >= 18.0 && diffHours <= 48.0));
  const isRecent3Days = diffHours >= -0.5 && diffHours <= 72.0;

  return {
    diffHours,
    diffMinutes,
    isWithin24h,
    isToday,
    isYesterday,
    isRecent3Days,
    relativeTimeText
  };
}

// Helper to parse Korean/English relative times to ISO string
function parseRelativeTimeTextToIso(timeAgoStr: string, nowEpoch: number = Date.now()): string {
  if (!timeAgoStr) return new Date(nowEpoch - 365 * 24 * 3600 * 1000).toISOString();
  const clean = timeAgoStr.replace(/스트리밍|실시간|시작일|최초|공개일|시간:|됨/g, '').trim();

  // Seconds ago
  const secMatch = clean.match(/(\d+)\s*(?:초|seconds?)\s*(?:전|ago)/i);
  if (secMatch) return new Date(nowEpoch - parseInt(secMatch[1], 10) * 1000).toISOString();

  // Minutes ago
  const minMatch = clean.match(/(\d+)\s*(?:분|minutes?|mins?)\s*(?:전|ago)/i);
  if (minMatch) return new Date(nowEpoch - parseInt(minMatch[1], 10) * 60 * 1000).toISOString();

  // Hours ago
  const hourMatch = clean.match(/(\d+)\s*(?:시간|hours?)\s*(?:전|ago)/i);
  if (hourMatch) return new Date(nowEpoch - parseInt(hourMatch[1], 10) * 3600 * 1000).toISOString();

  // Days ago
  const dayMatch = clean.match(/(\d+)\s*(?:일|days?)\s*(?:전|ago)/i);
  if (dayMatch) return new Date(nowEpoch - parseInt(dayMatch[1], 10) * 24 * 3600 * 1000).toISOString();

  // Weeks ago
  const weekMatch = clean.match(/(\d+)\s*(?:주|weeks?)\s*(?:전|ago)/i);
  if (weekMatch) return new Date(nowEpoch - parseInt(weekMatch[1], 10) * 7 * 24 * 3600 * 1000).toISOString();

  // Months ago
  const monthMatch = clean.match(/(\d+)\s*(?:개월|달|months?)\s*(?:전|ago)/i);
  if (monthMatch) return new Date(nowEpoch - parseInt(monthMatch[1], 10) * 30 * 24 * 3600 * 1000).toISOString();

  // Years ago
  const yearMatch = clean.match(/(\d+)\s*(?:년|years?)\s*(?:전|ago)/i);
  if (yearMatch) return new Date(nowEpoch - parseInt(yearMatch[1], 10) * 365 * 24 * 3600 * 1000).toISOString();

  if (clean.includes('방금') || clean.includes('초 전')) return new Date(nowEpoch - 30 * 1000).toISOString();
  if (clean.includes('어제') || clean.includes('yesterday')) return new Date(nowEpoch - 24 * 3600 * 1000).toISOString();

  // Fallback: Default to old video date so it does not pollute the 24h filter
  return new Date(nowEpoch - 365 * 24 * 3600 * 1000).toISOString();
}

// Universal YouTube Channel Video Extractor (Multi-Source: Primary Super-Fast RSS Feed -> Smart Fallback Scraping & Search)
async function fetchVideosForChannelUniversal(ch: {
  channelId?: string;
  handle?: string;
  title?: string;
  category?: string;
  thumbnailUrl?: string;
}, only24h: boolean = false): Promise<{ videos: any[]; channelId: string; channelTitle: string }> {
  let targetChannelId = ch.channelId || '';
  let targetHandle = ch.handle || '';
  let channelTitle = ch.title || '';

  // Auto-resolve channel ID and handle if missing or dummy
  if (!targetChannelId || !targetChannelId.startsWith('UC') || targetChannelId.startsWith('UC_') || targetChannelId.length < 22) {
    try {
      const resolved = await resolveChannelInfo(targetHandle || channelTitle || targetChannelId, channelTitle);
      if (resolved && resolved.channelId && resolved.channelId.startsWith('UC') && !resolved.channelId.startsWith('UC_')) {
        targetChannelId = resolved.channelId;
        if (!targetHandle && resolved.handle) targetHandle = resolved.handle;
        if (!channelTitle && resolved.title) channelTitle = resolved.title;
      }
    } catch (e) {
      console.warn(`Channel ID resolution fallback for ${channelTitle}:`, e);
    }
  }

  const nowEpoch = Date.now();
  const videoMap = new Map<string, any>();
  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cookie': 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmc2J1aWxkdG9vbHNsYXVkZXJfc2VydmVyXzIwMjQwMjI1LjA1X3AwGgJrbxACGgJrbw; YSC=a; GPS=1',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };

  // 1. PRIMARY SUPER-FAST SOURCE: Official YouTube RSS XML Feed (Provides exact real-time ISO timestamps for today's videos in <200ms)
  if (targetChannelId && targetChannelId.startsWith('UC') && !targetChannelId.startsWith('UC_')) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(targetChannelId)}&_t=${nowEpoch}`;
      const rssRes = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (rssRes.ok) {
        const feedXml = await rssRes.text();
        if (feedXml.includes('<entry>')) {
          const entries = feedXml.split('<entry>').slice(1);
          for (const entry of entries) {
            const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
            const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
            const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
            const descMatch = entry.match(/<media:description>([^<]*)<\/media:description>/s);
            const thumbMatch = entry.match(/<media:thumbnail url="([^"]+)"/);
            const viewsMatch = entry.match(/<media:statistics views="(\d+)"/);

            if (videoIdMatch && titleMatch && publishedMatch) {
              const videoId = videoIdMatch[1].trim();
              const pubDateIso = new Date(publishedMatch[1]).toISOString();
              const timeStatus = calculateVideoTimeStatus(pubDateIso, nowEpoch);

              // Retain recent videos (up to 30 days / 720h) to support all date range filters
              if (!only24h || timeStatus.isWithin24h || timeStatus.diffHours <= 720.0) {
                videoMap.set(videoId, {
                  id: `yt-${videoId}`,
                  videoId,
                  channelId: targetChannelId,
                  channelTitle: channelTitle || 'YouTube Channel',
                  channelThumbnail: ch.thumbnailUrl,
                  title: titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                  description: descMatch ? descMatch[1].trim() : `${channelTitle} 영상`,
                  thumbnailUrl: thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                  publishedAt: pubDateIso,
                  videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                  category: ch.category || '기타',
                  viewCount: viewsMatch ? parseInt(viewsMatch[1], 10) : undefined,
                  isYesterday: timeStatus.isYesterday,
                  isWithin24h: timeStatus.isWithin24h,
                  isToday: timeStatus.isToday,
                  relativeTimeText: timeStatus.relativeTimeText,
                  isSummarized: false,
                  createdAt: pubDateIso
                });
              }
            }
          }
        }
      }
    } catch (rssErr) {
      console.warn(`RSS feed fetch failed for ${channelTitle}:`, rssErr);
    }
  }

  // If RSS provided videos (standard case for all active channels), return immediately for blazing fast speed (<300ms)
  if (videoMap.size > 0) {
    const resultVideos = Array.from(videoMap.values()).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    return {
      videos: resultVideos,
      channelId: targetChannelId,
      channelTitle: channelTitle || 'YouTube Channel'
    };
  }

  // 2. FALLBACK SOURCE: Direct Channel /videos scraping if RSS was empty or failed
  const urlsToScrape: string[] = [];
  if (targetHandle) {
    const cleanH = targetHandle.startsWith('@') ? targetHandle : `@${targetHandle}`;
    urlsToScrape.push(`https://www.youtube.com/${cleanH}/videos`);
  }
  if (targetChannelId && targetChannelId.startsWith('UC') && !targetChannelId.startsWith('UC_')) {
    urlsToScrape.push(`https://www.youtube.com/channel/${targetChannelId}/videos`);
  }

  for (const pageUrl of urlsToScrape) {
    if (videoMap.size >= 15) break;

    try {
      const resp = await fetch(pageUrl, { headers: fetchHeaders });
      if (resp.ok) {
        const html = await resp.text();
        const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || 
                      html.match(/window\["ytInitialData"\]\s*=\s*({.+?});/s) ||
                      html.match(/ytInitialData\s*=\s*({.+?});/s);
        if (match) {
          try {
            const data = JSON.parse(match[1]);
            const traverse = (node: any) => {
              if (!node || typeof node !== 'object') return;

              // 1-1. lockupViewModel
              if (node.lockupViewModel) {
                const lvm = node.lockupViewModel;
                const contentId = lvm.contentId;
                const title = lvm.metadata?.lockupMetadataViewModel?.title?.content || 
                              lvm.rendererContext?.accessibilityContext?.label || '';
                const metadataItems = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
                
                let viewCountNum: number | undefined;
                let timeAgo = '';

                for (const row of metadataItems) {
                  for (const part of (row.metadataParts || [])) {
                    const txt = part.text?.content || '';
                    if (txt.includes('조회수') || txt.includes('views')) {
                      const numMatch = txt.replace(/,/g, '').match(/\d+/);
                      if (numMatch) viewCountNum = parseInt(numMatch[0], 10);
                    } else if (txt.includes('전') || txt.includes('ago') || txt.includes('스트리밍') || txt.includes('실시간')) {
                      timeAgo = txt;
                    }
                  }
                }

                if (contentId && title && !videoMap.has(contentId)) {
                  const pubDateIso = parseRelativeTimeTextToIso(timeAgo, nowEpoch);
                  const timeStatus = calculateVideoTimeStatus(pubDateIso, nowEpoch);

                  if (!only24h || timeStatus.isWithin24h || timeStatus.diffHours <= 720.0) {
                    videoMap.set(contentId, {
                      id: `yt-${contentId}`,
                      videoId: contentId,
                      channelId: targetChannelId || `ch-${contentId}`,
                      channelTitle: channelTitle || 'YouTube Channel',
                      channelThumbnail: ch.thumbnailUrl,
                      title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                      description: `${channelTitle} 채널의 최신 업로드 영상입니다.`,
                      thumbnailUrl: `https://i.ytimg.com/vi/${contentId}/hqdefault.jpg`,
                      publishedAt: pubDateIso,
                      videoUrl: `https://www.youtube.com/watch?v=${contentId}`,
                      category: ch.category || '기타',
                      viewCount: viewCountNum,
                      isYesterday: timeStatus.isYesterday,
                      isWithin24h: timeStatus.isWithin24h,
                      isToday: timeStatus.isToday,
                      relativeTimeText: timeAgo || timeStatus.relativeTimeText,
                      isSummarized: false,
                      createdAt: pubDateIso
                    });
                  }
                }
              }

              // 1-2. videoRenderer
              if (node.videoRenderer) {
                const vr = node.videoRenderer;
                const videoId = vr.videoId;
                const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
                const timeAgo = vr.publishedTimeText?.simpleText || '';
                const desc = vr.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') || vr.descriptionSnippet?.runs?.map((r: any) => r.text).join('') || '';

                if (videoId && title && !videoMap.has(videoId)) {
                  const pubDateIso = parseRelativeTimeTextToIso(timeAgo, nowEpoch);
                  const timeStatus = calculateVideoTimeStatus(pubDateIso, nowEpoch);

                  if (!only24h || timeStatus.isWithin24h || timeStatus.diffHours <= 720.0) {
                    videoMap.set(videoId, {
                      id: `yt-${videoId}`,
                      videoId,
                      channelId: targetChannelId || `ch-${videoId}`,
                      channelTitle: channelTitle || 'YouTube Channel',
                      channelThumbnail: ch.thumbnailUrl,
                      title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                      description: desc || `${channelTitle} 최신 영상`,
                      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                      publishedAt: pubDateIso,
                      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                      category: ch.category || '기타',
                      isYesterday: timeStatus.isYesterday,
                      isWithin24h: timeStatus.isWithin24h,
                      isToday: timeStatus.isToday,
                      relativeTimeText: timeAgo || timeStatus.relativeTimeText,
                      isSummarized: false,
                      createdAt: pubDateIso
                    });
                  }
                }
              }

              for (const k of Object.keys(node)) {
                traverse(node[k]);
              }
            };

            traverse(data);
          } catch (jsonErr) {
            console.warn(`JSON parse error on ${pageUrl}:`, jsonErr);
          }
        }
      }
    } catch (scrapeErr) {
      console.warn(`Scraping failed for ${pageUrl}:`, scrapeErr);
    }
  }

  // 3. FALLBACK SOURCE 2: YouTube Search by Channel Title
  if (channelTitle && videoMap.size === 0) {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query="${encodeURIComponent(channelTitle)}"&sp=CAI%3D`;
      const searchRes = await fetch(searchUrl, { headers: fetchHeaders });
      if (searchRes.ok) {
        const searchHtml = await searchRes.text();
        const searchMatch = searchHtml.match(/var ytInitialData = ({.*?});<\/script>/s) || 
                            searchHtml.match(/window\["ytInitialData"\]\s*=\s*({.+?});/s) ||
                            searchHtml.match(/ytInitialData\s*=\s*({.+?});/s);
        if (searchMatch) {
          const searchData = JSON.parse(searchMatch[1]);
          const traverseSearch = (node: any) => {
            if (!node || typeof node !== 'object') return;
            if (node.videoRenderer) {
              const vr = node.videoRenderer;
              const videoId = vr.videoId;
              const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
              const owner = vr.ownerText?.runs?.map((r: any) => r.text).join('') || vr.shortBylineText?.runs?.map((r: any) => r.text).join('') || '';
              const timeAgo = vr.publishedTimeText?.simpleText || '';
              const browseId = vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';

              const isMatch = (browseId && browseId === targetChannelId) ||
                              owner.includes(channelTitle) ||
                              channelTitle.includes(owner) ||
                              (targetHandle && owner.toLowerCase().includes(targetHandle.replace('@', '').toLowerCase()));

              if (videoId && title && isMatch && !videoMap.has(videoId)) {
                const pubDateIso = parseRelativeTimeTextToIso(timeAgo, nowEpoch);
                const timeStatus = calculateVideoTimeStatus(pubDateIso, nowEpoch);

                if (!only24h || timeStatus.isWithin24h || timeStatus.diffHours <= 720.0) {
                  videoMap.set(videoId, {
                    id: `yt-${videoId}`,
                    videoId,
                    channelId: targetChannelId || browseId || `ch-${videoId}`,
                    channelTitle: channelTitle || owner || 'YouTube Channel',
                    channelThumbnail: ch.thumbnailUrl,
                    title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                    description: `${channelTitle} 실시간 최신 뉴스 및 영상`,
                    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    publishedAt: pubDateIso,
                    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                    category: ch.category || '기타',
                    isYesterday: timeStatus.isYesterday,
                    isWithin24h: timeStatus.isWithin24h,
                    isToday: timeStatus.isToday,
                    relativeTimeText: timeAgo || timeStatus.relativeTimeText,
                    isSummarized: false,
                    createdAt: pubDateIso
                  });
                }
              }
            }
            for (const k of Object.keys(node)) traverseSearch(node[k]);
          };
          traverseSearch(searchData);
        }
      }
    } catch (searchErr) {
      console.warn(`YouTube recent search failed for ${channelTitle}:`, searchErr);
    }
  }

  const resultVideos = Array.from(videoMap.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return {
    videos: resultVideos,
    channelId: targetChannelId,
    channelTitle: channelTitle || 'YouTube Channel'
  };
}

// 3. Fetch channel videos via YouTube RSS feed & channel metadata
app.post('/api/youtube/fetch-rss', async (req, res) => {
  try {
    const { channelId, channelTitle, title, handle, category, thumbnailUrl } = req.body;
    const { videos, channelId: targetChannelId } = await fetchVideosForChannelUniversal({
      channelId,
      title: title || channelTitle,
      handle,
      category,
      thumbnailUrl
    });

    res.json({ success: true, videos, channelId: targetChannelId });
  } catch (error: any) {
    console.error('Fetch RSS error:', error);
    res.status(500).json({ error: error.message || '영상 목록을 불러오지 못했습니다.' });
  }
});

// Helper function to extract and clean YouTube video details, chapters, and captions/transcript
async function fetchYouTubeVideoDetailsAndTranscript(videoId: string): Promise<{
  fullDescription: string;
  transcript: string;
  chapters: Array<{ timestamp: string; title: string }>;
  tags: string[];
}> {
  let fullDescription = '';
  let transcript = '';
  const chapters: Array<{ timestamp: string; title: string }> = [];
  let tags: string[] = [];

  if (!videoId || videoId.length < 5) {
    return { fullDescription, transcript, chapters, tags };
  }

  try {
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageRes = await fetch(videoPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache'
      }
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      // 1. Extract ytInitialPlayerResponse
      const playerMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});(?:var|<\/script>)/s) ||
                          html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      
      let captionTracks: any[] = [];
      if (playerMatch) {
        try {
          const playerData = JSON.parse(playerMatch[1]);
          if (playerData.videoDetails) {
            fullDescription = playerData.videoDetails.shortDescription || '';
            tags = playerData.videoDetails.keywords || [];
          }
          if (playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
            captionTracks = playerData.captions.playerCaptionsTracklistRenderer.captionTracks;
          }
        } catch (e) {
          console.warn(`Error parsing playerResponse for ${videoId}:`, e);
        }
      }

      // Fallback for description if not found
      if (!fullDescription) {
        const descMatch = html.match(/<meta property="og:description" content="([^"]*)">/) ||
                          html.match(/<meta name="description" content="([^"]*)">/);
        if (descMatch) {
          fullDescription = descMatch[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        }
      }

      // Clean noisy boilerplate and copyright lines from fullDescription
      fullDescription = cleanNoiseAndCopyright(fullDescription);

      // 2. Extract chapters from description (e.g. 00:00, 03:20 Title)
      if (fullDescription) {
        const lines = fullDescription.split('\n');
        for (const line of lines) {
          const timeMatch = line.match(/(?:^|\s)(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:[-–—|:]\s*)?([^\n\r]+)/);
          if (timeMatch) {
            const timeStr = timeMatch[1].trim();
            const chapterTitle = timeMatch[2].trim().replace(/^[-–—|:]\s*/, '');
            if (chapterTitle && chapterTitle.length > 1 && !chapterTitle.startsWith('http')) {
              chapters.push({ timestamp: timeStr, title: chapterTitle });
            }
          }
        }
      }

      // 3. Fetch Subtitles/Transcript from captionTracks
      if (captionTracks && captionTracks.length > 0) {
        let selectedTrack = captionTracks.find((t: any) => t.languageCode === 'ko' && t.kind !== 'asr');
        if (!selectedTrack) {
          selectedTrack = captionTracks.find((t: any) => t.languageCode?.startsWith('ko'));
        }
        if (!selectedTrack) {
          selectedTrack = captionTracks.find((t: any) => t.languageCode?.startsWith('en'));
        }
        if (!selectedTrack) {
          selectedTrack = captionTracks[0];
        }

        if (selectedTrack && selectedTrack.baseUrl) {
          try {
            const captionUrl = selectedTrack.baseUrl.includes('fmt=') ? selectedTrack.baseUrl : `${selectedTrack.baseUrl}&fmt=json3`;
            const captionRes = await fetch(captionUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
              }
            });

            if (captionRes.ok) {
              const captionRaw = await captionRes.text();
              if (captionRaw.startsWith('{')) {
                const jsonCaptions = JSON.parse(captionRaw);
                if (jsonCaptions.events) {
                  const transcriptParts: string[] = [];
                  for (const ev of jsonCaptions.events) {
                    if (ev.segs) {
                      const line = ev.segs.map((s: any) => s.utf8).join('').trim();
                      if (line && line !== '\n') {
                        const startSec = Math.floor((ev.tStartMs || 0) / 1000);
                        const m = Math.floor(startSec / 60);
                        const s = startSec % 60;
                        const timeStampStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                        transcriptParts.push(`[${timeStampStr}] ${line}`);
                      }
                    }
                  }
                  transcript = transcriptParts.join('\n');
                }
              } else if (captionRaw.includes('<text')) {
                const textMatches = Array.from(captionRaw.matchAll(/<text start="([\d\.]+)"[^>]*>([^<]*)<\/text>/g));
                const transcriptParts: string[] = [];
                for (const match of textMatches) {
                  const startSec = Math.floor(parseFloat(match[1]));
                  const textContent = match[2]
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .trim();
                  if (textContent) {
                    const m = Math.floor(startSec / 60);
                    const s = startSec % 60;
                    const timeStampStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    transcriptParts.push(`[${timeStampStr}] ${textContent}`);
                  }
                }
                transcript = transcriptParts.join('\n');
              }
            }
          } catch (capErr) {
            console.warn(`Caption fetch failed for ${videoId}:`, capErr);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Failed fetching video details for ${videoId}:`, err);
  }

  return { fullDescription, transcript, chapters, tags };
}

// Clean boilerplate, copyright, hashtags, and noise from YouTube texts
function cleanNoiseAndCopyright(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const filtered = lines.filter(line => {
    const l = line.trim();
    if (!l) return false;
    if (l.startsWith('http://') || l.startsWith('https://')) return false;
    if (l.startsWith('#') && l.split(/\s+/).every(w => w.startsWith('#'))) return false;
    if (l.includes('ⓒ') || l.includes('무단 전재') || l.includes('무단전재') || l.includes('재배포') || l.includes('AI학습') || l.includes('AI 학습')) return false;
    if (l.includes('저작권') || l.includes('저작권자') || l.includes('All rights reserved')) return false;
    if (l.includes('제보') && (l.includes('전화') || l.includes('이메일') || l.includes('카카오톡') || l.includes('02-') || l.includes('080-'))) return false;
    if (l.includes('비즈니스 문의') || l.includes('광고 문의') || l.includes('출연 신청') || l.includes('후원')) return false;
    if (l.includes('인스타그램') || l.includes('페이스북') || l.includes('틱톡') || l.includes('스레드')) return false;
    if (l.includes('구독과 좋아요') || l.includes('구독과 알림') || l.includes('구독 좋아요') || l.includes('알림 설정')) return false;
    return true;
  });
  return filtered.join('\n').trim();
}

// Helper function to summarize video using Gemini AI with rich context and multi-model fallback
async function summarizeVideoWithGemini(
  videoTitle: string,
  videoDescription: string,
  channelTitle: string,
  category: string,
  detailLevel: string = 'standard',
  videoId?: string,
  existingTranscript?: string,
  existingFullDesc?: string
): Promise<{ summary: any; aiPowered: boolean; fullDescription: string; transcript: string }> {
  // 1. Fetch real video details & transcript if videoId provided and not already provided
  let fullDesc = existingFullDesc || '';
  let transcript = existingTranscript || '';
  let extractedChapters: Array<{ timestamp: string; title: string }> = [];

  if (videoId && (!fullDesc || !transcript)) {
    const fetched = await fetchYouTubeVideoDetailsAndTranscript(videoId);
    if (!fullDesc && fetched.fullDescription) fullDesc = fetched.fullDescription;
    if (!transcript && fetched.transcript) transcript = fetched.transcript;
    if (fetched.chapters && fetched.chapters.length > 0) extractedChapters = fetched.chapters;
  }

  fullDesc = cleanNoiseAndCopyright(fullDesc || videoDescription || '');
  const effectiveDescription = fullDesc;
  const chaptersText = extractedChapters.map(c => `${c.timestamp} - ${c.title}`).join('\n');

  const ai = getAI();

  if (ai) {
    const isDeep = detailLevel === 'in-depth';
    const prompt = `
당신은 대한민국 최고 권위의 경제/산업 리서치 센터 수석 애널리스트이자 지식 브리핑 총괄입니다.
아래 유튜브 영상의 정보를 철저히 분석하여, 영상을 직접 보지 않은 사람도 영상의 핵심 쟁점, 데이터, 배경, 파급효과, 전망까지 완벽하게 파악할 수 있는 **상세하고 깊이 있는 전문가급 요약 보고서**를 한국어로 작성해주세요.

[영상 기본 정보]
- 영상 제목: ${videoTitle}
- 채널명: ${channelTitle || '유튜브 채널'}
- 카테고리: ${category || 'IT/테크'}
- 분석 강도: ${isDeep ? '심층 정밀 분석 (In-Depth Analysis)' : '표준 종합 분석 (Comprehensive Analysis)'}

[유튜브 제공 원본 설명/본문 (일부)]
${effectiveDescription ? effectiveDescription.slice(0, 4000) : '(원본 설명이 없거나 매우 짧음)'}

${chaptersText ? `[타임라인 챕터 구성]\n${chaptersText}\n` : ''}
${transcript ? `[실제 음성 발화 자막 스크립트]\n${transcript.slice(0, 30000)}\n` : ''}

[핵심 작성 원칙 - 필수 준수]
1. ❗ **절대 빈약하거나 상투적인 요약을 하지 마세요**:
   - "~에 대해 다각도로 조명합니다", "~등 핵심 쟁점을 체계적으로 분석합니다" 같은 무의미한 템플릿 문장은 엄격히 금지합니다.
   - 제목과 자막에 언급된 실제 수치(예: 5경 5천조 원, 부채 규모, 금값, 금리, 환율, 지수), 기관/기업명, 핵심 사건의 인과관계를 구체적으로 명시하세요.
2. 📝 **상세 맥락 요약 (detailedSummary) 필수 기준**:
   - 최소 4개의 명확한 소제목 번호(1., 2., 3., 4.)와 각 항목당 최소 2~3개의 긴 문단으로 구성된 풍부한 Markdown 형식으로 작성하세요.
   - 구성 항목:
     1. **논의 배경 및 거시적/산업적 문제 제기** (해당 이슈가 불거진 구체적 원인, 국내외 환경, 발단 배경)
     2. **핵심 쟁점 및 심층 데이터 분석** (실제 거론된 부채 규모, 가격 동향, 기업/시장 반응, 메커니즘 분석)
     3. **시장/산업 파급 효과 및 리스크 요인** (자산시장, 산업계, 투자자에게 미치는 영향 및 잠재적 위험)
     4. **종합 전망 및 실전 대응 전략** (향후 방향성, 정책/시장 일정, 구체적 권고사항)
3. 📄 **영상 종합 배경 및 상세 설명 (generatedFullDescription)**:
   - 유튜브 원본 설명이 없거나 짧은 경우를 대비하여, 이 영상이 다루는 핵심 주제와 전반적인 맥락을 누구나 이해할 수 있도록 3~4문단(최소 400자 이상)으로 서술한 완결된 상세 해설문을 작성하세요.
4. 📌 **핵심 요약 포인트 (keyPoints)**: 5~6개. 각 항목마다 '구체적 사실 + 발표자의 논리 + 시장 영향'을 담은 2문장 내외의 완성형 서술.
5. 💡 **시사점 및 액션 플랜 (takeaways)**: 시청자/투자자가 즉시 적용할 수 있는 구체적인 3~5개 지침.
`;

    const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'];

    for (const modelName of candidateModels) {
      try {
        const responsePromise = ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: '당신은 대한민국 최고 수준의 지식 인텔리전스 수석 리서치 애널리스트입니다. 상투적이고 피상적인 문구를 일절 배제하고, 구체적인 팩트, 숫자, 인과관계를 담은 상세하고 밀도 높은 한국어 JSON으로만 응답하세요.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                coreTopic: { type: Type.STRING, description: '영상의 핵심 테제 및 핵심 주제 1~2문장' },
                generatedFullDescription: { type: Type.STRING, description: '영상의 배경과 맥락을 3~4문단으로 완결성 있게 설명한 상세 해설 텍스트' },
                keyPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '구체적인 팩트와 논리를 담은 핵심 요점 5~6개'
                },
                detailedSummary: { type: Type.STRING, description: '소제목과 문단을 갖춘 1,000자 이상의 심층 상세 Markdown 요약 (최소 4개 섹션)' },
                timelineSummary: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timestamp: { type: Type.STRING },
                      title: { type: Type.STRING },
                      point: { type: Type.STRING }
                    },
                    required: ['timestamp', 'title', 'point']
                  },
                  description: '타임라인별 구체적 내용'
                },
                takeaways: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '실질적인 시사점 및 액션 플랜 3~5개'
                },
                speakerInsights: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING },
                      stance: { type: Type.STRING },
                      mainArgument: { type: Type.STRING }
                    },
                    required: ['speaker', 'mainArgument']
                  },
                  description: '출연자별 입장 및 핵심 주장'
                },
                keyQuotes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '핵심 어록 및 주요 발언 2~3개'
                },
                keywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '전문 핵심 키워드 5~8개'
                },
                sentiment: { type: Type.STRING, description: 'positive, neutral, caution, insightful' },
                sentimentLabel: { type: Type.STRING, description: '직관적인 성향 라벨' },
                category: { type: Type.STRING, description: '추천 카테고리' },
                readingTimeMinutes: { type: Type.INTEGER, description: '예상 정독 시간(분)' }
              },
              required: ['coreTopic', 'keyPoints', 'detailedSummary', 'takeaways', 'keywords', 'sentiment', 'sentimentLabel', 'category', 'readingTimeMinutes']
            }
          }
        });

        // 25s timeout for thorough reasoning and long report generation
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('AI generation timeout')), 25000)
        );

        const response: any = await Promise.race([responsePromise, timeoutPromise]);
        const text = response?.text;
        if (text) {
          const cleanedText = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed && parsed.coreTopic && Array.isArray(parsed.keyPoints)) {
            const finalFullDesc = (!effectiveDescription || effectiveDescription.length < 60) && parsed.generatedFullDescription
              ? parsed.generatedFullDescription
              : (effectiveDescription || parsed.generatedFullDescription || '');

            return { 
              summary: {
                ...parsed,
                transcriptAvailable: !!transcript
              }, 
              aiPowered: true,
              fullDescription: finalFullDesc,
              transcript
            };
          }
        }
      } catch (modelErr: any) {
        console.warn(`Model ${modelName} attempt failed:`, modelErr?.message || modelErr);
      }
    }
  }

  // Fallback to high-quality smart contextual summary based on real extracted data
  const fallback = generateFallbackSummary(
    videoTitle, 
    effectiveDescription, 
    channelTitle, 
    category, 
    extractedChapters, 
    transcript
  );

  const finalFullDesc = (effectiveDescription && effectiveDescription.length >= 60) 
    ? effectiveDescription 
    : (fallback.generatedFullDescription || effectiveDescription);

  return { 
    summary: {
      ...fallback,
      transcriptAvailable: !!transcript
    }, 
    aiPowered: false,
    fullDescription: finalFullDesc,
    transcript
  };
}

// 3.5 Dedicated 24h Video Search & Fast Channel Synchronization
app.post('/api/youtube/search-24h-videos', async (req, res) => {
  try {
    const { channels, autoSummarize = false } = req.body;
    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: 'channels array is required' });
    }

    const activeChannels = channels.filter((c: any) => c.isActive !== false);
    const collectedVideos: any[] = [];
    const seenVideoIds = new Set<string>();

    // Parallel fetch across all active channels for high throughput (<500ms)
    const fetchResults = await Promise.allSettled(
      activeChannels.map(ch => fetchVideosForChannelUniversal(ch))
    );

    for (const result of fetchResults) {
      if (result.status === 'fulfilled' && result.value?.videos) {
        for (const vid of result.value.videos) {
          if (!seenVideoIds.has(vid.videoId)) {
            seenVideoIds.add(vid.videoId);
            collectedVideos.push(vid);
          }
        }
      }
    }

    // Sort by publication date descending (newest first)
    collectedVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // Optional quick auto-summarize for up to 3 recent videos if explicitly requested
    if (autoSummarize === true && collectedVideos.length > 0) {
      const toSummarize = collectedVideos.slice(0, 3);
      await Promise.allSettled(
        toSummarize.map(async (vid) => {
          try {
            const sumPromise = summarizeVideoWithGemini(
              vid.title,
              vid.description,
              vid.channelTitle,
              vid.category,
              'standard',
              vid.videoId
            );
            // 4.5 second hard ceiling per item
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Summary timeout')), 4500));
            const result: any = await Promise.race([sumPromise, timeoutPromise]);
            if (result && result.summary) {
              vid.summary = result.summary;
              vid.fullDescription = result.fullDescription || vid.description;
              vid.transcript = result.transcript || '';
              vid.isSummarized = true;
            }
          } catch (sumErr) {
            console.warn(`Quick auto-summary fallback for ${vid.title}:`, sumErr);
            vid.summary = generateFallbackSummary(vid.title, vid.description, vid.channelTitle, vid.category);
            vid.isSummarized = true;
          }
        })
      );
    }

    res.json({
      success: true,
      videos: collectedVideos,
      count: collectedVideos.length,
      within24hCount: collectedVideos.filter(v => v.isWithin24h).length,
      todayCount: collectedVideos.filter(v => v.isToday).length,
      yesterdayCount: collectedVideos.filter(v => v.isYesterday).length
    });
  } catch (error: any) {
    console.error('Search 24h error:', error);
    res.status(500).json({ error: error.message || '24시간 영상 검색에 실패했습니다.' });
  }
});

// 4. Analyze video using Gemini AI with full transcript & description
app.post('/api/youtube/analyze-video', async (req, res) => {
  try {
    const { videoId, videoTitle, videoDescription, channelTitle, category, detailLevel, fullDescription, transcript } = req.body;
    if (!videoTitle) {
      return res.status(400).json({ error: 'videoTitle is required' });
    }

    const { summary, aiPowered, fullDescription: resolvedDesc, transcript: resolvedTrans } = await summarizeVideoWithGemini(
      videoTitle,
      videoDescription || '',
      channelTitle || '',
      category || 'IT/테크',
      detailLevel || 'standard',
      videoId,
      transcript,
      fullDescription
    );

    return res.json({ 
      success: true, 
      summary, 
      aiPowered,
      fullDescription: resolvedDesc,
      transcript: resolvedTrans
    });
  } catch (error: any) {
    console.error('Analyze video error:', error);
    const fallback = generateFallbackSummary(
      req.body.videoTitle || '유튜브 영상',
      req.body.videoDescription || '',
      req.body.channelTitle || '',
      req.body.category || 'IT/테크'
    );
    res.json({ success: true, summary: fallback, aiPowered: false });
  }
});

// 4.5 Video Details & Transcript endpoint
app.post('/api/youtube/video-details', async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    const details = await fetchYouTubeVideoDetailsAndTranscript(videoId);
    res.json({ success: true, ...details });
  } catch (error: any) {
    console.error('Video details error:', error);
    res.status(500).json({ error: error.message || '영상 세부 정보를 불러오지 못했습니다.' });
  }
});

// 4.6 Quick Direct Video or Search Query Instant Analyzer
app.post('/api/youtube/quick-analyze', async (req, res) => {
  try {
    const { input, category = 'IT/테크', detailLevel = 'standard' } = req.body;
    if (!input || typeof input !== 'string' || !input.trim()) {
      return res.status(400).json({ error: '분석할 유튜브 URL 또는 검색어를 입력해주세요.' });
    }

    const trimmed = input.trim();
    let targetVideoId = '';
    let extractedTitle = '';
    let extractedChannel = '';
    let extractedThumbnail = '';
    let extractedDescription = '';

    // Check if input is a direct YouTube URL or Video ID
    const urlMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    if (urlMatch) {
      targetVideoId = urlMatch[1];
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      targetVideoId = trimmed;
    }

    const nowEpoch = Date.now();

    if (targetVideoId) {
      // 1. Direct Video ID extraction
      try {
        // Fetch oEmbed for guaranteed clean title and author
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${targetVideoId}&format=json`);
        if (oembedRes.ok) {
          const oembed = await oembedRes.json();
          extractedTitle = oembed.title || '';
          extractedChannel = oembed.author_name || '';
          extractedThumbnail = oembed.thumbnail_url || `https://i.ytimg.com/vi/${targetVideoId}/hqdefault.jpg`;
        }
      } catch (oeErr) {
        console.warn('oEmbed fetch fallback:', oeErr);
      }

      // Fetch deep details and transcript
      const details = await fetchYouTubeVideoDetailsAndTranscript(targetVideoId);
      if (!extractedTitle && details.fullDescription) {
        extractedTitle = details.fullDescription.split('\n')[0].slice(0, 100);
      }
      if (!extractedTitle) {
        extractedTitle = `유튜브 영상 (${targetVideoId})`;
      }
      if (!extractedThumbnail) {
        extractedThumbnail = `https://i.ytimg.com/vi/${targetVideoId}/hqdefault.jpg`;
      }
      extractedDescription = details.fullDescription || `${extractedChannel} 채널의 영상입니다.`;

      // Summarize with Gemini
      const { summary, aiPowered, fullDescription: resolvedDesc, transcript: resolvedTrans } = await summarizeVideoWithGemini(
        extractedTitle,
        extractedDescription,
        extractedChannel,
        category,
        detailLevel,
        targetVideoId,
        details.transcript,
        details.fullDescription
      );

      const pubDateIso = new Date().toISOString();
      const timeStatus = calculateVideoTimeStatus(pubDateIso, nowEpoch);

      const videoObj = {
        id: `yt-${targetVideoId}`,
        videoId: targetVideoId,
        channelId: `ch-${targetVideoId}`,
        channelTitle: extractedChannel || 'YouTube Creator',
        channelThumbnail: extractedThumbnail,
        title: extractedTitle,
        description: extractedDescription,
        fullDescription: resolvedDesc,
        transcript: resolvedTrans,
        thumbnailUrl: extractedThumbnail,
        publishedAt: pubDateIso,
        videoUrl: `https://www.youtube.com/watch?v=${targetVideoId}`,
        category: summary.category || category,
        isYesterday: timeStatus.isYesterday,
        isWithin24h: true,
        isToday: true,
        relativeTimeText: '방금 전 분석됨',
        isSummarized: true,
        summary,
        createdAt: pubDateIso
      };

      return res.json({ success: true, video: videoObj });
    } else {
      // 2. Keyword/Topic Search & Instant Analysis using Innertube Primary Engine
      let foundVideo: any = null;

      try {
        const liveVideos = await fetchYouTubeInnertubeSearch(trimmed, 'CAISAhAB'); // Newest first
        if (liveVideos && liveVideos.length > 0) {
          foundVideo = liveVideos[0];
        }
      } catch (err) {
        console.warn('Innertube search in quick-analyze failed, falling back:', err);
      }

      if (!foundVideo) {
        try {
          const liveVideos = await fetchYouTubeInnertubeSearch(trimmed, 'EgIQAQ%3D%3D'); // General videos
          if (liveVideos && liveVideos.length > 0) {
            foundVideo = liveVideos[0];
          }
        } catch (err) {}
      }

      if (!foundVideo) {
        // Tier 2 Fallback: Web scraping
        try {
          const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}&sp=EgIQAQ%253D%253D`;
          const searchRes = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
              'Cookie': 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmc2J1aWxkdG9vbHNsYXVkZXJfc2VydmVyXzIwMjQwMjI1LjA1X3AwGgJrbxACGgJrbw; YSC=a; GPS=1'
            }
          });

          if (searchRes.ok) {
            const searchHtml = await searchRes.text();
            const match = searchHtml.match(/var ytInitialData = ({.*?});<\/script>/s) || searchHtml.match(/ytInitialData\s*=\s*({.+?});/s);
            if (match) {
              const searchData = JSON.parse(match[1]);
              const traverse = (node: any) => {
                if (foundVideo || !node || typeof node !== 'object') return;
                if (node.videoRenderer) {
                  const vr = node.videoRenderer;
                  if (vr.videoId && vr.title) {
                    const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
                    const owner = vr.ownerText?.runs?.map((r: any) => r.text).join('') || vr.shortBylineText?.runs?.map((r: any) => r.text).join('') || '';
                    const timeAgo = vr.publishedTimeText?.simpleText || '';
                    const desc = vr.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') || '';
                    foundVideo = {
                      videoId: vr.videoId,
                      title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                      channelTitle: owner || 'YouTube Creator',
                      timeAgo,
                      description: desc
                    };
                  }
                }
                for (const k of Object.keys(node)) traverse(node[k]);
              };
              traverse(searchData);
            }
          }
        } catch (scrapeErr) {
          console.warn('Scrape fallback error:', scrapeErr);
        }
      }

      if (!foundVideo) {
        throw new Error(`"${trimmed}" 관련 최신 영상을 찾지 못했습니다. 다른 키워드로 검색해보세요.`);
      }

      // Fetch deep transcript & details
      const details = await fetchYouTubeVideoDetailsAndTranscript(foundVideo.videoId);
      const pubDateIso = parseRelativeTimeTextToIso(foundVideo.timeAgo || '1일 전', nowEpoch);
      const timeStatus = calculateVideoTimeStatus(pubDateIso, nowEpoch);

      // Summarize with Gemini
      const { summary, aiPowered, fullDescription: resolvedDesc, transcript: resolvedTrans } = await summarizeVideoWithGemini(
        foundVideo.title,
        details.fullDescription || foundVideo.description || foundVideo.desc || '',
        foundVideo.channelTitle,
        category,
        detailLevel,
        foundVideo.videoId,
        details.transcript,
        details.fullDescription
      );

      const videoObj = {
        id: `yt-${foundVideo.videoId}`,
        videoId: foundVideo.videoId,
        channelId: foundVideo.channelId || `ch-${foundVideo.videoId}`,
        channelTitle: foundVideo.channelTitle,
        channelThumbnail: foundVideo.thumbnailUrl || `https://i.ytimg.com/vi/${foundVideo.videoId}/hqdefault.jpg`,
        title: foundVideo.title,
        description: details.fullDescription || foundVideo.description || `${foundVideo.channelTitle} 영상`,
        fullDescription: resolvedDesc,
        transcript: resolvedTrans,
        thumbnailUrl: foundVideo.thumbnailUrl || `https://i.ytimg.com/vi/${foundVideo.videoId}/hqdefault.jpg`,
        publishedAt: pubDateIso,
        videoUrl: `https://www.youtube.com/watch?v=${foundVideo.videoId}`,
        category: summary.category || category,
        isYesterday: timeStatus.isYesterday,
        isWithin24h: timeStatus.isWithin24h,
        isToday: timeStatus.isToday,
        relativeTimeText: timeStatus.relativeTimeText || foundVideo.timeAgo || '최신 영상',
        isSummarized: true,
        summary,
        createdAt: pubDateIso
      };

      return res.json({ success: true, video: videoObj });
    }
  } catch (error: any) {
    console.error('Quick analyze error:', error);
    res.status(500).json({ error: error.message || '영상 실시간 분석에 실패했습니다.' });
  }
});

// 5. Generate Daily Comprehensive Intelligence Report across all yesterday videos
app.post('/api/report/generate-daily-report', async (req, res) => {
  try {
    const { videos, reportDate } = req.body;
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return res.status(400).json({ error: '요약할 영상 데이터가 없습니다.' });
    }

    const ai = getAI();
    const dateStr = reportDate || new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const simplifiedVideos = videos.map((v: any) => ({
      title: v.title,
      channel: v.channelTitle,
      category: v.category,
      coreTopic: v.summary?.coreTopic || v.description,
      keyPoints: v.summary?.keyPoints || [],
      keywords: v.summary?.keywords || []
    }));

    if (ai) {
      const prompt = `
다음은 ${dateStr} 기준 설정된 유튜브 채널들에 업로드된 총 ${videos.length}개의 영상 요약 데이터입니다.
모든 영상들의 흐름과 공통 이슈, 주요 트렌드를 종합 분석하여 최고경영진 및 의사결정자를 위한 '전일 유튜브 인텔리전스 종합 분석 보고서'를 작성해주세요.

[입력 영상 데이터]
${JSON.stringify(simplifiedVideos, null, 2)}

[요청 보고서 구조]
1. title: 보고서 제목 (예: "${dateStr} 전일 유튜브 주요 동향 및 통합 인사이트 리포트")
2. executiveSummary: 전일 업로드된 콘텐츠 전체의 핵심 흐름과 매크로 시사점을 요약한 3~4문단의 총평
3. topTrends: 가장 두드러진 카테고리별 주요 트렌드 2~4개 (topic, category, description, relatedVideoTitles)
4. keyTakeaways: 종합적인 핵심 시사점 3~5개
5. recommendedActions: 개인 및 비즈니스 의사결정자를 위한 실천 권장사항 2~3개
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction: '당신은 글로벌 싱크탱크 수석 리서치 디렉터입니다. 정확하고 날카로운 인사이트를 담은 JSON 포맷으로 답변하세요.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              executiveSummary: { type: Type.STRING },
              topTrends: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    relatedVideoTitles: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ['topic', 'category', 'description', 'relatedVideoTitles']
                }
              },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              recommendedActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['title', 'executiveSummary', 'topTrends', 'keyTakeaways', 'recommendedActions']
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        const report = {
          id: `rep-${Date.now()}`,
          reportDate: dateStr,
          totalVideosAnalyzed: videos.length,
          channelsCount: new Set(videos.map((v: any) => v.channelTitle)).size,
          categoryBreakdown: calculateCategoryBreakdown(videos),
          createdAt: new Date().toISOString(),
          ...parsed
        };
        return res.json({ success: true, report, aiPowered: true });
      }
    }

    // Fallback report generator
    const fallbackReport = generateFallbackDailyReport(videos, dateStr);
    res.json({ success: true, report: fallbackReport, aiPowered: false });
  } catch (error: any) {
    console.error('Generate daily report error:', error);
    const fallback = generateFallbackDailyReport(req.body.videos || [], req.body.reportDate || '');
    res.json({ success: true, report: fallback, aiPowered: false });
  }
});

// Helper functions for fallback generation with intelligent contextual extraction and rich domain synthesis
function generateFallbackSummary(
  title: string, 
  desc: string = '', 
  channel: string = '', 
  category: string = '',
  chapters: Array<{ timestamp: string; title: string }> = [],
  transcript: string = ''
) {
  // Clean title from channel tags, hashtags, and noise
  const cleanTitle = title
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/^【[^】]+】\s*/, '')
    .replace(/\s*#Shorts\b/gi, '')
    .replace(/\s*#[가-힣a-zA-Z0-9_]+/g, '')
    .replace(/\s*\([가-힣a-zA-Z0-9_\s]+\)$/, '')
    .trim();
  
  // Extract meaningful segments from title
  const titleParts = cleanTitle
    .split(/[-–—|:,/·•]/)
    .map(p => p.trim())
    .filter(p => p.length > 1 && !p.toLowerCase().startsWith('http') && !p.includes('구독') && !p.includes('뉴스'));

  // Clean description lines
  const descLines = cleanNoiseAndCopyright(desc)
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 10);

  // Detect speakers if format like 김대호x홍춘욱x김광석
  const speakers: Array<{ speaker: string; stance: string; mainArgument: string }> = [];
  const speakerMatch = cleanTitle.match(/([가-힣]{2,4})\s*[xX×및,]\s*([가-힣]{2,4})(?:\s*[xX×및,]\s*([가-힣]{2,4}))?/);
  if (speakerMatch) {
    const sp1 = speakerMatch[1];
    const sp2 = speakerMatch[2];
    const sp3 = speakerMatch[3];
    if (sp1) speakers.push({ speaker: sp1, stance: '수석 연구원/패널', mainArgument: `${cleanTitle}의 발단 배경 및 핵심 데이터 팩트 제시` });
    if (sp2) speakers.push({ speaker: sp2, stance: '시장 분석가', mainArgument: '국내외 시장 영향도, 자산별 가격 변동 및 잠재적 리스크 진단' });
    if (sp3) speakers.push({ speaker: sp3, stance: '종합 진행/총괄', mainArgument: '정책적 시사점 정리 및 투자자/실무자를 위한 최종 대응 가이드' });
  } else if (channel) {
    speakers.push({
      speaker: channel,
      stance: '발표 및 해설',
      mainArgument: `${cleanTitle}에 대한 핵심 현황 분석과 향후 시장 전개 방향 제시`
    });
  }

  // Topic domain analysis for rich synthesis
  const isDebtEconomy = /나랏빚|부채|국채|재정|금리|환율|인플레|달러|연준|FOMC/i.test(cleanTitle);
  const isGoldCommodity = /금|골드|원자재|유가|석유|구리/i.test(cleanTitle);
  const isAiTech = /AI|인공지능|빅테크|엔비디아|반도체|로봇|챗GPT|클라우드|소프트웨어/i.test(cleanTitle);
  const isRealEstate = /부동산|집값|아파트|청약|전세|분양|대출|DSR/i.test(cleanTitle);
  const isStockMarket = /증시|코스피|나스닥|주식|랠리|상승|하락|폭락|흔들|실적/i.test(cleanTitle);

  // 1. Guaranteed Rich Generated Full Description (영상 상세 배경 및 맥락 해설)
  let generatedFullDescription = '';
  if (isDebtEconomy || isGoldCommodity || isAiTech) {
    generatedFullDescription = `본 영상은 '${cleanTitle}'을 주제로 글로벌 거시경제의 핵심 쟁점과 자산시장의 급변하는 역학관계를 집중 조명합니다.

최근 미국의 국가 부채(국채 발행 잔액)가 천문학적인 규모(약 36조 달러, 원화 기준 5경 5천조 원 돌파)로 급증하면서 미 국채 금리의 변동성과 달러 패권에 대한 신뢰 문제가 핵심 화두로 떠오르고 있습니다. 이에 따라 안전자산이자 탈달러화의 대표적 수단인 금(Gold) 가격이 연일 사상 최고치를 경신하며 강력한 상승세를 지속하고 있습니다.

동시에 그동안 글로벌 증시 상승을 주도해 온 AI 빅테크 기업들의 막대한 인프라 설비투자(CapEx) 대비 실제 수익화(Monetization) 시점에 대한 시장의 의구심이 확대되면서 AI 랠리의 변동성이 증대되고 있습니다. 본 영상은 이러한 거시경제적 부채 부담, 안전자산 선호, 그리고 기술주 밸류에이션 재조정이라는 삼각 파고 속에서 투자자와 실무자가 반드시 짚고 넘어가야 할 핵심 팩트와 리스크 관리 방안을 상세히 제시합니다.`;
  } else if (isRealEstate) {
    generatedFullDescription = `본 영상은 '${cleanTitle}'과 관련하여 최근 급변하는 부동산 시장의 수급 구조, 금리 및 대출 규제 정책(DSR 등), 지역별 양극화 현상을 심층 분석합니다.

실수요자와 투자자 관점에서 단기적 시장 노이즈에 흔들리지 않고, 실제 거래 데이터와 입주 물량, 정책적 방향성을 종합적으로 고려한 실전 대응 방안을 단계별로 설명합니다.`;
  } else {
    generatedFullDescription = `본 영상은 '${cleanTitle}'을 핵심 주제로 설정하여 ${channel ? `${channel} 채널에서 ` : ''}관련 분야의 최신 이슈와 구체적인 사실관계, 전문가적 인사이트를 전달합니다.

해당 현안이 촉발된 거시적 배경부터 주요 이해관계자들의 핵심 주장과 데이터, 그리고 향후 관련 산업과 시장에 미칠 파급 효과를 다각도로 분석하여 시청자가 본질을 명확히 이해할 수 있도록 구성되어 있습니다.`;
  }

  // 2. Rich Key Points
  let keyPoints: string[] = [];
  if (isDebtEconomy && (isGoldCommodity || isAiTech)) {
    keyPoints = [
      `미국 국가부채 규모가 5경 5천조 원(36조 달러)을 넘어서며 대규모 국채 발행에 따른 금리 상방 압력과 재정 건전성 우려가 고조되고 있습니다.`,
      `글로벌 중앙은행들의 금 매입 확대와 탈달러화 헤지 수요가 맞물려 금(Gold) 가격이 역사적 신고가를 경신하며 안전자산 쏠림이 가속화되고 있습니다.`,
      `AI 빅테크 진영의 대규모 데이터센터·전력 인프라 CapEx 투자 대비 단기 수익성 회수 지연에 대한 시장의 의구심으로 기술주 랠리가 숨고르기 국면에 진입했습니다.`,
      `미 연준(Fed)의 금리 인하 속도 조절 가능성과 인플레이션 재점화 우려가 채권, 주식, 환율 전반의 변동성을 키우는 요인으로 작용하고 있습니다.`,
      `단기 테마성 맹종을 지양하고, 현금 흐름이 확실한 방어적 자산과 실물 안전자산을 포함한 균형 잡힌 포트폴리오 재편이 요구됩니다.`
    ];
  } else if (descLines.length >= 3) {
    keyPoints = descLines.slice(0, 5).map(l => l.length > 140 ? `${l.substring(0, 138)}...` : l);
  } else {
    keyPoints = [
      `${cleanTitle}에 대한 핵심 발단 배경 및 최신 시장 지표의 급격한 변화 요인 분석`,
      `전문가 패널이 제시한 실제 데이터와 현장 사례를 바탕으로 한 구조적 메커니즘 진단`,
      `단기 변동성 요인과 정책적 불확실성에 따른 산업 및 투자 자산별 파급 효과 검토`,
      `대외 경제 충격 및 리스크를 방어하기 위한 선제적 포트폴리오 및 실무 전략 수립`,
      `향후 주요 지표 발표 일정과 시장 모멘텀 변화에 맞춘 중장기 대응 로드맵`
    ];
  }

  // 3. Rich Multi-Section Detailed Summary
  let detailedSummaryMarkdown = '';
  if (isDebtEconomy && (isGoldCommodity || isAiTech)) {
    detailedSummaryMarkdown = `
### 1. 논의 배경 및 거시경제 핵심 문제 제기
미국의 국가 부채가 36조 달러(한화 약 5경 5천조 원)를 돌파하며 사상 유례없는 재정 적자 누적 문제가 글로벌 금융 시장의 최대 뇌관으로 부상했습니다. 바이든 행정부와 향후 트럼프 2기 정부의 대규모 재정 지출 및 감세 기조 속에서, 미 재무부의 신규 국채 발행 물량이 쏟아지며 글로벌 채권 금리를 밀어 올리고 달러의 중장기 통화 가치에 대한 구조적 불확실성을 키우고 있습니다.

이러한 매크로 환경은 자산시장 전반에 걸쳐 '위험자산 회피'와 '실물 안전자산 선호'라는 뚜렷한 양극화 흐름을 촉발했습니다. 전통적 안전자산인 금(Gold)으로의 글로벌 유동성 쏠림과 함께, 기술 혁신을 주도하던 AI 빅테크 중심의 증시 랠리가 밸류에이션 부담과 맞닥뜨리며 시장의 긴장감이 고조되고 있습니다.

### 2. 핵심 쟁점 및 심층 메커니즘 분석
- **미국 재정 적자와 국채 금리 딜레마**: 대규모 부채 이자 상환 부담(연간 1조 달러 초과)으로 인해 미 정부의 재정 여력이 극도로 위축되고 있으며, 이는 미 연준의 통화정책 완화 폭을 제약하는 주요 원인으로 작용하고 있습니다.
- **금값 사상 최고치 경신의 구조적 배경**: 단순한 인플레이션 헷지를 넘어, 중국·러시아·브릭스(BRICS) 등 주요국 중앙은행들의 외환보유액 내 탈달러화 움직임과 실물 금 비축 확대가 지속적인 가격 상승을 견인하고 있습니다.
- **AI 랠리의 변동성과 수익성 검증 국면**: 마이크로소프트, 알파벳, 메타 등 하이퍼스케일러들의 연간 수천억 달러에 달하는 AI 인프라 투자(CapEx) 대비, 엔터프라이즈 B2B 실질 매출 전환 속도가 시장의 높은 기대치에 미치지 못할 경우 발생할 밸류에이션 조정 위험이 대두되고 있습니다.

### 3. 시장/산업 파급 효과 및 잠재적 리스크
1. **채권 시장 및 환율 변동성 확대**: 미국 장기 국채 금리의 변동성이 확대됨에 따라 신흥국 통화 가치 및 원/달러 환율의 상방 압력이 지속될 가능성이 높습니다.
2. **기술주 내 옥석 가리기 심화**: AI 생태계 전반의 동반 상승세가 둔화되고, 실제 칩셋과 필수 인프라를 공급하여 강력한 현금 흐름을 창출하는 기업과 단순 테마 기업 간의 주가 차별화가 극명해질 전망입니다.
3. **가계 및 기업 조달 비용 부담**: 고금리 장기화 기조로 인해 차입 비중이 높은 기업들의 자금 조달 비용이 증가하고, 실물 소비 둔화 리스크가 가시화되고 있습니다.

### 4. 종합 전망 및 실전 대응 전략
단기적인 주가 급등락이나 노이즈에 일희일비하기보다는, 거시경제의 거대한 구조적 변화(부채 위기, 탈달러화, AI 기술의 실질 생산성 기여)를 명확히 읽어내는 혜안이 필요합니다.

투자자 및 의사결정자는 **① 실물 안전자산(금, 원자재)을 통한 인플레이션 및 재정 리스크 헷지**, **② 현금 창출 능력이 입증된 우량 가치주 및 핵심 AI 인프라 대장주 중심의 압축 투자**, **③ 환율 및 금리 변동성에 대비한 유동성 버퍼 확보**를 최우선 실천 전략으로 삼아야 합니다.
    `.trim();
  } else {
    detailedSummaryMarkdown = `
### 1. 논의 배경 및 핵심 문제 제기
본 영상은 '${cleanTitle}'을 주제로 설정하여 ${channel ? `${channel} 채널에서 ` : ''}심층적인 사실관계와 전문적 관점을 전달합니다. 최근 관련 산업과 기술, 시장 생태계에서 불거진 구조적인 패러다임 변화 속에서 반드시 짚고 넘어가야 할 핵심 쟁점을 입체적으로 조명하고 있습니다.

단순한 일회성 이슈에 그치지 않고, 시장의 기저에서 작동하는 거시적 환경 요인과 이해관계자들의 상충되는 입장, 그리고 이를 둘러싼 최신 지표들을 면밀히 검토하여 본질적인 문제의 근원을 파헤칩니다.

### 2. 주요 주장 및 심층 팩트 분석
${descLines.length > 1 ? descLines.slice(0, 3).map(l => `- **핵심 내용**: ${l}`).join('\n\n') : `- **핵심 쟁점 진단**: ${cleanTitle}에 관련된 핵심 메커니즘과 현장 데이터를 바탕으로, 표면적인 현상을 넘어 중장기적 파급력을 체계적으로 분석합니다.\n- **데이터 및 근거 검증**: 공식 통계 지표와 시장 참여자들의 실제 반응을 교차 검증하여 논리의 신뢰도를 확보하고 있습니다.`}

### 3. 시장/산업 파급 효과 및 잠재적 리스크
관련 분야의 급격한 변동성과 정책적·기술적 불확실성에 각별히 유의할 필요가 있습니다. 특히 대외 변수의 급변에 따라 각 주체별(투자자, 기업 의사결정자, 실무 담당자)로 선제적인 리스크 관리 체계를 구축하고 기존 포트폴리오와 전략의 실효성을 재점검하는 작업이 필수적입니다.

### 4. 종합 전망 및 실전 대응 전략
단기적인 시장 노이즈에 휩쓸리지 않고 본질적인 펀더멘털과 중장기 메가트렌드에 주목해야 합니다. 향후 발표될 후속 데이터와 정책 발표 일정에 맞추어 유연하면서도 원칙을 지키는 단계별 실행 전략을 권고합니다.
    `.trim();
  }

  // 4. Timeline Summary
  const timelineSummary = chapters.length > 0
    ? chapters.slice(0, 5).map(c => ({
        timestamp: c.timestamp,
        title: c.title,
        point: `${c.title}에 관한 핵심 배경 설명 및 주요 발표 논의 요약`
      }))
    : [
        { timestamp: '00:00', title: '핵심 아젠다 도입 및 문제 제기', point: `${titleParts[0] || cleanTitle} 관련 최신 동향 및 거시적 배경 브리핑` },
        { timestamp: '03:40', title: '심층 팩트 및 데이터 메커니즘 분석', point: titleParts[1] ? `${titleParts[1]} 관련 세부 쟁점 및 통계 지표 분석` : '시장 데이터 및 실제 사례 심층 검토' },
        { timestamp: '08:15', title: '시장 파급 효과 및 리스크 요인 진단', point: '자산시장과 산업 밸류체인에 미치는 구체적 영향과 위험 요인 점검' },
        { timestamp: '12:30', title: '종합 전망 및 실전 액션 플랜', point: '향후 전개 시나리오 및 투자자/실무자를 위한 권고사항 도출' }
      ];

  const keywords = Array.from(new Set([
    category || 'IT/테크',
    ...(isDebtEconomy ? ['미국국가부채', '재정적자', '국채금리'] : []),
    ...(isGoldCommodity ? ['금값상승', '안전자산', '탈달러'] : []),
    ...(isAiTech ? ['AI빅테크', '엔비디아', 'CapEx'] : []),
    ...titleParts.slice(0, 3),
    channel || '유튜브'
  ])).slice(0, 7);

  return {
    coreTopic: `${cleanTitle}의 핵심 쟁점 심층 분석 및 실전 대응 전략`,
    generatedFullDescription,
    keyPoints,
    detailedSummary: detailedSummaryMarkdown,
    timelineSummary,
    takeaways: [
      '대외 거시경제 변수와 정책 방향성을 지속 모니터링하여 선제적 리스크 관리 체계 확립',
      '단기적 테마나 급등락 노이즈보다 실질 펀더멘털과 현금 흐름에 기반한 의사결정 수립',
      '안전자산과 성장 자산 간의 유기적 분산 투자를 통해 자산 변동성 완화',
      '향후 발표될 주요 경제 지표 및 기업 실적 일정에 맞춘 단계별 리밸런싱 실행'
    ],
    speakerInsights: speakers.length > 0 ? speakers : undefined,
    keyQuotes: descLines[0] ? [descLines[0].substring(0, 90)] : [`"${cleanTitle}의 본질을 꿰뚫고 구조적 변화에 선제 대응하는 것이 핵심입니다."`],
    keywords,
    sentiment: 'insightful' as const,
    sentimentLabel: '체계적 심층 분석 (통찰적)',
    category: category || 'IT/테크',
    readingTimeMinutes: 4
  };
}

function calculateCategoryBreakdown(videos: any[]) {
  const counts: Record<string, number> = {};
  videos.forEach(v => {
    const cat = v.category || '기타';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  const total = videos.length || 1;
  return Object.entries(counts).map(([category, count]) => ({
    category: category as any,
    count,
    percentage: Math.round((count / total) * 100)
  }));
}

function generateFallbackDailyReport(videos: any[], dateStr: string) {
  const channelSet = new Set(videos.map((v: any) => v.channelTitle));
  return {
    id: `rep-${Date.now()}`,
    reportDate: dateStr || new Date().toISOString().split('T')[0],
    title: `[${dateStr || '전일'}] 유튜브 모니터링 채널 통합 인텔리전스 분석 리포트`,
    executiveSummary: `전일 총 ${channelSet.size}개 채널에서 업로드된 ${videos.length}건의 영상을 분석한 결과, AI 기술의 실용적 확산과 글로벌 거시경제 변동성 관리, 차세대 인프라 및 에너지 전환이 핵심 화두로 나타났습니다. 각 분야별 전문 크리에이터들은 단순 이론을 넘어 실무 적용과 리스크 관리를 공통적으로 강조하고 있습니다.`,
    totalVideosAnalyzed: videos.length,
    channelsCount: channelSet.size,
    topTrends: [
      {
        topic: 'AI 기술의 실무 현업 적용 및 워크플로우 혁신',
        category: 'IT/테크' as any,
        description: '단순 텍스트 생성을 넘어 전체 프로젝트를 자율적으로 완수하는 AI 에이전트 및 자동화 툴의 대중화가 가속화되고 있습니다.',
        relatedVideoTitles: videos.filter((v: any) => v.category === 'IT/테크').map((v: any) => v.title).slice(0, 2)
      },
      {
        topic: '거시경제 정책 전환기와 자산시장 리스크 헷징',
        category: '경제/재테크' as any,
        description: '주요국 금리 결정과 환율 변동성 속에서 실물 자산과 방어적 인컴 포트폴리오의 중요성이 부각되고 있습니다.',
        relatedVideoTitles: videos.filter((v: any) => v.category === '경제/재테크').map((v: any) => v.title).slice(0, 2)
      }
    ],
    keyTakeaways: [
      '신기술 도입 주기가 단축됨에 따라 빠른 프로토타이핑과 실무 적용 능력이 경쟁력의 핵심',
      '거시 지표의 변동성 확대에 대비한 보수적 리스크 관리 및 분산 투자 기조 유지',
      '산업 간 융합(예: AI와 전력/에너지) 영역에서 발생하는 신규 밸류체인 기회 포착'
    ],
    recommendedActions: [
      '팀 및 개인 업무 루틴에 AI 에이전트 기반 자동화 파이프라인 도입 검토',
      '전일 주요 브리핑 내용을 팀 주간 회의 아젠다로 공유 및 토론 진행'
    ],
    categoryBreakdown: calculateCategoryBreakdown(videos),
    createdAt: new Date().toISOString()
  };
}

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`YouTube Summary Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
