import { YouTubeChannel, YouTubeVideo, DailyReport, AppSettings } from '../types';
import { DEFAULT_CHANNELS } from '../data/defaultChannels';
import { calculateVideoTimeStatus } from './youtubeService';

const CHANNELS_KEY = 'yt_summary_channels_v1';
const VIDEOS_KEY = 'yt_summary_videos_v1';
const REPORTS_KEY = 'yt_summary_reports_v1';
const SETTINGS_KEY = 'yt_summary_settings_v1';
const CATEGORIES_KEY = 'yt_summary_categories_v1';

export const DEFAULT_CATEGORIES: string[] = [
  'IT/테크',
  '경제/재테크',
  '비즈니스/스타트업',
  '과학/지식',
  '뉴스/시사',
  '자기계발/교육',
  '라이프/엔터',
  '기타'
];

export const DEFAULT_SETTINGS: AppSettings = {
  summaryDetailLevel: 'standard',
  preferredLanguage: 'ko',
  autoAnalyzeNewVideos: true,
  defaultExportFormat: 'markdown',
  includeTimelineInSummary: true,
  channels: DEFAULT_CHANNELS
};

export function loadChannels(): YouTubeChannel[] {
  try {
    const raw = localStorage.getItem(CHANNELS_KEY);
    if (!raw) {
      saveChannels(DEFAULT_CHANNELS);
      return DEFAULT_CHANNELS;
    }
    const parsed: YouTubeChannel[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      let hasChanges = false;
      const cleaned = parsed.map(ch => {
        let title = ch.title || '';
        let handle = ch.handle || '';
        let channelId = ch.channelId || '';
        let thumbnailUrl = ch.thumbnailUrl || '';
        let category = ch.category || '기타';
        let subscriberCount = ch.subscriberCount || '등록 완료';

        // Auto decode URI components (e.g. %EA%B2%BD...)
        if (title.includes('%')) {
          try { title = decodeURIComponent(title); hasChanges = true; } catch {}
        }
        if (handle.includes('%')) {
          try { handle = decodeURIComponent(handle); hasChanges = true; } catch {}
        }

        // 삼프로TV specific heal
        if (
          title.includes('삼프로') || 
          handle.includes('sampro') || 
          handle.includes('3pro') ||
          channelId === 'UChLrzhoZhnngiCE0n6P97vg'
        ) {
          if (channelId !== 'UChlv4GSd7OQl3js-jkLOnFA') {
            channelId = 'UChlv4GSd7OQl3js-jkLOnFA';
            hasChanges = true;
          }
          if (title !== '삼프로TV 3PROTV') {
            title = '삼프로TV 3PROTV';
            hasChanges = true;
          }
          if (handle !== '@3protv') {
            handle = '@3protv';
            hasChanges = true;
          }
          thumbnailUrl = 'https://yt3.googleusercontent.com/ytc/AIdro_n4L5P-s8v=s900-c-k-c0x00ffffff-no-rj';
          category = '경제/재테크';
          subscriberCount = '250만명';
        }

        // TTimesTV specific heal
        if (
          title.toLowerCase().includes('ttimes') || 
          title.includes('티타임즈') || 
          handle.toLowerCase().includes('ttimestv') ||
          channelId === 'UCelFN6fJ6OY6v8pbc_SLiXA'
        ) {
          if (channelId !== 'UCelFN6fJ6OY6v8pbc_SLiXA') {
            channelId = 'UCelFN6fJ6OY6v8pbc_SLiXA';
            hasChanges = true;
          }
          if (title === 'TTimesTV' || title === '@TTimesTV' || !title) {
            title = '티타임즈TV';
            hasChanges = true;
          }
          if (handle !== '@TTimesTV') {
            handle = '@TTimesTV';
            hasChanges = true;
          }
          if (!thumbnailUrl || thumbnailUrl.includes('unsplash')) {
            thumbnailUrl = 'https://yt3.googleusercontent.com/ytc/AIdro_lk_PZbzPbJP9ZNfuzPC0U8_Q2dafVkwKhoNGi_G2pcjg=s900-c-k-c0x00ffffff-no-rj';
            hasChanges = true;
          }
          if (!ch.description || ch.description.includes('사용자 직접 등록')) {
            ch.description = '세상의 혁신과 비즈니스, 테크 트렌드를 가장 깊이 있게 분석하는 티타임즈TV 공식 채널';
            hasChanges = true;
          }
          category = '비즈니스/스타트업';
          subscriberCount = '35.5만명';
        }

        // 경읽남 / 김광석TV specific heal
        if (
          title.includes('경읽남') || 
          title.includes('김광석') || 
          handle.includes('경읽남') ||
          handle.includes('김광석') ||
          channelId === 'UC3pfEoxaRDT6hvZZjpHu7Tg'
        ) {
          if (channelId !== 'UC3pfEoxaRDT6hvZZjpHu7Tg') {
            channelId = 'UC3pfEoxaRDT6hvZZjpHu7Tg';
            hasChanges = true;
          }
          title = '경제 읽어주는 남자(김광석TV)';
          handle = '@경읽남_김광석TV';
          thumbnailUrl = 'https://yt3.googleusercontent.com/Tai2Mxx-1IWzJ6EyiRDAQfp5c3ZAV_A_jNk7ESsTmrhk2Ju7b8xecJ35HVTcaCSB98392kxxydc=s900-c-k-c0x00ffffff-no-rj';
          category = '경제/재테크';
          subscriberCount = '51.7만명';
          hasChanges = true;
        }

        // Unrealscience / 안될과학 specific heal
        if (
          title.includes('안될과학') || 
          handle.includes('unreal') || 
          channelId === 'UCaAmw_tXQOq6n2yP8vDqFSw'
        ) {
          if (channelId !== 'UCMc4EmuDxnHPc6pgGW-QWvQ') {
            channelId = 'UCMc4EmuDxnHPc6pgGW-QWvQ';
            hasChanges = true;
          }
          title = '안될과학 Unrealscience';
          handle = '@unrealscience';
          category = '과학/지식';
          subscriberCount = '115만명';
          hasChanges = true;
        }

        // EO 이오 specific heal
        if (
          title.toLowerCase().includes('eo') || 
          title.includes('이오') || 
          handle.toLowerCase().includes('eoeoeo') ||
          channelId === 'UC6tTZ_yP_Kx6kHjU3_oE1sQ'
        ) {
          if (channelId !== 'UC5WXrNWV1Z8UqrBqYEMwvFg') {
            channelId = 'UC5WXrNWV1Z8UqrBqYEMwvFg';
            hasChanges = true;
          }
          title = 'EO 이오';
          handle = '@eoeoeo';
          category = '비즈니스/스타트업';
          subscriberCount = '68만명';
          hasChanges = true;
        }

        // 테크몽 Techmong specific heal
        if (
          title.includes('테크몽') || 
          handle.toLowerCase().includes('techmong') || 
          channelId === 'UCe_P1k1G1zI0Nf_F7dKqT0w'
        ) {
          if (channelId !== 'UCFX6adXoyQKxft933NB3rmA') {
            channelId = 'UCFX6adXoyQKxft933NB3rmA';
            hasChanges = true;
          }
          title = '테크몽 Techmong';
          handle = '@techmong';
          category = 'IT/테크';
          subscriberCount = '75만명';
          hasChanges = true;
        }

        // 1분만 specific heal
        if (
          title.includes('1분만') || 
          handle.toLowerCase().includes('1minonly') || 
          channelId === 'UCkglhL_29gGqP_lA7b52dJQ'
        ) {
          if (channelId !== 'UCM31rBPQdifQKUmBKtwVqBg') {
            channelId = 'UCM31rBPQdifQKUmBKtwVqBg';
            hasChanges = true;
          }
          title = '1분만';
          handle = '@1minonly';
          category = '과학/지식';
          subscriberCount = '135만명';
          hasChanges = true;
        }

        // 한국경제TV specific heal
        if (
          title.includes('한국경제') || 
          handle.includes('한국경제')
        ) {
          if (channelId !== 'UCF8AeLlUbEpKju6v1H6p8Eg') {
            channelId = 'UCF8AeLlUbEpKju6v1H6p8Eg';
            hasChanges = true;
          }
          title = '한국경제TV';
          handle = '@한국경제TV';
          category = '뉴스/시사';
          subscriberCount = '110만명';
          hasChanges = true;
        }

        return {
          ...ch,
          channelId,
          title,
          handle,
          thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          category,
          subscriberCount
        };
      });

      if (hasChanges) {
        saveChannels(cleaned);
      }
      return cleaned;
    }
    return DEFAULT_CHANNELS;
  } catch (e) {
    console.error('Failed to load channels', e);
    return DEFAULT_CHANNELS;
  }
}

