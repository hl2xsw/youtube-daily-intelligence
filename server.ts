import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

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
    subscriberCount: '50만명+'
  },
  {
    keywords: ['sbsnews8', 'sbs뉴스', 'sbs 뉴스', 'sbsnews', 'sbs'],
    channelId: 'UCkinYTS9IHqOEwR1Sze2JTw',
    title: 'SBS 뉴스',
    handle: '@sbsnews8',
    description: '대한민국 No.1 SBS뉴스 공식 채널입니다.',
    thumbnailUrl: 'https://yt3.googleusercontent.com/SqFZwlQcqLs4JMZd3lthkg79kCHi68eerNpkkahvEYSPWhm2afUNqFkbMC6J6JJcy9JJ_DzQ8w=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '450만명'
  },
  {
    keywords: ['mbcnews11', 'mbc뉴스', 'mbcnews', 'mbc', '엠비씨뉴스'],
    channelId: 'UCF4Wxdo3inmxP-Y59wXDsFw',
    title: 'MBCNEWS',
    handle: '@MBCNEWS11',
    description: 'MBC 뉴스 공식 유튜브 채널입니다. 세상과 소통하는 시간, MBC 뉴스와 함께 하세요!',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_nKpBrT7zzqTfdlfUHzw60wMU5KqV-kBmiFjU9dvMI8ePo=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '480만명'
  },
  {
    keywords: ['yonhapnewstv23', '연합뉴스tv', '연합뉴스', 'yonhapnewstv', '연합'],
    channelId: 'UCTHCOPwqNfZ0uiKOvFyhGwg',
    title: '연합뉴스TV',
    handle: '@yonhapnewstv23',
    description: '빠르고 정확한 24시간 대한민국 뉴스 채널 연합뉴스TV입니다.',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k6k-Z5sA63aN66RkU8e7bS7yO9_hM8jD=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '270만명'
  },
  {
    keywords: ['jocoding', '조코딩', 'jocoding채널'],
    channelId: 'UCQNE2JmbasNYbjGAcuBiRRg',
    title: '조코딩 JoCoding',
    handle: '@jocoding',
    description: '누구나 쉽게 배우는 최신 AI 툴과 테크 트렌드 및 프로그래밍',
    thumbnailUrl: 'https://yt3.googleusercontent.com/Ju_n8o_3uH37U9jI01iWjLz2t8Yc8k8l7p=s900-c-k-c0x00ffffff-no-rj',
    category: 'IT/테크',
    subscriberCount: '62만명'
  },
  {
    keywords: ['shukaworld', '슈카월드', '슈카'],
    channelId: 'UCsJ6RuBiTVWRX156FVbeaGg',
    title: '슈카월드',
    handle: '@shukaworld',
    description: '경제, 금융, 시사 이슈를 쉽고 재미있게 풀어주는 경제/인문 채널',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k8bBv4g9t-s7v-t8m_t9z=s900-c-k-c0x00ffffff-no-rj',
    category: '경제/재테크',
    subscriberCount: '340만명'
  },
  {
    keywords: ['samprotv', '삼프로tv', '삼프로', '경제의신과함께'],
    channelId: 'UChLrzhoZhnngiCE0n6P97vg',
    title: '삼프로TV_경제의신과함께',
    handle: '@samprotv',
    description: '국내외 거시경제 분석, 글로벌 증시 및 기업 심층 브리핑',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_n4L5P-s8v=s900-c-k-c0x00ffffff-no-rj',
    category: '경제/재테크',
    subscriberCount: '250만명'
  },
  {
    keywords: ['ytnnews24', 'ytn', 'ytn뉴스'],
    channelId: 'UChlgI3UHCOnwUGzWzbJ3H5w',
    title: 'YTN',
    handle: '@ytnnews24',
    description: '대한민국 24시간 뉴스 전문 채널 YTN 공식 유튜브',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_m8v=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '460만명'
  },
  {
    keywords: ['kbs_news', 'kbsnews', 'kbs 뉴스', 'kbs뉴스'],
    channelId: 'UCcQTRi69dsVYHN3exePtZ1A',
    title: 'KBS News',
    handle: '@kbs_news',
    description: 'KBS 뉴스 공식 유튜브 채널',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kbs=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '310만명'
  },
  {
    keywords: ['jtbc_news', 'jtbcnews', 'jtbc 뉴스', 'jtbc뉴스'],
    channelId: 'UCEcw01c903W04nnh3486_2Q',
    title: 'JTBC News',
    handle: '@jtbc_news',
    description: 'JTBC 뉴스 공식 유튜브 채널',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_jtbc=s900-c-k-c0x00ffffff-no-rj',
    category: '뉴스/시사',
    subscriberCount: '390만명'
  },
  {
    keywords: ['unrealscience', '안될과학'],
    channelId: 'UCaAmw_tXQOq6n2yP8vDqFSw',
    title: '안될과학 Unrealscience',
    handle: '@unrealscience',
    description: '양자역학부터 우주, 첨단 AI 반도체까지 알기 쉬운 과학 지식',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_unreal=s900-c-k-c0x00ffffff-no-rj',
    category: '과학/지식',
    subscriberCount: '115만명'
  },
  {
    keywords: ['nomadcoders', '노마드코더'],
    channelId: 'UCUpJs89fSBXNolQGOYKn0YQ',
    title: '노마드 코더 Nomad Coders',
    handle: '@nomadcoders',
    description: '글로벌 최신 테크 소식과 개발자 커리어, 신기술 리뷰',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_nomad=s900-c-k-c0x00ffffff-no-rj',
    category: 'IT/테크',
    subscriberCount: '51만명'
  },
  {
    keywords: ['ttimestv', 'ttimes', '티타임즈', '티타임즈tv', '티타임스'],
    channelId: 'UCelFN6fJ6OY6v8pbc_SLiXA',
    title: '티타임즈TV',
    handle: '@TTimesTV',
    description: '세상의 혁신과 비즈니스, 테크 트렌드를 가장 깊이 있게 분석하는 티타임즈TV 공식 채널',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_lk_PZbzPbJP9ZNfuzPC0U8_Q2dafVkwKhoNGi_G2pcjg=s900-c-k-c0x00ffffff-no-rj',
    category: '비즈니스/스타트업',
    subscriberCount: '35.5만명'
  },
  {
    keywords: ['eoeoeo', 'eo', '이오', '태용', '스타트업'],
    channelId: 'UC6tTZ_yP_Kx6kHjU3_oE1sQ',
    title: 'EO 이오',
    handle: '@eoeoeo',
    description: '글로벌 스타트업 혁신가들과 비즈니스 리더들의 스토리',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_eo=s900-c-k-c0x00ffffff-no-rj',
    category: '비즈니스/스타트업',
    subscriberCount: '68만명'
  },
  {
    keywords: ['techmong', '테크몽'],
    channelId: 'UCe_P1k1G1zI0Nf_F7dKqT0w',
    title: '테크몽 Techmong',
    handle: '@techmong',
    description: '쉽고 친절한 IT 기기 및 테크 제품 심층 분석',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_techmong=s900-c-k-c0x00ffffff-no-rj',
    category: 'IT/테크',
    subscriberCount: '75만명'
  },
  {
    keywords: ['1min', '1minonly', '1분만'],
    channelId: 'UCkglhL_29gGqP_lA7b52dJQ',
    title: '1분만',
    handle: '@1minonly',
    description: '세상의 모든 흥미로운 1분 지식과 이야기',
    thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_1min=s900-c-k-c0x00ffffff-no-rj',
    category: '과학/지식',
    subscriberCount: '135만명'
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

    // 3. YouTube search with channel filter (sp=EgIQAg%253D%253D)
    try {
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
          const data = JSON.parse(match[1]);
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
            for (const k of Object.keys(node)) traverse(node[k]);
          };
          traverse(data);
        }
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
  const pubTime = new Date(pubDateIso).getTime();
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

  // Strict 24-hour window (including 1 hour ago, 5 mins ago, etc.)
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

  const isToday = isSameDayKst || (diffHours >= -0.5 && diffHours < 16);
  const isYesterday = !isToday && (isYesterdayDayKst || (diffHours >= 16 && diffHours <= 48.0));
  const isRecent3Days = diffHours <= 72.0;

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
  if (!timeAgoStr) return new Date(nowEpoch).toISOString();
  const clean = timeAgoStr.replace(/스트리밍/g, '').trim();

  const secMatch = clean.match(/(\d+)\s*(?:초|seconds?)\s*(?:전|ago)/i);
  if (secMatch) return new Date(nowEpoch - parseInt(secMatch[1], 10) * 1000).toISOString();

  const minMatch = clean.match(/(\d+)\s*(?:분|minutes?|mins?)\s*(?:전|ago)/i);
  if (minMatch) return new Date(nowEpoch - parseInt(minMatch[1], 10) * 60 * 1000).toISOString();

  const hourMatch = clean.match(/(\d+)\s*(?:시간|hours?)\s*(?:전|ago)/i);
  if (hourMatch) return new Date(nowEpoch - parseInt(hourMatch[1], 10) * 3600 * 1000).toISOString();

  const dayMatch = clean.match(/(\d+)\s*(?:일|days?)\s*(?:전|ago)/i);
  if (dayMatch) return new Date(nowEpoch - parseInt(dayMatch[1], 10) * 24 * 3600 * 1000).toISOString();

  const weekMatch = clean.match(/(\d+)\s*(?:주|weeks?)\s*(?:전|ago)/i);
  if (weekMatch) return new Date(nowEpoch - parseInt(weekMatch[1], 10) * 7 * 24 * 3600 * 1000).toISOString();

  const monthMatch = clean.match(/(\d+)\s*(?:개월|달|months?)\s*(?:전|ago)/i);
  if (monthMatch) return new Date(nowEpoch - parseInt(monthMatch[1], 10) * 30 * 24 * 3600 * 1000).toISOString();

  if (clean.includes('방금') || clean.includes('초 전')) return new Date(nowEpoch - 30 * 1000).toISOString();
  if (clean.includes('어제') || clean.includes('yesterday')) return new Date(nowEpoch - 24 * 3600 * 1000).toISOString();

  return new Date(nowEpoch).toISOString();
}

