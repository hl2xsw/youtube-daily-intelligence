export type VideoCategory = 
  | 'IT/테크'
  | '경제/재테크'
  | '비즈니스/스타트업'
  | '과학/지식'
  | '뉴스/시사'
  | '자기계발/교육'
  | '라이프/엔터'
  | '기타';

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
  detailedSummary: string; // 상세 요약
  timelineSummary?: { timestamp: string; title: string; point: string }[];
  takeaways: string[]; // 시사점 및 액션 플랜
  keywords: string[]; // 핵심 키워드
  sentiment: 'positive' | 'neutral' | 'caution' | 'insightful';
  sentimentLabel: string;
  targetAudience?: string;
  readingTimeMinutes: number;
}

export interface YouTubeVideo {
  id: string;
  videoId: string;
  channelId: string;
  channelTitle: string;
  channelThumbnail?: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string; // ISO string
  duration?: string;
  viewCount?: number;
  videoUrl: string;
  category: VideoCategory;
  isYesterday: boolean;
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
  dateFilter: 'yesterday' | 'today' | 'recent3days' | 'recent7days' | 'all';
  searchQuery: string;
  statusFilter: 'all' | 'summarized' | 'unsummarized' | 'bookmarked';
}