export function saveChannels(channels: YouTubeChannel[]): void {
  try {
    localStorage.setItem(CHANNELS_KEY, JSON.stringify(channels));
  } catch (e) {
    console.error('Failed to save channels', e);
  }
}

export function isRealYouTubeVideoId(id: string): boolean {
  // Real YouTube video IDs are 11 characters alphanumeric and _ -
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

export function loadVideos(): YouTubeVideo[] {
  try {
    const raw = localStorage.getItem(VIDEOS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const nowEpoch = Date.now();
      // Keep real YouTube videos within 30 days (720 hours) and calculate fresh time status
      const validOnly = parsed
        .filter(v => {
          if (!v || typeof v.videoId !== 'string' || !isRealYouTubeVideoId(v.videoId)) return false;
          if (v.id?.startsWith('vid-') || v.videoId.includes('shuka_') || v.videoId.includes('jocoding_') || v.videoId.includes('mock')) return false;
          
          const pubTime = new Date(v.publishedAt || v.createdAt || 0).getTime();
          const diffHours = (nowEpoch - pubTime) / (1000 * 60 * 60);
          return diffHours >= -0.5 && diffHours <= 720.0;
        })
        .map(v => {
          const timeStatus = calculateVideoTimeStatus(v.publishedAt || v.createdAt || new Date().toISOString(), nowEpoch);
          return {
            ...v,
            isWithin24h: timeStatus.isWithin24h,
            isToday: timeStatus.isToday,
            isYesterday: timeStatus.isYesterday,
            relativeTimeText: timeStatus.relativeTimeText || v.relativeTimeText
          };
        });

      if (validOnly.length !== parsed.length) {
        saveVideos(validOnly);
      }
      return validOnly;
    }
    return [];
  } catch (e) {
    console.error('Failed to load videos', e);
    return [];
  }
}

export function saveVideos(videos: YouTubeVideo[]): void {
  try {
    const nowEpoch = Date.now();
    // Retain up to 30 days to allow comprehensive date filtering (today, 24h, yesterday, recent 3/7/30 days)
    const filtered = videos.filter(v => {
      if (!v || typeof v.videoId !== 'string') return false;
      const pubTime = new Date(v.publishedAt || v.createdAt || 0).getTime();
      const diffHours = (nowEpoch - pubTime) / (1000 * 60 * 60);
      return diffHours >= -0.5 && diffHours <= 720.0;
    });
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save videos', e);
  }
}

export function loadReports(): DailyReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load reports', e);
    return [];
  }
}

export function saveReports(reports: DailyReport[]): void {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch (e) {
    console.error('Failed to save reports', e);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load settings', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadCategories(): string[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) {
      saveCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_CATEGORIES;
  } catch (e) {
    console.error('Failed to load categories', e);
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: string[]): void {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories', e);
  }
}

export function resetAllData(): void {
  localStorage.removeItem(CHANNELS_KEY);
  localStorage.removeItem(VIDEOS_KEY);
  localStorage.removeItem(REPORTS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(CATEGORIES_KEY);
  saveChannels(DEFAULT_CHANNELS);
  saveVideos([]);
  saveSettings(DEFAULT_SETTINGS);
  saveCategories(DEFAULT_CATEGORIES);
}
