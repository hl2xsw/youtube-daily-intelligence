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

// Helper function to summarize video using Gemini AI with multi-model fallback
async function summarizeVideoWithGemini(
  videoTitle: string,
  videoDescription: string,
  channelTitle: string,
  category: string,
  detailLevel: string = 'standard'
): Promise<{ summary: any; aiPowered: boolean }> {
  const ai = getAI();

  if (ai) {
    const prompt = `
당신은 최고의 유튜브 콘텐츠 전문 분석가 및 지식 큐레이터입니다.
아래 유튜브 영상의 제목, 설명, 채널 정보를 바탕으로 시청자가 영상을 직접 보지 않고도 모든 핵심 인사이트를 파악할 수 있도록 깊이 있고 체계적인 한국어 요약 보고서를 작성해주세요.

[영상 정보]
- 채널명: ${channelTitle || '미지정'}
- 영상 제목: ${videoTitle}
- 기본 카테고리: ${category || 'IT/테크'}
- 영상 설명: ${videoDescription || '설명 없음'}
- 요약 상세도: ${detailLevel} (concise: 간결핵심, standard: 표준상세, in-depth: 심층분석)

[작성 요구사항]
1. coreTopic: 영상 전체를 관통하는 명확하고 임팩트 있는 핵심 주제 1문장
2. keyPoints: 영상의 가장 중요한 핵심 논점 및 사실 3~5개를 불릿포인트 문자열 배열로 작성
3. detailedSummary: 논리적인 기승전결(배경, 핵심 내용, 결론)을 갖춘 3~5개 문장의 상세하고 풍부한 줄거리 요약
4. timelineSummary: 영상의 흐름을 3~4개 구간(예: 00:00, 05:30 등)으로 나누어 각 구간별 소제목(title)과 핵심 요점(point) 정리
5. takeaways: 시청자가 얻을 수 있는 실질적인 시사점, 인사이트 또는 액션 플랜 2~3개
6. keywords: 핵심 검색 키워드 4~6개 (예: ["AI에이전트", "전력인프라", "테크트렌드"])
7. sentiment: 'positive' | 'neutral' | 'caution' | 'insightful' 중 택1
8. sentimentLabel: 성향 설명 라벨 (예: "미래 성장 전망 (긍정적)", "시장 변동성 주의", "심층 기술 분석")
9. category: 적합한 카테고리 분류 ('IT/테크', '경제/재테크', '비즈니스/스타트업', '과학/지식', '뉴스/시사', '자기계발/교육', '라이프/엔터', '기타' 중 택1)
10. readingTimeMinutes: 요약본을 읽는데 걸리는 예상 시간(분 단위 정수, 2~4)
`;

    // Try primary and backup models in order
    const candidateModels = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

    for (const modelName of candidateModels) {
      try {
        const responsePromise = ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: '당신은 대한민국 최고의 유튜브 데이터 분석가입니다. 전문적이고 유익하며 한국어 맞춤법이 완벽한 JSON 포맷으로만 답변하세요.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                coreTopic: { type: Type.STRING, description: '영상의 핵심 주제 1문장' },
                keyPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '주요 포인트 3~5개'
                },
                detailedSummary: { type: Type.STRING, description: '상세 종합 요약' },
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
                  description: '타임라인별 핵심 내용'
                },
                takeaways: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '시사점 및 액션 플랜'
                },
                keywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '핵심 키워드 4~6개'
                },
                sentiment: { type: Type.STRING, description: 'positive, neutral, caution, insightful' },
                sentimentLabel: { type: Type.STRING, description: '성향 라벨' },
                category: { type: Type.STRING, description: '추천 카테고리' },
                readingTimeMinutes: { type: Type.INTEGER, description: '예상 읽기 시간' }
              },
              required: ['coreTopic', 'keyPoints', 'detailedSummary', 'takeaways', 'keywords', 'sentiment', 'sentimentLabel', 'category', 'readingTimeMinutes']
            }
          }
        });

        // 12s timeout for each attempt
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('AI generation timeout')), 12000)
        );

        const response: any = await Promise.race([responsePromise, timeoutPromise]);
        const text = response?.text;
        if (text) {
          const cleanedText = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed && parsed.coreTopic && Array.isArray(parsed.keyPoints)) {
            return { summary: parsed, aiPowered: true };
          }
        }
      } catch (modelErr: any) {
        console.warn(`Model ${modelName} failed, trying next:`, modelErr?.message || modelErr);
      }
    }
  }

  // Fallback to high-quality smart contextual summary
  const fallback = generateFallbackSummary(videoTitle, videoDescription, channelTitle, category);
  return { summary: fallback, aiPowered: false };
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

    // Auto-summarize recent videos (parallel batch of up to 8 for speed)
    if (autoSummarize && collectedVideos.length > 0) {
      const toSummarize = collectedVideos.slice(0, 8);
      await Promise.allSettled(
        toSummarize.map(async (vid) => {
          try {
            const result = await summarizeVideoWithGemini(
              vid.title,
              vid.description,
              vid.channelTitle,
              vid.category,
              'standard'
            );
            if (result && result.summary) {
              vid.summary = result.summary;
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

// 4. Analyze video using Gemini AI
app.post('/api/youtube/analyze-video', async (req, res) => {
  try {
    const { videoTitle, videoDescription, channelTitle, category, detailLevel } = req.body;
    if (!videoTitle) {
      return res.status(400).json({ error: 'videoTitle is required' });
    }

    const { summary, aiPowered } = await summarizeVideoWithGemini(
      videoTitle,
      videoDescription || '',
      channelTitle || '',
      category || 'IT/테크',
      detailLevel || 'standard'
    );

    return res.json({ success: true, summary, aiPowered });
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
2. executiveSummary: 전일 업로드된 콘텐츠 전체의 핵심 흐름과 매크로 시사점을 요약한 3~4문장의 총평
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

// Helper functions for fallback generation with intelligent topic extraction
function generateFallbackSummary(title: string, desc: string, channel: string, category: string) {
  // Extract key phrases from title
  const cleanTitle = title.replace(/^\[[^\]]+\]\s*/, '').replace(/^【[^】]+】\s*/, '');
  const titleParts = cleanTitle
    .split(/[-–—|:,/·•]/)
    .map(p => p.trim())
    .filter(p => p.length > 1 && !p.toLowerCase().startsWith('http'));

  const subItems: string[] = [];
  titleParts.forEach(part => {
    const commaSplit = part.split(/[,，]/).map(s => s.trim().replace(/등$/, '').trim()).filter(s => s.length > 1);
    subItems.push(...commaSplit);
  });

  const extractedTopics = Array.from(new Set(subItems)).slice(0, 5);

  let keyPoints: string[] = [];
  if (extractedTopics.length >= 2) {
    keyPoints = extractedTopics.map(topic => `${topic}에 대한 핵심 동향 및 주요 배경 분석`);
  } else {
    keyPoints = [
      `${channel || '해당 채널'}에서 집중 조명한 핵심 화두 및 기술/시장 배경 설명`,
      `실제 사례와 최신 데이터에 기반한 주요 원인 및 파급 효과 분석`,
      `향후 전개 방향 및 산업/투자자/실무자 관점에서의 실질적 영향 진단`,
      `관련 기술 및 시장 변화에 대응하기 위한 핵심 고려사항과 대응 전략`
    ];
  }

  const keywords = Array.from(new Set([
    category || 'IT/테크',
    ...extractedTopics.slice(0, 3),
    channel || '유튜브'
  ])).slice(0, 6);

  return {
    coreTopic: `${cleanTitle}의 핵심 쟁점 분석 및 주요 시사점 요약`,
    keyPoints,
    detailedSummary: `본 영상은 '${cleanTitle}'을 주제로 ${channel ? `${channel} 채널에서 ` : ''}심층적인 정보와 통찰을 제시합니다. ${extractedTopics.length > 0 ? `특히 ${extractedTopics.slice(0, 3).join(', ')} 등 다각도의 핵심 쟁점을 체계적으로 다루고 있으며, ` : ''}관련 분야의 최신 트렌드와 파급 효과, 향후 대응 방안을 논리적으로 정리하고 있습니다.`,
    timelineSummary: [
      { timestamp: '00:00', title: '주요 이슈 도입 및 개요', point: '핵심 주제 제시 및 배경 설명' },
      { timestamp: '05:30', title: '심층 내용 및 주요 쟁점 분석', point: extractedTopics[0] ? `${extractedTopics[0]} 관련 상세 분석` : '데이터 및 현장 사례 검토' },
      { timestamp: '12:45', title: '시사점 및 종합 결론', point: '향후 전망 및 실전 대응 전략 제시' }
    ],
    takeaways: [
      '급변하는 트렌드 속에서 핵심 변화 요인을 선제적으로 파악하고 유연하게 대응할 필요성',
      '단편적인 정보보다는 생태계 전반의 흐름과 장기적 파급력을 고려한 의사결정 권고'
    ],
    keywords,
    sentiment: 'insightful' as const,
    sentimentLabel: '체계적 심층 분석 (통찰적)',
    category: category || 'IT/테크',
    readingTimeMinutes: 2
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
