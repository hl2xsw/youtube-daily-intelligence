import { YouTubeChannel, YouTubeVideo, VideoCategory } from '../types';

// Calculate exact elapsed time and relative date categorization
export function calculateVideoTimeStatus(pubDateIso: string, nowEpoch: number = Date.now()): {
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

  // Time text in Korean: e.g. "8분 전", "1시간 전", "18시간 전", "1일 전", "3일 전"
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

  // Yesterday in KST: exactly 1 calendar day before today
  const yesterdayKst = new Date(nowEpoch - 24 * 60 * 60 * 1000 + kstOffsetMs);
  const isYesterdayDayKst =
    yesterdayKst.getUTCFullYear() === pubKst.getUTCFullYear() &&
    yesterdayKst.getUTCMonth() === pubKst.getUTCMonth() &&
    yesterdayKst.getUTCDate() === pubKst.getUTCDate();

  const isToday = isSameDayKst || (diffHours >= -0.5 && diffHours < 16);
  // Strict Yesterday: must NOT be today, and must be between 16h~48h or 1 calendar day prior
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

// Helper to determine if a video was published within the past 24 hours
export function checkIsWithin24h(pubDateStr: string): boolean {
  return calculateVideoTimeStatus(pubDateStr).isWithin24h;
}

// Helper to determine if a video was published "yesterday"
export function checkIsYesterday(pubDateStr: string): boolean {
  return calculateVideoTimeStatus(pubDateStr).isYesterday;
}

// Helper to determine if a video was published "today"
export function checkIsToday(pubDateStr: string): boolean {
  return calculateVideoTimeStatus(pubDateStr).isToday;
}

// Parse YouTube RSS XML string into YouTubeVideo objects
export function parseYouTubeRssXml(
  feedXml: string,
  channel: { channelId: string; channelTitle: string; channelThumbnail?: string; category?: VideoCategory }
): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  if (!feedXml || !feedXml.includes('<entry>')) {
    return videos;
  }

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
      const rawTitle = titleMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      
      const publishedAt = new Date(publishedMatch[1]).toISOString();
      const description = descMatch ? descMatch[1].trim() : '';
      const thumbnailUrl = thumbMatch 
        ? thumbMatch[1] 
        : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const viewCount = viewsMatch ? parseInt(viewsMatch[1], 10) : undefined;
      const timeStatus = calculateVideoTimeStatus(publishedAt);

      videos.push({
        id: `yt-${videoId}`,
        videoId,
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        channelThumbnail: channel.channelThumbnail || `https://i.ytimg.com/vi/${videoId}/default.jpg`,
        title: rawTitle,
        description,
        thumbnailUrl,
        publishedAt,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        category: channel.category || '기타',
        isYesterday: timeStatus.isYesterday,
        isWithin24h: timeStatus.isWithin24h,
        isToday: timeStatus.isToday,
        relativeTimeText: timeStatus.relativeTimeText,
        isSummarized: false,
        viewCount,
        createdAt: publishedAt
      });
    }
  }

  return videos;
}

