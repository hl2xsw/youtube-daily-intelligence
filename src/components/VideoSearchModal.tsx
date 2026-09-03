import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  Sparkles, 
  ExternalLink, 
  Clock, 
  Eye, 
  Filter, 
  Check, 
  Plus, 
  Tv2, 
  Flame, 
  Calendar, 
  ChevronRight,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { YouTubeVideo, YouTubeVideoSearchResult, YouTubeChannel } from '../types';
import { 
  searchYouTubeVideos, 
  searchGoogleYouTubeVideos, 
  searchConfiguredChannels,
  getYouTubeChannelUrl
} from '../utils/youtubeService';
import { useToast } from './Toast';

interface VideoSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  categories?: string[];
  channels?: YouTubeChannel[];
  existingVideos?: YouTubeVideo[];
  onAddVideo?: (video: YouTubeVideo) => void;
  onAddChannel?: (channel: Omit<YouTubeChannel, 'id' | 'addedAt'>) => Promise<void> | void;
  onQuickAnalyze?: (input: string) => Promise<void>;
  isQuickAnalyzing?: boolean;
}

const POPULAR_SEARCH_KEYWORDS = [
  '엔비디아 실적',
  '삼프로TV',
  '슈카월드',
  'AI 최신 뉴스',
  '한국 증시 전망',
  '미국 기준금리',
  '조코딩',
  '테크몽 신제품',
  '양자컴퓨터',
  '반도체 시장'
];