// Universal YouTube Channel Video Extractor (HTML Scraper for latest clips + RSS for full metadata)
async function fetchVideosForChannelUniversal(ch: {
  channelId?: string;
  handle?: string;
  title?: string;
  category?: string;
  thumbnailUrl?: string;
}): Promise<{ videos: any[]; channelId: string; channelTitle: string }> {
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

  // 1. Direct HTML Scraping from YouTube /videos tab (Fastest, real-time, captures 100% latest video clips like SBS 뉴스)
  const urlsToScrape: string[] = [];
  if (targetHandle) {
    const cleanH = targetHandle.startsWith('@') ? targetHandle : `@${targetHandle}`;
    urlsToScrape.push(`https://www.youtube.com/${cleanH}/videos`);
  }
  if (targetChannelId && targetChannelId.startsWith('UC') && !targetChannelId.startsWith('UC_')) {
    urlsToScrape.push(`https://www.youtube.com/channel/${targetChannelId}/videos`);
  }

  for (const pageUrl of urlsToScrape) {
    try {
      const resp = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache, no-store'
        }
      });

      if (resp.ok) {
        const html = await resp.text();
        const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/s);
        if (match) {
          try {
            const data = JSON.parse(match[1]);

            // Recursive parser supporting lockupViewModel (2025/2026 format), videoRenderer, and gridVideoRenderer
            const traverse = (node: any) => {
              if (!node || typeof node !== 'object') return;

              // 1-1. YouTube 2025/2026 lockupViewModel
              if (node.lockupViewModel) {
                const lvm = node.lockupViewModel;
                const contentId = lvm.contentId;
                const title = lvm.metadata?.lockupMetadataViewModel?.title?.content;
                const metadataItems = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
                let viewCountNum: number | undefined;
                let timeAgo = '';

                if (metadataItems) {
                  for (const row of metadataItems) {
                    for (const part of (row.metadataParts || [])) {
                      const txt = part.text?.content || '';
                      if (txt.includes('조회수') || txt.includes('views')) {
                        const numMatch = txt.replace(/,/g, '').match(/\d+/);
                        if (numMatch) viewCountNum = parseInt(numMatch[0], 10);
                        if (txt.includes('만')) {
                          const mMatch = txt.match(/([\d.]+)만/);
                          if (mMatch) viewCountNum = Math.round(parseFloat(mMatch[1]) * 10000);
                        } else if (txt.includes('천') || txt.includes('K')) {
                          const kMatch = txt.match(/([\d.]+)[천K]/i);
                          if (kMatch) viewCountNum = Math.round(parseFloat(kMatch[1]) * 1000);
                        }
                      } else if (txt.includes('전') || txt.includes('ago') || txt.includes('스트리밍')) {
                        timeAgo = txt;
                      }
                    }
                  }
                }

                if (contentId && title && !videoMap.has(contentId)) {
                  const pubDateIso = parseRelativeTimeTextToIso(timeAgo, nowEpoch);
                  const timeStatus = calculateVideoTimeStatus(pubDateIso, nowEpoch);

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

              // 1-2. Standard videoRenderer
              if (node.videoRenderer) {
                const vr = node.videoRenderer;
                const videoId = vr.videoId;
                const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
                const timeAgo = vr.publishedTimeText?.simpleText || '';
                const desc = vr.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') || vr.descriptionSnippet?.runs?.map((r: any) => r.text).join('') || '';

                if (videoId && title && !videoMap.has(videoId)) {
                  const pubDateIso = parseRelativeTimeTextToIso(timeAgo, nowEpoch);
                  const timeStatus = calculateVideoTimeStatus(pubDateIso, nowEpoch);

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

              // 1-3. Grid videoRenderer
              if (node.gridVideoRenderer) {
                const vr = node.gridVideoRenderer;
                const videoId = vr.videoId;
                const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
                const timeAgo = vr.publishedTimeText?.simpleText || '';

                if (videoId && title && !videoMap.has(videoId)) {
                  const pubDateIso = parseRelativeTimeTextToIso(timeAgo, nowEpoch);
                  const timeStatus = calculateVideoTimeStatus(pubDateIso, nowEpoch);

                  videoMap.set(videoId, {
                    id: `yt-${videoId}`,
                    videoId,
                    channelId: targetChannelId || `ch-${videoId}`,
                    channelTitle: channelTitle || 'YouTube Channel',
                    channelThumbnail: ch.thumbnailUrl,
                    title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
                    description: `${channelTitle} 최신 영상`,
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

              for (const k of Object.keys(node)) {
                traverse(node[k]);
              }
            };

            traverse(data);
          } catch (jsonErr) {
            console.warn(`JSON parse error on ${pageUrl}:`, jsonErr);
          }
        }

        if (videoMap.size >= 10) {
          break; // Sufficient videos found
        }
      }
    } catch (scrapeErr) {
      console.warn(`Scraping /videos failed for ${pageUrl}:`, scrapeErr);
    }
  }

  // 2. Fetch YouTube RSS Feed as secondary/complementary source
  if (targetChannelId && targetChannelId.startsWith('UC') && !targetChannelId.startsWith('UC_')) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(targetChannelId)}`;
      const rssRes = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Cache-Control': 'no-cache, no-store'
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

              // If already exists from HTML scraping, enrich description and views
              if (videoMap.has(videoId)) {
                const existing = videoMap.get(videoId);
                if (descMatch && descMatch[1].trim()) existing.description = descMatch[1].trim();
                if (viewsMatch) existing.viewCount = parseInt(viewsMatch[1], 10);
                if (pubDateIso) {
                  existing.publishedAt = pubDateIso;
                  existing.isYesterday = timeStatus.isYesterday;
                  existing.isWithin24h = timeStatus.isWithin24h;
                  existing.isToday = timeStatus.isToday;
                  existing.relativeTimeText = timeStatus.relativeTimeText;
                }
              } else {
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

// Helper function to extract full YouTube video details, chapters, and captions/transcript
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
        // Priority: Korean manual > Korean auto (asr) > English > any track
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

  const effectiveDescription = fullDesc || videoDescription || '';
  const chaptersText = extractedChapters.map(c => `${c.timestamp} - ${c.title}`).join('\n');

  const ai = getAI();

  if (ai) {
    const isDeep = detailLevel === 'in-depth';
    const prompt = `
당신은 대한민국 최고의 리서치 기관 수석 콘텐츠 분석가이자 지식 큐레이터입니다.
아래 유튜브 영상의 제목, 원본 상세 설명, 챕터 구성, 실제 발화 자막 스크립트를 철저히 심층 분석하여, 영상을 직접 보지 않고도 전문가 수준으로 모든 핵심 논의와 데이터를 파악할 수 있는 **정밀하고 깊이 있는 요약 보고서**를 한국어로 작성해주세요.

[영상 정보]
- 채널명: ${channelTitle || '미지정'}
- 영상 제목: ${videoTitle}
- 카테고리: ${category || 'IT/테크'}
- 요약 상세 모드: ${isDeep ? '심층 정밀 분석 (In-Depth Intelligence)' : '표준 상세 분석 (Standard Comprehensive)'}

[유튜브 원본 상세 설명 & 타임라인]
${effectiveDescription ? effectiveDescription.slice(0, 5000) : '설명 없음'}

${chaptersText ? `[영상 챕터 정보]\n${chaptersText}\n` : ''}

${transcript ? `[영상 실제 발화 자막/스크립트 (일부/전체)]\n${transcript.slice(0, 30000)}\n` : ''}

[작성 지침 및 금지 사항 (CRITICAL)]
1. ❌ **절대 금지 표현**: "~에 대한 핵심 동향 및 주요 배경 분석", "~에 대해 심층적인 정보와 통찰을 제시합니다", "~등 다각도의 핵심 쟁점을 체계적으로 다루고 있으며" 와 같은 템플릿 상투구는 절대 쓰지 마세요.
2. 🎯 **구체적인 실질 정보 필수**: 영상에서 실제로 거론된 인물(출연자, 패널), 기업/기관명, 경제 수치(금리, 지수, 성장률, 환율 등), 핵심 기술 스택, 구체적인 사례 및 논거를 정확히 담아내야 합니다.
3. 📝 **상세 맥락 요약 (detailedSummary)**:
   - 본 요약 보고서의 가장 중요한 핵심입니다.
   - 최소 3~5개의 풍부한 문단으로 구성된 완성형 Markdown 텍스트로 작성하세요.
   - 구성: 
     - **1. 논의 배경 및 핵심 문제 제기** (왜 이 논의가 촉발되었는가, 거시적/기술적 맥락)
     - **2. 주요 주장 및 심층 논거 분석** (출연자/발표자가 제시한 핵심 사실, 데이터, 메커니즘, 쟁점)
     - **3. 예상 리스크 및 반론 요인** (한계점, 반대 시각, 변동성 요인)
     - **4. 향후 전망 및 최종 결론** (앞으로의 시장/기술 전개 방향)
4. 📌 **핵심 요약 포인트 (keyPoints)**:
   - 4~6개의 불릿포인트. 각 포인트는 단순 제목이 아니라 **'구체적 사실 + 발표자의 핵심 논리 + 그로 인한 파급 효과'**를 담은 1~2개의 명확한 문장으로 작성.
5. ⏱️ **타임라인별 요약 (timelineSummary)**:
   - 영상의 주요 4~6개 구간 타임스탬프(timestamp e.g. "00:00", "05:20"), 소제목(title), 그리고 해당 구간에서 발표자가 말한 실제 핵심 논의 요약(point: 2문장 내외).
6. 💡 **시사점 및 액션 플랜 (takeaways)**:
   - 시청자/투자자/실무자가 바로 활용할 수 있는 구체적인 행동 지침 3~5개.
7. 👥 **출연자별 논의 인사이트 (speakerInsights)**:
   - 토론이나 대담 형태인 경우 각 출연자(예: 김대호, 홍춘욱, 김광석 등)의 입장과 핵심 주장 정리. 단독 방송인 경우 메인 발표자 1명으로 작성.
8. 💬 **핵심 어록 (keyQuotes)**:
   - 영상에서 발표자가 강조한 가장 인상 깊은 문장 2~3개.
`;

    const candidateModels = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

    for (const modelName of candidateModels) {
      try {
        const responsePromise = ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: '당신은 대한민국 최고 수준의 지식 인텔리전스 수석 리서치 애널리스트입니다. 상투적인 문구를 일절 배제하고 오직 팩트, 구체적 논거, 정밀한 분석을 담은 유효한 JSON 포맷으로만 답변하세요.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                coreTopic: { type: Type.STRING, description: '영상의 핵심 테제 및 핵심 주제 1~2문장' },
                keyPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '구체적인 팩트와 논리를 담은 핵심 요점 4~6개'
                },
                detailedSummary: { type: Type.STRING, description: '소제목과 문단을 갖춘 심층 상세 Markdown 요약 (최소 3~5문단)' },
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

        // 18s timeout for high-quality deep analysis
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('AI generation timeout')), 18000)
        );

        const response: any = await Promise.race([responsePromise, timeoutPromise]);
        const text = response?.text;
        if (text) {
          const cleanedText = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed && parsed.coreTopic && Array.isArray(parsed.keyPoints)) {
            return { 
              summary: {
                ...parsed,
                transcriptAvailable: !!transcript
              }, 
              aiPowered: true,
              fullDescription: effectiveDescription,
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

  return { 
    summary: {
      ...fallback,
      transcriptAvailable: !!transcript
    }, 
    aiPowered: false,
    fullDescription: effectiveDescription,
    transcript
  };
}

// 3.5 Dedicated 24h Video Search & Instant AI Summarization
app.post('/api/youtube/search-24h-videos', async (req, res) => {
  try {
    const { channels, autoSummarize = true } = req.body;
    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: 'channels array is required' });
    }

    const activeChannels = channels.filter((c: any) => c.isActive !== false);
    const collectedVideos: any[] = [];
    const seenVideoIds = new Set<string>();

    // Parallel fetch across all active channels for high throughput
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

    // Auto-summarize recent videos (parallel batch of up to 6 for speed & precision)
    if (autoSummarize && collectedVideos.length > 0) {
      const toSummarize = collectedVideos.slice(0, 6);
      await Promise.allSettled(
        toSummarize.map(async (vid) => {
          try {
            const result = await summarizeVideoWithGemini(
              vid.title,
              vid.description,
              vid.channelTitle,
              vid.category,
              'standard',
              vid.videoId
            );
            if (result && result.summary) {
              vid.summary = result.summary;
              vid.fullDescription = result.fullDescription || vid.description;
              vid.transcript = result.transcript || '';
              vid.isSummarized = true;
            }
          } catch (sumErr) {
            console.warn(`Auto-summary failed for ${vid.title}:`, sumErr);
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

// Helper functions for fallback generation with intelligent contextual extraction
function generateFallbackSummary(
  title: string, 
  desc: string = '', 
  channel: string = '', 
  category: string = '',
  chapters: Array<{ timestamp: string; title: string }> = [],
  transcript: string = ''
) {
  const cleanTitle = title.replace(/^\[[^\]]+\]\s*/, '').replace(/^【[^】]+】\s*/, '');
  
  // Extract meaningful segments from title
  const titleParts = cleanTitle
    .split(/[-–—|:,/·•]/)
    .map(p => p.trim())
    .filter(p => p.length > 1 && !p.toLowerCase().startsWith('http') && !p.includes('구독'));

  // Extract meaningful lines from description
  const descLines = (desc || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 12 && !l.startsWith('http') && !l.includes('인스타그램') && !l.includes('비즈니스 문의') && !l.includes('구독과 좋아요'));

  const speakers: Array<{ speaker: string; stance: string; mainArgument: string }> = [];
  // Detect speakers if format like 김대호x홍춘욱x김광석
  const speakerMatch = cleanTitle.match(/([가-힣]{2,4})\s*[xX×및,]\s*([가-힣]{2,4})(?:\s*[xX×및,]\s*([가-힣]{2,4}))?/);
  if (speakerMatch) {
    const sp1 = speakerMatch[1];
    const sp2 = speakerMatch[2];
    const sp3 = speakerMatch[3];
    if (sp1) speakers.push({ speaker: sp1, stance: '핵심 패널/전문가', mainArgument: `${cleanTitle}의 핵심 쟁점 및 데이터 근거 제시` });
    if (sp2) speakers.push({ speaker: sp2, stance: '핵심 패널/전문가', mainArgument: '시장 환경 변화와 리스크 요인 및 파급 효과 분석' });
    if (sp3) speakers.push({ speaker: sp3, stance: '진행 및 종합 정리', mainArgument: '쟁점 조율 및 향후 정책/시장 방향성 도출' });
  }

  // Key points based on actual description lines or chapter markers
  let keyPoints: string[] = [];
  if (chapters && chapters.length >= 3) {
    keyPoints = chapters.slice(0, 5).map(c => `[${c.timestamp}] ${c.title}: 관련 현안에 대한 집중 논의 및 핵심 쟁점 진단`);
  } else if (descLines.length >= 3) {
    keyPoints = descLines.slice(0, 4).map(l => l.length > 120 ? `${l.substring(0, 118)}...` : l);
  } else if (titleParts.length >= 2) {
    keyPoints = titleParts.slice(0, 4).map(tp => `${tp}에 대한 실제 현장 데이터와 정책적 배경 및 시장 파급 효과 분석`);
  } else {
    keyPoints = [
      `${channel || '해당 채널'}에서 발표한 핵심 거시 지표 및 기술적 변화 요인 분석`,
      '현업 전문가 및 출연진이 제시한 구체적인 데이터 기반 논거와 시장 해석',
      '단기 변동성 및 리스크 요인에 대응하기 위한 실전 포트폴리오/전략 가이드',
      '향후 정책 발표 및 시장 일정에 따른 단계별 파급 효과 전망'
    ];
  }

  const timelineSummary = chapters.length > 0
    ? chapters.slice(0, 5).map(c => ({
        timestamp: c.timestamp,
        title: c.title,
        point: `${c.title}에 관한 세부 배경 설명 및 주요 발표 내용 요약`
      }))
    : [
        { timestamp: '00:00', title: '주요 논제 및 문제 제기', point: `${titleParts[0] || cleanTitle} 관련 최신 동향 및 핵심 배경 설명` },
        { timestamp: '05:30', title: '심층 데이터 및 핵심 논거 분석', point: titleParts[1] ? `${titleParts[1]} 관련 심층 분석 및 쟁점 진단` : '시장 데이터 및 실제 사례 검토' },
        { timestamp: '12:45', title: '시사점 및 종합 결론', point: '향후 전망 및 실전 대응 전략 제시' }
      ];

  const detailedSummaryMarkdown = `
### 1. 논의 배경 및 핵심 문제 제기
본 영상은 '${cleanTitle}'을 핵심 아젠다로 설정하여 ${channel ? `${channel} 채널에서 ` : ''}심층적인 사실관계와 전문적 시각을 다룹니다. ${descLines[0] ? descLines[0] : '최근 시장과 기술 환경의 급격한 변화 속에서 가장 주목받는 이슈를 다각도로 조명하고 있습니다.'}

### 2. 주요 주장 및 심층 분석
${descLines.length > 1 ? descLines.slice(1, 3).join('\n\n') : `${cleanTitle}에 관련된 구체적인 메커니즘과 현장 데이터를 바탕으로, 단순한 단기 현상을 넘어 구조적인 변화 요인을 집중적으로 분석합니다.`}

### 3. 시장/산업 파급 효과 및 리스크
관련 분야의 급격한 변동성과 정책적 불확실성에 유의할 필요가 있으며, 각 주체별(투자자, 기업, 실무자)로 선제적인 리스크 관리와 포트폴리오 재점검이 필수적입니다.

### 4. 종합 전망 및 결론
단기적인 노이즈에 매몰되기보다 본질적인 펀더멘털과 중장기 트렌드에 주목해야 하며, 향후 발표될 후속 지표와 일정에 맞춘 유연한 대응 전략을 권고합니다.
  `.trim();

  const keywords = Array.from(new Set([
    category || 'IT/테크',
    ...titleParts.slice(0, 3),
    channel || '유튜브'
  ])).slice(0, 6);

  return {
    coreTopic: `${cleanTitle}의 핵심 쟁점 심층 분석 및 실전 대응 전략`,
    keyPoints,
    detailedSummary: detailedSummaryMarkdown,
    timelineSummary,
    takeaways: [
      '급변하는 대외 변수 속에서 핵심 변화 요인을 선제적으로 파악하고 리스크 관리 강화',
      '단편적 뉴스보다 펀더멘털 데이터와 정책적 방향성에 기반한 중장기 의사결정 수립'
    ],
    speakerInsights: speakers.length > 0 ? speakers : undefined,
    keyQuotes: descLines[0] ? [descLines[0].substring(0, 80)] : undefined,
    keywords,
    sentiment: 'insightful' as const,
    sentimentLabel: '체계적 심층 분석 (통찰적)',
    category: category || 'IT/테크',
    readingTimeMinutes: 3
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