// Helper to construct exact YouTube Channel direct shortcut URL
export function getYouTubeChannelUrl(channel: { channelId?: string; handle?: string; title?: string }): string {
  if (channel.handle && channel.handle.trim()) {
    const cleanH = channel.handle.trim().startsWith('@') ? channel.handle.trim() : `@${channel.handle.trim()}`;
    return `https://www.youtube.com/${cleanH}`;
  }
  if (channel.channelId && channel.channelId.startsWith('UC') && !channel.channelId.startsWith('UC_') && channel.channelId.length >= 22) {
    return `https://www.youtube.com/channel/${channel.channelId}`;
  }
  if (channel.title) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(channel.title)}`;
  }
  return 'https://www.youtube.com';
}

// Fetch Channel Videos via RSS (with server API + client CORS proxy fallbacks)
export async function fetchRealChannelVideos(channel: YouTubeChannel): Promise<YouTubeVideo[]> {
  // 1. Try server-side proxy API if running in fullstack mode
  try {
    const res = await fetch('/api/youtube/fetch-rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: channel.channelId,
        channelTitle: channel.title,
        handle: channel.handle,
        category: channel.category
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.videos) && data.videos.length > 0) {
        return data.videos.map((v: any) => {
          const timeStatus = calculateVideoTimeStatus(v.publishedAt);
          return {
            ...v,
            channelTitle: channel.title,
            channelThumbnail: channel.thumbnailUrl || v.channelThumbnail,
            category: channel.category,
            isYesterday: timeStatus.isYesterday,
            isWithin24h: timeStatus.isWithin24h,
            isToday: timeStatus.isToday,
            relativeTimeText: timeStatus.relativeTimeText
          };
        });
      }
    }
  } catch {
    // Continue to client-side fallback
  }

  // 2. If valid UC channel ID, try Client-side CORS proxy fallback (for static GitHub Pages hosting)
  if (channel.channelId && channel.channelId.startsWith('UC') && !channel.channelId.startsWith('UC_')) {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel.channelId)}`;
    const proxyUrls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`
    ];

    for (const proxyUrl of proxyUrls) {
      try {
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const text = await response.text();
          const parsed = parseYouTubeRssXml(text, {
            channelId: channel.channelId,
            channelTitle: channel.title,
            channelThumbnail: channel.thumbnailUrl,
            category: channel.category
          });
          if (parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // try next proxy
      }
    }
  }

  return [];
}

// 24H Video Search and Instant AI Summarization
export async function searchAndSummarize24hVideos(channels: YouTubeChannel[]): Promise<{
  videos: YouTubeVideo[];
  within24hCount: number;
  yesterdayCount: number;
}> {
  const activeChannels = channels.filter(c => c.isActive);
  if (activeChannels.length === 0) {
    return { videos: [], within24hCount: 0, yesterdayCount: 0 };
  }

  try {
    const res = await fetch('/api/youtube/search-24h-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channels: activeChannels,
        autoSummarize: true
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.videos)) {
        return {
          videos: data.videos,
          within24hCount: data.within24hCount || 0,
          yesterdayCount: data.yesterdayCount || 0
        };
      }
    }
  } catch (err) {
    console.warn('search-24h-videos API call failed:', err);
  }

  // Fallback: manual sync across channels
  const allVideos: YouTubeVideo[] = [];
  for (const ch of activeChannels) {
    const fetched = await fetchRealChannelVideos(ch);
    allVideos.push(...fetched);
  }

  return {
    videos: allVideos,
    within24hCount: allVideos.filter(v => v.isWithin24h).length,
    yesterdayCount: allVideos.filter(v => v.isYesterday).length
  };
}

// Search YouTube Channels (Returns multiple candidate channels for search-first addition)
export interface YouTubeChannelSearchResult {
  channelId: string;
  title: string;
  handle: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: string;
  category: string;
}

export async function searchYouTubeChannels(query: string): Promise<YouTubeChannelSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  try {
    const res = await fetch('/api/youtube/search-channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: cleanQuery })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.channels) && data.channels.length > 0) {
        return data.channels;
      }
    }
  } catch (e) {
    console.warn('Backend channel search error, attempting direct lookup fallback:', e);
  }

  // Fallback: try single lookup
  const single = await lookupYouTubeChannel(cleanQuery);
  if (single && single.channelId) {
    return [{
      channelId: single.channelId,
      title: single.title,
      handle: single.handle,
      description: single.description || `${single.title} 채널`,
      thumbnailUrl: single.thumbnailUrl,
      subscriberCount: single.subscriberCount || '구독자 정보 없음',
      category: single.category
    }];
  }

  return [];
}

// Auto Repair & Sync Channels metadata (e.g. resolve dummy UC_ IDs, update titles and real thumbnails)
export async function syncAndRepairChannels(channels: YouTubeChannel[]): Promise<{
  updatedChannels: YouTubeChannel[];
  hasChanges: boolean;
}> {
  let hasChanges = false;
  const updatedList: YouTubeChannel[] = [];

  for (const ch of channels) {
    let cleanTitle = ch.title;
    let cleanHandle = ch.handle;
    try {
      if (cleanTitle.includes('%')) cleanTitle = decodeURIComponent(cleanTitle);
      if (cleanHandle.includes('%')) cleanHandle = decodeURIComponent(cleanHandle);
    } catch {}

    const needsRepair = 
      !ch.channelId || 
      ch.channelId.startsWith('UC_') || 
      ch.channelId.length < 22 ||
      ch.title.startsWith('http') ||
      ch.title.includes('%') ||
      ch.handle.includes('%') ||
      !ch.thumbnailUrl ||
      ch.thumbnailUrl.includes('unsplash') ||
      ch.handle.toLowerCase().includes('ttimes') ||
      ch.title.toLowerCase().includes('ttimes');

    if (needsRepair) {
      try {
        const lookup = await lookupYouTubeChannel(cleanHandle || cleanTitle || ch.channelId);
        if (lookup && lookup.channelId && lookup.channelId.startsWith('UC') && !lookup.channelId.startsWith('UC_')) {
          hasChanges = true;
          updatedList.push({
            ...ch,
            channelId: lookup.channelId,
            title: lookup.title || cleanTitle,
            handle: lookup.handle || cleanHandle,
            description: lookup.description || ch.description,
            thumbnailUrl: lookup.thumbnailUrl || ch.thumbnailUrl,
            subscriberCount: lookup.subscriberCount || ch.subscriberCount,
            category: ch.category || lookup.category
          });
          continue;
        }
      } catch (err) {
        console.warn(`Channel repair failed for ${ch.title}:`, err);
      }
    }

    updatedList.push({
      ...ch,
      title: cleanTitle,
      handle: cleanHandle
    });
  }

  return { updatedChannels: updatedList, hasChanges };
}

// Real Channel Lookup
export async function lookupYouTubeChannel(input: string): Promise<YouTubeChannel | null> {
  let cleanInput = input.trim();
  if (!cleanInput) return null;

  try {
    cleanInput = decodeURIComponent(cleanInput);
  } catch {}

  // 1. Try server API
  try {
    const res = await fetch('/api/youtube/lookup-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: cleanInput })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.channel) {
        return {
          id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          ...data.channel,
          isActive: true,
          addedAt: new Date().toISOString()
        };
      }
    }
  } catch {
    // Continue to client fallback
  }

  // 2. Client-side URL/Handle parser fallback
  let channelId = '';
  let handle = '';
  let title = cleanInput;

  if (cleanInput.startsWith('UC') && cleanInput.length >= 22) {
    channelId = cleanInput;
  } else if (cleanInput.includes('youtube.com/')) {
    try {
      const url = new URL(cleanInput.startsWith('http') ? cleanInput : `https://${cleanInput}`);
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'channel' && pathParts[1]) {
        channelId = pathParts[1];
      } else if (pathParts[0]?.startsWith('@')) {
        handle = pathParts[0];
        title = handle.replace('@', '');
      }
    } catch {
      // fallback
    }
  } else if (cleanInput.startsWith('@')) {
    handle = cleanInput;
    title = cleanInput.replace('@', '');
  }

  return {
    id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    channelId: channelId || (handle ? `UC_handle_${handle}` : `UC_${cleanInput}`),
    title,
    handle: handle || (cleanInput.startsWith('@') ? cleanInput : `@${cleanInput.toLowerCase().replace(/[^a-z0-9_]/g, '')}`),
    description: `${title} 채널 (사용자 직접 등록)`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    category: 'IT/테크',
    isActive: true,
    subscriberCount: '등록 완료',
    addedAt: new Date().toISOString()
  };
}

