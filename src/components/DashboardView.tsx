import React, { useState, useMemo } from 'react';
import { YouTubeVideo, VideoCategory, YouTubeChannel, FilterState } from '../types';
import { calculateVideoTimeStatus } from '../utils/youtubeService';
import { VideoCard } from './VideoCard';
import { 
  Sparkles, 
  Download, 
  Filter, 
  Search, 
  LayoutGrid, 
  List, 
  Calendar, 
  Tv2, 
  CheckCircle2, 
  Clock, 
  Bookmark,
  FileSpreadsheet,
  FileCode,
  Layers,
  RotateCcw,
  RefreshCw,
  ArrowUpDown,
  Flame,
  ArrowRight,
  Globe
} from 'lucide-react';
import { generateBatchMarkdown, downloadFile } from '../utils/exportUtils';
import { useToast } from './Toast';

interface DashboardViewProps {
  videos: YouTubeVideo[];
  channels: YouTubeChannel[];
  categories?: string[];
  onOpenDetail: (video: YouTubeVideo) => void;
  onToggleBookmark: (videoId: string) => void;
  onReanalyze: (video: YouTubeVideo) => void;
  onBatchAnalyzeYesterday: () => void;
  onRefreshAndSummarize24h: () => void;
  onOpenExportModal: () => void;
  onQuickAnalyze?: (input: string) => Promise<void>;
  onOpenVideoSearch?: (initialQuery?: string) => void;
  isBatchAnalyzing: boolean;
  isProcessing?: boolean;
  isQuickAnalyzing?: boolean;
  analyzingVideoId: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  videos,
  channels,
  categories = ['IT/테크', '경제/재테크', '비즈니스/스타트업', '과학/지식', '뉴스/시사', '자기계발/교육', '라이프/엔터', '기타'],
  onOpenDetail,
  onToggleBookmark,
  onReanalyze,
  onBatchAnalyzeYesterday,
  onRefreshAndSummarize24h,
  onOpenExportModal,
  onQuickAnalyze,
  onOpenVideoSearch,
  isBatchAnalyzing,
  isProcessing = false,
  isQuickAnalyzing = false,
  analyzingVideoId
}) => {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [quickInput, setQuickInput] = useState('');

  const categoryFilterList = useMemo(() => {
    return [
      { label: '전체', value: 'ALL' },
      ...categories.map(cat => ({ label: cat, value: cat }))
    ];
  }, [categories]);

  // Filters State - Default to 24hours / yesterday if available, else 'all'
  const [filters, setFilters] = useState<FilterState>({
    category: 'ALL',
    channelId: 'ALL',
    dateFilter: '24hours',
    searchQuery: '',
    statusFilter: 'all'
  });

  // Calculate quick metrics with precise 24h/today/yesterday evaluation
  const todayVideos = useMemo(() => {
    const now = Date.now();
    return videos.filter(v => {
      const status = calculateVideoTimeStatus(v.publishedAt, now);
      return status.isToday || v.isToday;
    });
  }, [videos]);

  const within24hVideos = useMemo(() => {
    const now = Date.now();
    return videos.filter(v => {
      const status = calculateVideoTimeStatus(v.publishedAt, now);
      return status.isWithin24h || v.isWithin24h;
    });
  }, [videos]);

  const yesterdayVideos = useMemo(() => {
    const now = Date.now();
    return videos.filter(v => {
      const status = calculateVideoTimeStatus(v.publishedAt, now);
      return status.isYesterday || v.isYesterday;
    });
  }, [videos]);

  const recent3DaysVideos = useMemo(() => {
    const now = Date.now();
    return videos.filter(v => {
      const pubTime = new Date(v.publishedAt || v.createdAt || 0).getTime();
      const diffHours = (now - pubTime) / (1000 * 60 * 60);
      return diffHours <= 72.0;
    });
  }, [videos]);

  const summarizedCount = useMemo(() => videos.filter(v => v.isSummarized).length, [videos]);
  const activeChannelsCount = useMemo(() => channels.filter(c => c.isActive).length, [channels]);

  // Top Key Topics across summarized today/24h videos
  const topKeyPoints = useMemo(() => {
    const activeVids = within24hVideos.filter(v => v.isSummarized && v.summary);
    const points: { video: YouTubeVideo; text: string; channel: string }[] = [];
    for (const v of activeVids) {
      if (v.summary?.keyPoints && v.summary.keyPoints.length > 0) {
        points.push({
          video: v,
          text: v.summary.keyPoints[0],
          channel: v.channelTitle
        });
      }
      if (points.length >= 3) break;
    }
    return points;
  }, [within24hVideos]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) {
      showToast('분석할 유튜브 URL 또는 키워드를 입력해주세요.', 'info');
      return;
    }
    if (onQuickAnalyze) {
      onQuickAnalyze(quickInput.trim());
      setQuickInput('');
    }
  };

  // Helper for multi-token Hangul/English search matching
  const matchSearchQuery = (video: YouTubeVideo, query: string): boolean => {
    const cleanQ = query.trim().toLowerCase();
    if (!cleanQ) return true;

    const tokens = cleanQ.split(/\s+/).filter(t => t.length > 0);
    const searchableText = [
      video.title,
      video.channelTitle,
      video.summary?.coreTopic || '',
      ...(video.summary?.keywords || []),
      ...(video.summary?.keyPoints || []),
      video.summary?.detailedSummary || '',
      ...(video.summary?.takeaways || []),
      video.description || '',
      video.fullDescription || '',
      video.category || ''
    ].join(' ').toLowerCase();

    return tokens.every(token => searchableText.includes(token));
  };

  // Filtered Videos
  const filteredVideos = useMemo(() => {
    const now = Date.now();
    return videos.filter(video => {
      // Category filter
      if (filters.category !== 'ALL' && video.category !== filters.category) {
        return false;
      }

      // Channel filter
      if (filters.channelId !== 'ALL' && video.channelId !== filters.channelId) {
        return false;
      }

      // Date filter with dynamic status check
      const timeStatus = calculateVideoTimeStatus(video.publishedAt, now);
      const isWithin24 = timeStatus.isWithin24h || video.isWithin24h;
      const isTod = timeStatus.isToday || video.isToday;
      const isYest = timeStatus.isYesterday || video.isYesterday;

      if (filters.dateFilter === 'today') {
        if (!isTod) return false;
      } else if (filters.dateFilter === '24hours') {
        if (!isWithin24) return false;
      } else if (filters.dateFilter === 'yesterday') {
        if (!isYest) return false;
      } else if (filters.dateFilter === 'recent3days') {
        if (timeStatus.diffHours > 72.0) return false;
      } else if (filters.dateFilter === 'recent7days') {
        if (timeStatus.diffHours > 168.0) return false;
      }

      // Status filter
      if (filters.statusFilter === 'summarized' && !video.isSummarized) return false;
      if (filters.statusFilter === 'unsummarized' && video.isSummarized) return false;
      if (filters.statusFilter === 'bookmarked' && !video.isBookmarked) return false;

      // Search Query
      if (filters.searchQuery.trim()) {
        if (!matchSearchQuery(video, filters.searchQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [videos, filters]);

  // Check how many videos in ALL collection match search query (ignoring date filter)
  const allTimeSearchMatchesCount = useMemo(() => {
    if (!filters.searchQuery.trim()) return 0;
    return videos.filter(video => {
      if (filters.category !== 'ALL' && video.category !== filters.category) return false;
      if (filters.channelId !== 'ALL' && video.channelId !== filters.channelId) return false;
      return matchSearchQuery(video, filters.searchQuery);
    }).length;
  }, [videos, filters.searchQuery, filters.category, filters.channelId]);

  // Quick download of all yesterday/24h summaries in markdown
  const handleDownloadYesterdayBatch = () => {
    const targetVideos = filteredVideos.length > 0 ? filteredVideos : videos;
    if (targetVideos.length === 0) {
      showToast('저장할 영상이 없습니다.', 'info');
      return;
    }
    const dateStr = new Date().toISOString().split('T')[0];
    const md = generateBatchMarkdown(targetVideos, `${dateStr} 유튜브 핵심 요약집`);
    downloadFile(`유튜브_영상_핵심요약집_${dateStr}.md`, md, 'text/markdown;charset=utf-8');
    showToast(`영상 ${targetVideos.length}건의 일괄 요약집(.md)이 저장되었습니다.`, 'success');
  };

  const resetFilters = () => {
    setFilters({
      category: 'ALL',
      channelId: 'ALL',
      dateFilter: 'all',
      searchQuery: '',
      statusFilter: 'all'
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Quick KPI Statistics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Today Videos */}
        <div 
          onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'today' }))}
          className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center gap-3.5 ${
            filters.dateFilter === 'today'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <Flame className="w-5 h-5 text-emerald-600 fill-emerald-600" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-950">오늘(당일) 업로드</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-emerald-950">{todayVideos.length}</span>
              <span className="text-xs text-emerald-700 font-medium">개 감지</span>
            </div>
          </div>
        </div>

        {/* Metric 2: 24h Videos */}
        <div 
          onClick={() => setFilters(prev => ({ ...prev, dateFilter: '24hours' }))}
          className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center gap-3.5 ${
            filters.dateFilter === '24hours'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <Tv2 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">최근 24시간 영상</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">{within24hVideos.length}</span>
              <span className="text-xs text-slate-500">개 감지</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Yesterday Videos */}
        <div 
          onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'yesterday' }))}
          className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center gap-3.5 ${
            filters.dateFilter === 'yesterday'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Clock className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">전일(어제) 업로드</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">{yesterdayVideos.length}</span>
              <span className="text-xs text-slate-500">개 확인</span>
            </div>
          </div>
        </div>

        {/* Metric 4: AI Summarized Count */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">AI 요약 완료</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">{summarizedCount}</span>
              <span className="text-xs text-slate-500">/ {videos.length}개 ({videos.length ? Math.round((summarizedCount / videos.length) * 100) : 0}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Batch Action Bar */}
      <div className="bg-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1">
              <Flame className="w-3 h-3 text-emerald-400 fill-emerald-400" />
              실시간 당일 및 24H 전용
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              오늘 & 24시간 실시간 영상 동기화 및 Gemini AI 요약
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            등록된 채널의 실시간 최신 영상(방금 전, 수시간 전, 오늘 및 전일 영상)을 즉시 수집하고 Gemini 2.5 AI로 핵심 요약합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Unified 24H Refresh & AI Summary Button */}
          <button
            id="search-24h-btn"
            onClick={onRefreshAndSummarize24h}
            disabled={isProcessing || isBatchAnalyzing}
            className="px-4 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="현재 시간 기준 오늘 및 최근 24시간 영상을 새로고침하고 미분석 영상을 Gemini AI로 자동 요약합니다"
          >
            <Sparkles className={`w-3.5 h-3.5 text-slate-950 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? '최신 영상 새로고침 & 요약 중...' : '🔥 실시간 새로고침 & AI 요약'}</span>
          </button>

          {/* Batch Markdown Dossier */}
          <button
            id="batch-download-md-btn"
            onClick={handleDownloadYesterdayBatch}
            className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-300" />
            <span>요약집 (.md)</span>
          </button>

          {/* Export CSV / Excel */}
          <button
            id="batch-export-csv-btn"
            onClick={onOpenExportModal}
            className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>엑셀 / CSV</span>
          </button>
        </div>
      </div>

      {/* 2.2 Instant Video URL & Topic AI Direct Analyzer + Video Search Launcher */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 rounded-xl border border-slate-700 shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                실시간 유튜브 영상 URL / 토픽 즉시 AI 심층 분석 & 동영상 검색
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  직접 검색 & AI 분석
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                특정 영상 링크나 검색어를 입력하여 즉시 분석하거나, 유튜브 전체 동영상을 실시간으로 검색하여 추가할 수 있습니다.
              </p>
            </div>
          </div>

          {/* Open Video Search Modal Button */}
          {onOpenVideoSearch && (
            <button
              type="button"
              onClick={() => onOpenVideoSearch(quickInput || filters.searchQuery || '')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs border border-indigo-400/40"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-200" />
              <span>🌐 유튜브 전체 실시간 동영상 검색</span>
            </button>
          )}
        </div>

        <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="분석할 유튜브 URL (예: https://youtu.be/... ) 또는 검색어를 입력하세요"
              disabled={isQuickAnalyzing}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-950/70 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isQuickAnalyzing || !quickInput.trim()}
              className="px-5 py-2 text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 rounded-lg shadow transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-slate-950 ${isQuickAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isQuickAnalyzing ? '영상 추출 & AI 분석 중...' : '⚡ 즉시 AI 분석'}</span>
            </button>
            {onOpenVideoSearch && (
              <button
                type="button"
                onClick={() => onOpenVideoSearch(quickInput)}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg transition-colors flex items-center gap-1"
                title="입력한 검색어로 유튜브 동영상 목록 검색"
              >
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <span>검색</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 2.3 Today's Executive Intelligence 3-Point Briefing */}
      {topKeyPoints.length > 0 && (
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4 sm:p-5 text-emerald-100 shadow-2xs">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
              오늘의 실시간 핵심 브리핑
            </span>
            <span className="text-xs text-slate-400 font-medium">최신 24시간 분석 영상 기반 주요 포인트</span>
          </div>
          <div className="space-y-2">
            {topKeyPoints.map((pt, idx) => (
              <div 
                key={idx}
                onClick={() => onOpenDetail(pt.video)}
                className="flex items-start gap-2.5 p-2 rounded-lg bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-700/30 cursor-pointer transition-all text-xs sm:text-sm text-emerald-100 hover:text-white"
              >
                <span className="w-5 h-5 rounded bg-emerald-500/30 text-emerald-300 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-emerald-300 mr-1.5">[{pt.channel}]</span>
                  <span>{pt.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2.5 Quick Date Filter Segment */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1">기간 필터:</span>
        <button
          onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'today' }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            filters.dateFilter === 'today'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
          }`}
        >
          <Flame className="w-3 h-3 fill-current" />
          오늘(당일) 업로드 ({todayVideos.length})
        </button>

        <button
          onClick={() => setFilters(prev => ({ ...prev, dateFilter: '24hours' }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            filters.dateFilter === '24hours'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
          }`}
        >
          <Tv2 className="w-3 h-3" />
          최근 24시간 ({within24hVideos.length})
        </button>

        <button
          onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'yesterday' }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            filters.dateFilter === 'yesterday'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
          }`}
        >
          <Clock className="w-3 h-3" />
          전일(어제) ({yesterdayVideos.length})
        </button>

        <button
          onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'recent3days' }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            filters.dateFilter === 'recent3days'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
          }`}
        >
          <Calendar className="w-3 h-3" />
          최근 3일 ({recent3DaysVideos.length})
        </button>

        <button
          onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'all' }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            filters.dateFilter === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
          }`}
        >
          전체 수집 영상 ({videos.length})
        </button>
      </div>

      {/* 3. Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categoryFilterList.map(cat => {
          const isActive = filters.category === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setFilters(prev => ({ ...prev, category: cat.value }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/90'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 4. Search & Multi-Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="영상 제목, 채널명, 핵심 주제, 키워드로 검색 (예: 엔비디아, 삼프로TV, AI)..."
            value={filters.searchQuery}
            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full pl-9 pr-16 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all text-slate-900 placeholder:text-slate-400"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              지우기
            </button>
          )}
        </div>

        {/* Filter Dropdowns & Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Date Filter */}
          <select
            value={filters.dateFilter}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFilter: e.target.value as any }))}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-900 cursor-pointer hover:border-slate-300 focus:outline-none"
          >
            <option value="24hours">⚡ 최근 24시간 ({within24hVideos.length}개)</option>
            <option value="today">🔥 오늘(당일) 업로드 ({todayVideos.length}개)</option>
            <option value="yesterday">📅 전일(어제) 영상 ({yesterdayVideos.length}개)</option>
            <option value="recent3days">최근 3일 이내</option>
            <option value="recent7days">최근 7일 이내</option>
            <option value="all">전체 수집 영상 ({videos.length}개)</option>
          </select>

          {/* Channel Filter */}
          <select
            value={filters.channelId}
            onChange={(e) => setFilters(prev => ({ ...prev, channelId: e.target.value }))}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 cursor-pointer hover:border-slate-300 focus:outline-none max-w-[140px] truncate"
          >
            <option value="ALL">전체 채널 ({channels.length})</option>
            {channels.map(ch => (
              <option key={ch.id} value={ch.channelId}>{ch.title}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.statusFilter}
            onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value as any }))}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 cursor-pointer hover:border-slate-300 focus:outline-none"
          >
            <option value="all">상태 전체</option>
            <option value="summarized">요약 완료</option>
            <option value="unsummarized">요약 대기</option>
            <option value="bookmarked">북마크 영상</option>
          </select>

          {/* Live YouTube Video Search Button */}
          {onOpenVideoSearch && (
            <button
              onClick={() => onOpenVideoSearch(filters.searchQuery || '')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
              title="유튜브 전체에서 실시간 검색창 열기"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">유튜브 검색</span>
            </button>
          )}

          {/* Reset Filters */}
          {(filters.category !== 'ALL' || filters.channelId !== 'ALL' || filters.dateFilter !== 'all' || filters.searchQuery || filters.statusFilter !== 'all') && (
            <button
              onClick={resetFilters}
              title="필터 초기화"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Refresh Button */}
          <button
            onClick={onRefreshAndSummarize24h}
            disabled={isProcessing || isBatchAnalyzing}
            title="최신 24시간 영상 즉시 새로고침"
            className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 rounded-lg border border-amber-200 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs font-semibold px-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">새로고침</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="그리드 뷰"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="리스트 뷰"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4.5 Smart Scope Assistance Banner (When current dateFilter hides matches) */}
      {filters.searchQuery.trim() && filteredVideos.length === 0 && allTimeSearchMatchesCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0">!</span>
            <span>
              현재 선택된 기간(<strong>{filters.dateFilter === '24hours' ? '최근 24시간' : filters.dateFilter === 'today' ? '오늘' : filters.dateFilter}</strong>)에는 일치하는 영상이 없지만, 전체 수집 영상에 <strong>{allTimeSearchMatchesCount}개</strong>의 일치 영상이 있습니다.
            </span>
          </div>
          <button
            onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'all' }))}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shrink-0"
          >
            <span>전체 기간에서 결과 보기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span>총 <strong className="text-slate-900 font-semibold">{filteredVideos.length}</strong>개의 영상 표시 중</span>
          {filters.searchQuery && (
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded border border-indigo-200 flex items-center gap-1">
              <Search className="w-3 h-3" />
              "{filters.searchQuery}" 검색 중
            </span>
          )}
          {filters.dateFilter === 'today' && (
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-medium rounded border border-emerald-200/80">
              🔥 오늘(당일) 업로드 필터
            </span>
          )}
          {filters.dateFilter === '24hours' && (
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-medium rounded border border-amber-200/80">
              ⚡ 최근 24시간 필터
            </span>
          )}
          {filters.dateFilter === 'yesterday' && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-medium rounded border border-slate-200">
              📅 전일(어제) 업로드 필터
            </span>
          )}
        </div>

        {/* Live Search Shortcut */}
        {filters.searchQuery && onOpenVideoSearch && (
          <button
            onClick={() => onOpenVideoSearch(filters.searchQuery)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
          >
            <Globe className="w-3 h-3" />
            유튜브 전체에서 '{filters.searchQuery}' 실시간 검색하기
          </button>
        )}
      </div>

      {/* 6. Video List / Grid */}
      {filteredVideos.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3.5'}>
          {filteredVideos.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              onOpenDetail={onOpenDetail}
              onToggleBookmark={onToggleBookmark}
              onReanalyze={onReanalyze}
              isAnalyzing={analyzingVideoId === video.id || isBatchAnalyzing || isProcessing}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Tv2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {filters.searchQuery
              ? `'${filters.searchQuery}' 관련 영상을 찾지 못했습니다`
              : filters.dateFilter === 'today'
              ? '오늘(당일) 업로드된 영상이 아직 없거나 동기화 대기 중입니다'
              : filters.dateFilter === '24hours'
              ? '최근 24시간 이내에 업로드된 영상이 아직 없습니다'
              : filters.dateFilter === 'yesterday'
              ? '전일(어제) 업로드된 영상이 없습니다'
              : '조건에 일치하는 영상이 없습니다'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            {filters.searchQuery
              ? `유튜브 전체에서 '${filters.searchQuery}' 동영상을 실시간 검색하거나, 기간 필터를 변경해보세요.`
              : '등록된 채널의 실시간 RSS 업로드 피드를 즉시 검색하고 Gemini AI로 핵심 내용을 요약해보세요.'}
          </p>
          
          <div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap">
            {/* If searching, give YouTube real-time search button */}
            {filters.searchQuery && onOpenVideoSearch && (
              <button
                onClick={() => onOpenVideoSearch(filters.searchQuery)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition-colors inline-flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-amber-300" />
                <span>🌐 유튜브 전체에서 '{filters.searchQuery}' 실시간 검색</span>
              </button>
            )}

            <button
              onClick={onRefreshAndSummarize24h}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isProcessing ? '실시간 새로고침 중...' : '🔥 실시간 최신 영상 가져오기'}</span>
            </button>

            <button
              onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'all', searchQuery: '' }))}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              전체 수집 영상 ({videos.length}개) 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
