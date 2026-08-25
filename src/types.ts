export type VideoCategory = string;

export interface YouTubeChannel {
  id: string;
  channelId: string; // e.g. UCxxxxxxxx
  title: string;
  handle: string; // e.g. @shukaworld
  description?: string;
  thumbnailUrl: string;
  category: VideoCategory;
  isActive: boolean;
  subscriberCount?: string;
  customUrl?: string;
  addedAt: string;
}

export interface VideoSummary {
  coreTopic: string; // 핵심 주제
  keyPoints: string[]; // 주요 포인트 목록
  detailedSummary: string; // 상세 맥락 요약 (Markdown 지원)
  timelineSummary?: { timestamp: string; title: string; point: string }[];
  takeaways: string[]; // 시사점 및 액션 플랜
  keywords: string[]; // 핵심 키워드
  sentiment: 'positive' | 'neutral' | 'caution' | 'insightful';
  sentimentLabel: string;
  targetAudience?: string;
  readingTimeMinutes: number;
  speakerInsights?: { speaker: string; stance?: string; mainArgument: string }[];
  discussionHighlights?: string[];
  keyQuotes?: string[];
  transcriptAvailable?: boolean;
}

export interface YouTubeVideo {
  id: string;
  videoId: string;
  channelId: string;
  channelTitle: string;
  channelThumbnail?: string;
  title: string;
  description: string;
  fullDescription?: string;
  transcript?: string;
  thumbnailUrl: string;
  publishedAt: string; // ISO string
  duration?: string;
  viewCount?: number;
  videoUrl: string;
  category: VideoCategory;
  isYesterday: boolean;
  isWithin24h?: boolean;
  isToday?: boolean;
  relativeTimeText?: string;
  isSummarized: boolean;
  isBookmarked?: boolean;
  summary?: VideoSummary;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  reportDate: string; // YYYY-MM-DD
  title: string;
  executiveSummary: string;
  totalVideosAnalyzed: number;
  channelsCount: number;
  topTrends: {
    topic: string;
    category: VideoCategory;
    description: string;
    relatedVideoTitles: string[];
  }[];
  keyTakeaways: string[];
  categoryBreakdown: { category: VideoCategory; count: number; percentage: number }[];
  recommendedActions: string[];
  createdAt: string;
}

export interface AppSettings {
  summaryDetailLevel: 'concise' | 'standard' | 'in-depth';
  preferredLanguage: 'ko' | 'en';
  autoAnalyzeNewVideos: boolean;
  defaultExportFormat: 'markdown' | 'txt' | 'doc' | 'csv' | 'xlsx';
  includeTimelineInSummary: boolean;
  channels: YouTubeChannel[];
}

export type ActiveTab = 'dashboard' | 'analytics' | 'settings';

export interface FilterState {
  category: string; // 'ALL' or specific category
  channelId: string; // 'ALL' or specific channel
  dateFilter: '24hours' | 'yesterday' | 'today' | 'recent3days' | 'recent7days' | 'all';
  searchQuery: string;
  statusFilter: 'all' | 'summarized' | 'unsummarized' | 'bookmarked';
}
