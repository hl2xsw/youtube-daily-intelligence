import { YouTubeChannel, YouTubeVideo, DailyReport, AppSettings } from '../types';
import { DEFAULT_CHANNELS } from '../data/defaultChannels';

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
    return JSON.parse(raw);
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
      // Strictly purge any legacy mock/fake videos
      const realOnly = parsed.filter(v => 
        v && 
        typeof v.videoId === 'string' && 
        isRealYouTubeVideoId(v.videoId) &&
        !v.id?.startsWith('vid-') &&
        !v.videoId.includes('shuka_') &&
        !v.videoId.includes('jocoding_') &&
        !v.videoId.includes('mock')
      );
      if (realOnly.length !== parsed.length) {
        saveVideos(realOnly);
      }
      return realOnly;
    }
    return [];
  } catch (e) {
    console.error('Failed to load videos', e);
    return [];
  }
}

export function saveVideos(videos: YouTubeVideo[]): void {
  try {
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
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
