import { YouTubeChannel, YouTubeVideo, VideoCategory } from '../types';

// Helper to determine if a video was published within the past 24 hours
export function checkIsWithin24h(pubDateStr: string): boolean {
  try {
    const pubDate = new Date(pubDateStr);
    const now = new Date();
    const diffHours = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24 && diffHours >= -1;
  } catch {
    return false;
  }
}

// Helper to determine if a video was published "yesterday" (within past 24-48 hours / yesterday in local date)
export function checkIsYesterday(pubDateStr: string): boolean {
  try {
    const pubDate = new Date(pubDateStr);
    const now = new Date();
    
    // Check calendar day difference
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    const pubTime = pubDate.getTime();
    if (pubTime >= startOfYesterday.getTime() && pubTime < startOfToday.getTime()) {
      return true;
    }

    // Also consider relative hours (between 10 and 48 hours ago)
    const diffHours = (now.getTime() - pubTime) / (1000 * 60 * 60);
    return diffHours >= 10 && diffHours <= 48;
  } catch {
    return false;
  }
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
      const isYesterday = checkIsYesterday(publishedAt);
      const isWithin24h = checkIsWithin24h(publishedAt);

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
        isYesterday,
        isWithin24h,
        isSummarized: false,
        viewCount,
        createdAt: publishedAt
      });
    }
  }

  return videos;
}

// Fetch Channel Videos via RSS (with server API + client CORS proxy fallbacks)
export async function fetchRealChannelVideos(channel: YouTubeChannel): Promise<YouTubeVideo[]> {
  if (!channel.channelId || !channel.channelId.startsWith('UC')) {
    return [];
  }

  // 1. Try server-side proxy API if running in fullstack mode
  try {
    const res = await fetch('/api/youtube/fetch-rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: channel.channelId,
        channelTitle: channel.title,
        category: channel.category
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.videos) && data.videos.length > 0) {
        return data.videos.map((v: any) => ({
          ...v,
          channelTitle: channel.title,
          channelThumbnail: channel.thumbnailUrl || v.channelThumbnail,
          category: channel.category,
          isYesterday: checkIsYesterday(v.publishedAt),
          isWithin24h: checkIsWithin24h(v.publishedAt)
        }));
      }
    }
  } catch {
    // Continue to client-side fallback
  }

  // 2. Client-side CORS proxy fallback (for static GitHub Pages hosting)
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

// Real Channel Lookup
export async function lookupYouTubeChannel(input: string): Promise<YouTubeChannel | null> {
  const cleanInput = input.trim();
  if (!cleanInput) return null;

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