export const VideoSearchModal: React.FC<VideoSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  categories = ['IT/테크', '경제/재테크', '비즈니스/스타트업', '과학/지식', '뉴스/시사', '기타'],
  channels = [],
  existingVideos = [],
  onAddVideo,
  onAddChannel,
  onQuickAnalyze,
  isQuickAnalyzing = false
}) => {
  const { showToast } = useToast();
  const safeInitialQuery = typeof initialQuery === 'string' ? initialQuery : '';
  const [query, setQuery] = useState(safeInitialQuery);
  const [searchEngine, setSearchEngine] = useState<'google' | 'youtube' | 'channels'>('google');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('today'); // Strictly default to 24 hours / today
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'viewCount'>('date'); // Default to latest upload date
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<YouTubeVideoSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const safeExistingVideos = Array.isArray(existingVideos) ? existingVideos : [];
  const existingVideoIds = new Set(
    safeExistingVideos.map(v => v?.videoId).filter(Boolean) as string[]
  );

  // Sync initial query when modal opens
  useEffect(() => {
    if (isOpen) {
      const qStr = typeof initialQuery === 'string' ? initialQuery.trim() : '';
      if (qStr) {
        setQuery(qStr);
        performSearch(qStr, searchEngine, dateFilter, sortBy);
      } else if (!hasSearched && query && typeof query === 'string' && query.trim()) {
        performSearch(query.trim(), searchEngine, dateFilter, sortBy);
      }
    }
  }, [isOpen, initialQuery]);

  const performSearch = async (
    searchQuery: string,
    engine = searchEngine,
    filter = dateFilter,
    sort = sortBy
  ) => {
    const q = typeof searchQuery === 'string' ? searchQuery.trim() : '';
    if (!q && engine !== 'channels') {
      showToast('검색어를 입력해주세요.', 'info');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      let data: YouTubeVideoSearchResult[] = [];

      if (engine === 'google') {
        data = await searchGoogleYouTubeVideos(q, {
          dateFilter: filter,
          sortBy: sort,
          limit: 35
        });
      } else if (engine === 'channels') {
        const chanVideos = await searchConfiguredChannels(channels, q);
        data = chanVideos.map(v => ({
          videoId: v.videoId,
          channelId: v.channelId,
          channelTitle: v.channelTitle,
          channelThumbnail: v.channelThumbnail,
          title: v.title,
          description: v.description,
          timeAgo: v.relativeTimeText || '최근',
          viewCountText: v.viewCount ? `${v.viewCount.toLocaleString()}회` : undefined,
          duration: v.duration,
          thumbnailUrl: v.thumbnailUrl,
          videoUrl: v.videoUrl,
          publishedAt: v.publishedAt
        }));
      } else {
        data = await searchYouTubeVideos(q, {
          dateFilter: filter,
          sortBy: sort,
          limit: 35
        });
      }

      setResults(Array.isArray(data) ? data : []);
      if (!data || data.length === 0) {
        showToast(`'${q}' 관련 동영상을 찾을 수 없습니다. 검색어나 필터를 변경해보세요.`, 'info');
      }
    } catch (e: any) {
      console.error('Search error:', e);
      showToast('동영상 검색 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof query === 'string') {
      performSearch(query, searchEngine, dateFilter, sortBy);
    }
  };

  const handleKeywordClick = (kw: string) => {
    setQuery(kw);
    performSearch(kw, searchEngine, dateFilter, sortBy);
  };

  const handleEngineChange = (newEngine: 'google' | 'youtube' | 'channels') => {
    setSearchEngine(newEngine);
    if (typeof query === 'string' && query.trim()) {
      performSearch(query.trim(), newEngine, dateFilter, sortBy);
    } else if (newEngine === 'channels') {
      performSearch('', newEngine, dateFilter, sortBy);
    }
  };

  const handleFilterChange = (newDateFilter: 'all' | 'today' | 'week' | 'month') => {
    setDateFilter(newDateFilter);
    if (typeof query === 'string' && query.trim()) {
      performSearch(query.trim(), searchEngine, newDateFilter, sortBy);
    }
  };

  const handleSortChange = (newSort: 'relevance' | 'date' | 'viewCount') => {
    setSortBy(newSort);
    if (typeof query === 'string' && query.trim()) {
      performSearch(query.trim(), searchEngine, dateFilter, newSort);
    }
  };

  const convertSearchResultToVideo = (res: YouTubeVideoSearchResult): YouTubeVideo => {
    const vidId = res.videoId || `vid-${Date.now().toString(36)}`;
    const chTitle = res.channelTitle || 'YouTube Creator';
    return {
      id: `vid-${vidId}-${Date.now().toString(36)}`,
      videoId: vidId,
      channelId: res.channelId || `ch-${chTitle}`,
      channelTitle: chTitle,
      channelThumbnail: res.channelThumbnail || '',
      title: res.title || '유튜브 동영상',
      description: res.description || '',
      publishedAt: res.publishedAt || new Date().toISOString(),
      thumbnailUrl: res.thumbnailUrl || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
      videoUrl: res.videoUrl || `https://www.youtube.com/watch?v=${vidId}`,
      duration: res.duration,
      viewCountText: res.viewCountText,
      category: (categories && categories[0]) || 'IT/테크',
      isWithin24h: false,
      isToday: false,
      isYesterday: false,
      isSummarized: false,
      isBookmarked: false,
      createdAt: new Date().toISOString()
    };
  };

  const handleAnalyze = async (video: YouTubeVideoSearchResult) => {
    setAnalyzingId(video.videoId);
    try {
      if (onQuickAnalyze) {
        await onQuickAnalyze(video.videoUrl || `https://www.youtube.com/watch?v=${video.videoId}`);
      } else if (onAddVideo) {
        onAddVideo(convertSearchResultToVideo(video));
      }
    } finally {
      setAnalyzingId(null);
    }
  };

  const toggleSelect = (videoId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

  const handleBatchAddSelected = () => {
    const targets = results.filter(v => selectedIds.has(v.videoId));
    if (targets.length === 0) return;
    let addedCount = 0;
    for (const t of targets) {
      if (!existingVideoIds.has(t.videoId)) {
        if (onAddVideo) {
          onAddVideo(convertSearchResultToVideo(t));
        }
        addedCount++;
      }
    }
    setSelectedIds(new Set());
    showToast(`${addedCount}개의 영상을 대시보드에 추가했습니다!`, 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
              <Search className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                유튜브 실시간 동영상 검색 & AI 분석
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Live Search
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                유튜브 전체 영상 중 관심 있는 주제나 최신 이슈를 실시간으로 검색하고 즉시 Gemini AI로 분석합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 space-y-3">
          {/* Search Engine Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">검색 엔진:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleEngineChange('google')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                  searchEngine === 'google'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400/30'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>🌐 Google 검색 엔진 (추천)</span>
              </button>

              <button
                type="button"
                onClick={() => handleEngineChange('youtube')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                  searchEngine === 'youtube'
                    ? 'bg-red-600 text-white ring-2 ring-red-400/30'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Tv2 className="w-3.5 h-3.5" />
                <span>⚡ YouTube 실시간</span>
              </button>

              <button
                type="button"
                onClick={() => handleEngineChange('channels')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                  searchEngine === 'channels'
                    ? 'bg-slate-900 text-white ring-2 ring-slate-400/30'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>📺 내 등록 채널 ({channels.length}개)</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  searchEngine === 'google'
                    ? "Google 검색 엔진으로 유튜브 검색 (예: 슈카월드 최신, 엔비디아 실적 분석, 삼프로TV)..."
                    : searchEngine === 'channels'
                    ? "내 등록 채널에서 검색 (비워두면 모든 등록 채널의 최신 영상 조회)..."
                    : "유튜브 전체 실시간 검색어 또는 영상 URL..."
                }
                className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || (!query.trim() && searchEngine !== 'channels')}
              className="px-5 py-2 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>검색 중...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>{searchEngine === 'google' ? 'Google 검색' : '실시간 검색'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Keywords */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-400 shrink-0 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-500" /> 추천 키워드:
            </span>
            {POPULAR_SEARCH_KEYWORDS.map(kw => (
              <button
                key={kw}
                type="button"
                onClick={() => handleKeywordClick(kw)}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 whitespace-nowrap transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>

          {/* Filter Toolbar: Upload Date & Sorting */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">업로드 기간:</span>
              <button
                type="button"
                onClick={() => handleFilterChange('today')}
                className={`px-2.5 py-1 text-xs rounded font-bold transition-colors flex items-center gap-1 shadow-2xs ${
                  dateFilter === 'today'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-400" />
                ⚡ 최근 24시간 / 오늘 (권장)
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('all')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  dateFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                전체 기간
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('week')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  dateFilter === 'week'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                이번 주
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('month')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  dateFilter === 'month'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                이번 달
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">정렬:</span>
              <button
                type="button"
                onClick={() => handleSortChange('relevance')}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  sortBy === 'relevance'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                관련도순
              </button>
              <button
                type="button"
                onClick={() => handleSortChange('date')}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors flex items-center gap-1 ${
                  sortBy === 'date'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-600 fill-amber-600" />
                최신 업로드순
              </button>
              <button
                type="button"
                onClick={() => handleSortChange('viewCount')}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  sortBy === 'viewCount'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                조회수순
              </button>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">유튜브 실시간 검색 결과를 가져오는 중입니다...</p>
              <p className="text-xs text-slate-400">영상 메타데이터, 채널 정보, 썸네일을 동기화하고 있습니다.</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              {/* Batch Action Bar */}
              <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 px-3.5 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-amber-900">
                    검색 결과: <strong className="text-slate-900 font-bold">{results.length}건</strong>의 동영상 발견
                  </span>
                  {selectedIds.size > 0 && (
                    <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold text-[10px]">
                      {selectedIds.size}개 선택됨
                    </span>
                  )}
                </div>

                {selectedIds.size > 0 && (
                  <button
                    onClick={handleBatchAddSelected}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3 text-amber-300" />
                    <span>선택 영상 대시보드에 일괄 추가</span>
                  </button>
                )}
              </div>

              {/* Video Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {results.map((video) => {
                  const isExisting = existingVideoIds.has(video.videoId);
                  const isCurrentlyAnalyzing = analyzingId === video.videoId || isQuickAnalyzing;
                  const isSelected = selectedIds.has(video.videoId);

                  return (
                    <div
                      key={video.videoId}
                      className={`bg-white rounded-xl border p-3.5 flex flex-col justify-between transition-all hover:shadow-md ${
                        isSelected 
                          ? 'border-amber-400 bg-amber-50/20' 
                          : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {/* Thumbnail & Badges Container */}
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 mb-2.5">
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {video.duration && (
                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-slate-950/85 text-white font-bold text-[10px] rounded">
                              {video.duration}
                            </span>
                          )}
                          {isExisting && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-700/90 text-white font-bold text-[10px] rounded-md shadow flex items-center gap-1">
                              <Check className="w-3 h-3" /> 대시보드 등록됨
                            </span>
                          )}
                          {/* Selection Checkbox */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(video.videoId);
                            }}
                            className="absolute top-2 left-2 cursor-pointer"
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center shadow ${
                              isSelected 
                                ? 'bg-amber-500 border-amber-600 text-white' 
                                : 'bg-black/40 border-white/70 hover:bg-black/60 text-transparent'
                            }`}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </div>
                        </div>

                        {/* Channel & Meta */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          {(() => {
                            const chTitle = video.channelTitle || 'YouTube Creator';
                            const chUrl = getYouTubeChannelUrl({ channelId: video.channelId, title: chTitle });
                            const isChannelRegistered = (channels || []).some(c => 
                              (c && video.channelId && c.channelId && c.channelId === video.channelId) || 
                              (c && c.title && chTitle && c.title.toLowerCase() === chTitle.toLowerCase())
                            );

                            return (
                              <>
                                <a
                                  href={chUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-2 min-w-0 group/ch hover:opacity-80 transition-opacity"
                                  title={`'${chTitle}' 유튜브 채널로 이동하여 확인`}
                                >
                                  {video.channelThumbnail ? (
                                    <img
                                      src={video.channelThumbnail}
                                      alt={chTitle}
                                      className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                      {chTitle.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-xs font-semibold text-slate-700 group-hover/ch:text-red-600 truncate flex items-center gap-1">
                                    <span className="truncate">{chTitle}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover/ch:text-red-500 shrink-0" />
                                  </span>
                                </a>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* 유튜브 채널 확인 링크 */}
                                  <a
                                    href={chUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-1.5 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded flex items-center gap-0.5 transition-colors shadow-2xs"
                                    title={`'${chTitle}' 유튜브 채널 새 탭에서 열어 확인`}
                                  >
                                    <ExternalLink className="w-2.5 h-2.5 text-red-500" />
                                    <span>채널 확인</span>
                                  </a>

                                  {/* 1-click Channel Subscription */}
                                  {onAddChannel && (
                                    isChannelRegistered ? (
                                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium shrink-0">
                                        구독중
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const safeChTitle = video.channelTitle || 'YouTube Channel';
                                          onAddChannel({
                                            channelId: video.channelId || `ch-${safeChTitle}`,
                                            title: safeChTitle,
                                            handle: `@${safeChTitle.replace(/\s+/g, '').toLowerCase()}`,
                                            thumbnailUrl: video.channelThumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                                            category: (categories && categories[0]) || 'IT/테크',
                                            isActive: true,
                                            subscriberCount: '10만+'
                                          });
                                        }}
                                        className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors shrink-0 flex items-center gap-0.5"
                                        title="이 채널을 일일 모니터링 목록에 추가"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>채널 모니터링</span>
                                      </button>
                                    )
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Title */}
                        <h4 
                          title={video.title || ''}
                          className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 hover:text-amber-700 transition-colors leading-snug mb-1.5"
                        >
                          {video.title || '제목 없음'}
                        </h4>

                        {/* Description snippet */}
                        {video.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                            {video.description}
                          </p>
                        )}

                        {/* Video Stats */}
                        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mb-3 flex-wrap">
                          {video.timeAgo && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {video.timeAgo}
                            </span>
                          )}
                          {video.viewCountText && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {video.viewCountText}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        {/* 1. Instant AI Analyze */}
                        <button
                          type="button"
                          onClick={() => handleAnalyze(video)}
                          disabled={isCurrentlyAnalyzing}
                          className="flex-1 py-1.5 px-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 disabled:opacity-50 shadow-2xs"
                        >
                          {isCurrentlyAnalyzing ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>AI 분석 중...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-slate-900" />
                              <span>⚡ 즉시 AI 요약</span>
                            </>
                          )}
                        </button>

                        {/* 2. Add to Dashboard */}
                        {!isExisting ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onAddVideo) {
                                onAddVideo(convertSearchResultToVideo(video));
                              }
                              showToast(`'${video.title.slice(0, 20)}...' 영상이 대시보드에 추가되었습니다!`, 'success');
                            }}
                            className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                            title="대시보드 영상 목록에 추가"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>추가</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-600 px-2 py-1 bg-emerald-50 rounded">
                            추가됨
                          </span>
                        )}

                        {/* 3. Watch on YouTube */}
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="유튜브에서 원본 영상 보기"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : hasSearched ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">검색 조건에 맞는 동영상을 찾지 못했습니다</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                다른 검색어를 입력하시거나, 업로드 기간 필터를 '전체'로 변경해보세요.
              </p>
            </div>
          ) : (
            <div className="py-14 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Tv2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">원하는 유튜브 동영상을 실시간으로 찾아보세요</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  키워드, 이슈, 주제 또는 채널명을 검색하면 유튜브 최신 영상을 불러와 Gemini AI 심층 요약을 생성합니다.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {POPULAR_SEARCH_KEYWORDS.slice(0, 6).map(kw => (
                  <button
                    key={kw}
                    onClick={() => handleKeywordClick(kw)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>{kw}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Gemini 2.5 Flash 기반 실시간 자막·메타데이터 분석</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