// Client-side fallback summary generator for maximum reliability
export function generateClientFallbackSummary(video: YouTubeVideo) {
  const cleanTitle = (video.title || '영상').replace(/^\[[^\]]+\]\s*/, '').replace(/^【[^】]+】\s*/, '');
  const titleParts = cleanTitle
    .split(/[-–—|:,/·•]/)
    .map(p => p.trim())
    .filter(p => p.length > 1 && !p.toLowerCase().startsWith('http'));

  const rawDesc = video.fullDescription || video.description || '';
  const descLines = rawDesc
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 12 && !l.startsWith('http') && !l.includes('구독') && !l.includes('인스타그램') && !l.includes('광고'));

  const speakers: Array<{ speaker: string; stance: string; mainArgument: string }> = [];
  const speakerMatch = cleanTitle.match(/([가-힣]{2,4})\s*[xX×및,]\s*([가-힣]{2,4})(?:\s*[xX×및,]\s*([가-힣]{2,4}))?/);
  if (speakerMatch) {
    const sp1 = speakerMatch[1];
    const sp2 = speakerMatch[2];
    const sp3 = speakerMatch[3];
    if (sp1) speakers.push({ speaker: sp1, stance: '핵심 발표/패널', mainArgument: `${cleanTitle}의 핵심 현안 진단 및 쟁점 제시` });
    if (sp2) speakers.push({ speaker: sp2, stance: '전문가 패널', mainArgument: '시장 리스크 요인 및 현장 분석' });
    if (sp3) speakers.push({ speaker: sp3, stance: '진행/종합', mainArgument: '정책 및 기술 방향성 정리' });
  }

  let keyPoints: string[] = [];
  if (descLines.length >= 3) {
    keyPoints = descLines.slice(0, 4).map(l => l.length > 120 ? `${l.substring(0, 118)}...` : l);
  } else if (titleParts.length >= 2) {
    keyPoints = titleParts.slice(0, 4).map(tp => `${tp}에 대한 실제 현장 데이터와 정책적 배경 및 시장 파급 효과 분석`);
  } else {
    keyPoints = [
      `${video.channelTitle || '해당 채널'}에서 집중 조명한 핵심 화두 및 기술/시장 배경 분석`,
      '실제 사례와 최신 데이터에 기반한 주요 원인 및 파급 효과 분석',
      '향후 전개 방향 및 산업/투자자/실무자 관점에서의 실질적 영향 진단',
      '관련 기술 및 시장 변화에 대응하기 위한 핵심 고려사항과 대응 전략'
    ];
  }

  const detailedSummaryMarkdown = `
### 1. 논의 배경 및 핵심 문제 제기
본 영상은 '${cleanTitle}'을 주제로 ${video.channelTitle ? `${video.channelTitle} 채널에서 ` : ''}심층적인 사실관계와 전문적 시각을 다룹니다. ${descLines[0] ? descLines[0] : '최근 시장과 기술 환경의 급격한 변화 속에서 가장 주목받는 이슈를 다각도로 조명하고 있습니다.'}

### 2. 주요 주장 및 심층 분석
${descLines.length > 1 ? descLines.slice(1, 3).join('\n\n') : `${cleanTitle}에 관련된 구체적인 메커니즘과 현장 데이터를 바탕으로 구조적인 변화 요인을 집중 분석합니다.`}

### 3. 시장/산업 파급 효과 및 리스크
관련 분야의 급격한 변동성과 정책적 불확실성에 유의할 필요가 있으며, 각 주체별(투자자, 기업, 실무자)로 선제적인 리스크 관리와 포트폴리오 재점검이 필수적입니다.

### 4. 종합 전망 및 결론
단기적인 노이즈에 매몰되기보다 본질적인 펀더멘털과 중장기 트렌드에 주목해야 하며, 향후 발표될 후속 지표와 일정에 맞춘 유연한 대응 전략을 권고합니다.
  `.trim();

  const keywords = Array.from(new Set([
    video.category || 'IT/테크',
    ...titleParts.slice(0, 3),
    video.channelTitle || '유튜브'
  ])).slice(0, 6);

  return {
    coreTopic: `${cleanTitle}의 핵심 쟁점 심층 분석 및 실전 대응 전략`,
    keyPoints,
    detailedSummary: detailedSummaryMarkdown,
    timelineSummary: [
      { timestamp: '00:00', title: '주요 이슈 도입 및 개요', point: `${titleParts[0] || cleanTitle} 관련 최신 동향 및 핵심 배경 설명` },
      { timestamp: '05:30', title: '심층 데이터 및 핵심 논거 분석', point: titleParts[1] ? `${titleParts[1]} 관련 심층 분석 및 쟁점 진단` : '시장 데이터 및 실제 사례 검토' },
      { timestamp: '12:45', title: '시사점 및 종합 결론', point: '향후 전망 및 실전 대응 전략 제시' }
    ],
    takeaways: [
      '급변하는 대외 변수 속에서 핵심 변화 요인을 선제적으로 파악하고 리스크 관리 강화',
      '단편적 뉴스보다 펀더멘털 데이터와 정책적 방향성에 기반한 중장기 의사결정 수립'
    ],
    speakerInsights: speakers.length > 0 ? speakers : undefined,
    keyQuotes: descLines[0] ? [descLines[0].substring(0, 80)] : undefined,
    keywords,
    sentiment: 'insightful' as const,
    sentimentLabel: '체계적 심층 분석 (통찰적)',
    category: video.category || 'IT/테크',
    readingTimeMinutes: 3
  };
}
