import React, { useState, useMemo } from 'react';
import { YouTubeVideo, VideoCategory, YouTubeChannel, FilterState } from '../types';
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
  ArrowUpDown
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
  onOpenExportModal: () => void;
  isBatchAnalyzing: boolean;
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
  onOpenExportModal,
  isBatchAnalyzing,
  analyzingVideoId
}) => {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categoryFilterList = useMemo(() => {
    return [
      { label: '전체', value: 'ALL' },
      ...categories.map(cat => ({ label: cat, value: cat }))
    ];
  }, [categories]);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    category: 'ALL',
    channelId: 'ALL',
    dateFilter: 'yesterday', // Default to yesterday videos as per user requirement
    searchQuery: '',
    statusFilter: 'all'
  });

  // Calculate quick metrics
  const yesterdayVideos = useMemo(() => videos.filter(v => v.isYesterday), [videos]);
  const summarizedYesterdayCount = useMemo(() => yesterdayVideos.filter(v => v.isSummarized).length, [yesterdayVideos]);
  const activeChannelsCount = useMemo(() => channels.filter(c => c.isActive).length, [channels]);

  // Filtered Videos
  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      // Category filter
      if (filters.category !== 'ALL' && video.category !== filters.category) {
        return false;
      }

      // Channel filter
      if (filters.channelId !== 'ALL' && video.channelId !== filters.channelId) {
        return false;
      }

      // Date filter
      if (filters.dateFilter === 'yesterday' && !video.isYesterday) {
        return false;
      } else if (filters.dateFilter === 'recent3days') {
        const pubTime = new Date(video.publishedAt).getTime();
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        if (pubTime < threeDaysAgo) return false;
      } else if (filters.dateFilter === 'recent7days') {
        const pubTime = new Date(video.publishedAt).getTime();
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (pubTime < sevenDaysAgo) return false;
      }

      // Status filter
      if (filters.statusFilter === 'summarized' && !video.isSummarized) return false;
      if (filters.statusFilter === 'unsummarized' && video.isSummarized) return false;
      if (filters.statusFilter === 'bookmarked' && !video.isBookmarked) return false;

      // Search Query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchTitle = video.title.toLowerCase().includes(q);
        const matchChannel = video.channelTitle.toLowerCase().includes(q);
        const matchCore = video.summary?.coreTopic.toLowerCase().includes(q);
        const matchKeywords = video.summary?.keywords.some(k => k.toLowerCase().includes(q));
        const matchPoints = video.summary?.keyPoints.some(p => p.toLowerCase().includes(q));
        if (!matchTitle && !matchChannel && !matchCore && !matchKeywords && !matchPoints) {
          return false;
        }
      }

      return true;
    });
  }, [videos, filters]);

  // Quick download of all yesterday's summaries in markdown
  const handleDownloadYesterdayBatch = () => {
    if (yesterdayVideos.length === 0) {
      showToast('전일 업로드된 영상이 없습니다.', 'info');
      return;
    }
    const dateStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const md = generateBatchMarkdown(yesterdayVideos, `${dateStr} 전일 유튜브 일괄 요약집`);
    downloadFile(`유튜브_전일영상_일괄요약집_${dateStr}.md`, md, 'text/markdown;charset=utf-8');
    showToast(`전일 영상 ${yesterdayVideos.length}건의 일괄 요약집(.md)이 저장되었습니다.`, 'success');
  };

  const resetFilters = () => {
    setFilters({
      category: 'ALL',
      channelId: 'ALL',
      dateFilter: 'yesterday',
      searchQuery: '',
      statusFilter: 'all'
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Quick KPI Statistics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Yesterday Videos */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Tv2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">전일(어제) 업로드 영상</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">{yesterdayVideos.length}</span>
              <span className="text-xs text-slate-500">개 확인됨</span>
            </div>
          </div>
        </div>

        {/* Metric 2: AI Summarized Count */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">AI 요약 완료</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">{summarizedYesterdayCount}</span>
              <span className="text-xs text-slate-500">/ {yesterdayVideos.length}개 ({yesterdayVideos.length ? Math.round((summarizedYesterdayCount / yesterdayVideos.length) * 100) : 0}%)</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Active Monitoring Channels */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">모니터링 채널</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">{activeChannelsCount}</span>
              <span className="text-xs text-slate-500">개 추적 중</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Average Reading Time Saved */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Clock className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">절약된 시청 시간</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">~2.5</span>
              <span className="text-xs text-slate-500">시간 절약 (3분 요약)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Batch Action Bar */}
      <div className="bg-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700">
              전일 영상 관리
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              전일 업로드 영상 핵심 요약 및 일괄 저장
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            등록된 채널의 어제자 영상을 AI로 분석하고 마크다운/워드 문서 또는 엑셀(CSV)로 저장하세요.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Batch Summarize */}
          <button
            id="batch-analyze-btn"
            onClick={onBatchAnalyzeYesterday}
            disabled={isBatchAnalyzing}
            className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isBatchAnalyzing ? 'animate-spin text-slate-900' : 'text-slate-700'}`} />
            <span>{isBatchAnalyzing ? '일괄 분석 중...' : '전일 영상 일괄 AI 분석'}</span>
          </button>

          {/* Batch Markdown Dossier */}
          <button
            id="batch-download-md-btn"
            onClick={handleDownloadYesterdayBatch}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-300" />
            <span>요약집 (.md)</span>
          </button>

          {/* Export CSV / Excel */}
          <button
            id="batch-export-csv-btn"
            onClick={onOpenExportModal}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>엑셀 / CSV</span>
          </button>
        </div>
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
            placeholder="영상 제목, 채널명, 핵심 주제 또는 키워드로 검색..."
            value={filters.searchQuery}
            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all text-slate-900 placeholder:text-slate-400"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
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
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 cursor-pointer hover:border-slate-300 focus:outline-none"
          >
            <option value="yesterday">📅 전일 영상만 (기본)</option>
            <option value="recent3days">최근 3일</option>
            <option value="recent7days">최근 7일</option>
            <option value="all">전체 수집 영상</option>
          </select>

          {/* Channel Filter */}
          <select
            value={filters.channelId}
            onChange={(e) => setFilters(prev => ({ ...prev, channelId: e.target.value }))}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 cursor-pointer hover:border-slate-300 focus:outline-none max-w-[140px] truncate"
          >
            <option value="ALL">전체 채널</option>
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

          {/* Reset Filters */}
          {(filters.category !== 'ALL' || filters.channelId !== 'ALL' || filters.dateFilter !== 'yesterday' || filters.searchQuery || filters.statusFilter !== 'all') && (
            <button
              onClick={resetFilters}
              title="필터 초기화"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

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

      {/* 5. Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
        <div>
          총 <span className="text-slate-900 font-semibold">{filteredVideos.length}</span>개의 영상
          {filters.dateFilter === 'yesterday' && <span className="ml-1 text-slate-600">(전일 업로드 영상 필터 적용)</span>}
        </div>
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
              isAnalyzing={analyzingVideoId === video.id || isBatchAnalyzing}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">조건에 일치하는 영상이 없습니다</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            필터 조건을 변경하거나 검색어를 재입력해보세요. 전일 업로드 영상이 아직 없다면 [새로고침]을 클릭하여 최신 영상을 동기화하세요.
          </p>
          <button
            onClick={resetFilters}
            className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            필터 초기화
          </button>
        </div>
      )}
    </div>
  );
};
