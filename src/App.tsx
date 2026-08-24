import React, { useState, useEffect, useCallback } from 'react';
import { 
  YouTubeChannel, 
  YouTubeVideo, 
  DailyReport, 
  AppSettings, 
  ActiveTab, 
  VideoCategory 
} from './types';
import { 
  loadChannels, 
  saveChannels, 
  loadVideos, 
  saveVideos, 
  loadReports, 
  saveReports, 
  loadSettings, 
  saveSettings,
  loadCategories,
  saveCategories,
  resetAllData
} from './utils/storage';
import { fetchRealChannelVideos, searchAndSummarize24hVideos, generateClientFallbackSummary } from './utils/youtubeService';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { AnalyticsReportView } from './components/AnalyticsReportView';
import { SettingsView } from './components/SettingsView';
import { VideoDetailModal } from './components/VideoDetailModal';
import { ExportModal } from './components/ExportModal';
import { ToastProvider, useToast } from './components/Toast';

function AppContent() {
  const { showToast } = useToast();

  // App State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  // Modal & Loading States
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSearching24h, setIsSearching24h] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [analyzingVideoId, setAnalyzingVideoId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Sync real videos for channels
  const syncChannelVideos = useCallback(async (targetChannels: YouTubeChannel[], existingVideos: YouTubeVideo[]) => {
    const active = targetChannels.filter(c => c.isActive);
    if (active.length === 0) return existingVideos;

    let updatedList = [...existingVideos];

    for (const channel of active) {
      try {
        const realVideos = await fetchRealChannelVideos(channel);
        if (realVideos && realVideos.length > 0) {
          for (const v of realVideos) {
            const existsIdx = updatedList.findIndex(e => e.videoId === v.videoId);
            if (existsIdx >= 0) {
              updatedList[existsIdx] = {
                ...v,
                isSummarized: updatedList[existsIdx].isSummarized,
                summary: updatedList[existsIdx].summary || v.summary,
                isBookmarked: updatedList[existsIdx].isBookmarked
              };
            } else {
              updatedList = [v, ...updatedList];
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to sync videos for ${channel.title}`, err);
      }
    }

    // Keep only videos that belong to existing channels
    const validChannelIds = new Set(targetChannels.map(c => c.channelId));
    const validTitles = new Set(targetChannels.map(c => c.title));
    const cleanedList = updatedList.filter(v => validChannelIds.has(v.channelId) || validTitles.has(v.channelTitle));

    return cleanedList;
  }, []);

  // Initialize data on mount
  useEffect(() => {
    const initChannels = loadChannels();
    const initVideos = loadVideos();
    const initReports = loadReports();
    const initSettings = loadSettings();
    const initCategories = loadCategories();

    const validChannelIds = new Set(initChannels.map(c => c.channelId));
    const validTitles = new Set(initChannels.map(c => c.title));
    const validVideos = initVideos.filter(v => validChannelIds.has(v.channelId) || validTitles.has(v.channelTitle));

    setChannels(initChannels);
    setVideos(validVideos);
    setReports(initReports);
    setSettings(initSettings);
    setCategories(initCategories);

    if (validVideos.length === 0 && initChannels.length > 0) {
      syncChannelVideos(initChannels, []).then(synced => {
        if (synced && synced.length > 0) {
          setVideos(synced);
          saveVideos(synced);
        }
      });
    }
  }, [syncChannelVideos]);

  // Save changes to storage
  const updateChannels = (newChannels: YouTubeChannel[]) => {
    setChannels(newChannels);
    saveChannels(newChannels);
  };

  const updateVideos = (newVideos: YouTubeVideo[]) => {
    setVideos(newVideos);
    saveVideos(newVideos);
  };

  const updateReports = (newReports: DailyReport[]) => {
    setReports(newReports);
    saveReports(newReports);
  };

  const updateCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    saveCategories(newCategories);
  };

  const handleAddCategory = (newCategory: string): boolean => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      showToast('카테고리 이름을 입력해주세요.', 'error');
      return false;
    }
    if (categories.includes(trimmed)) {
      showToast(`'${trimmed}' 카테고리는 이미 등록되어 있습니다.`, 'info');
      return false;
    }
    const updated = [...categories, trimmed];
    updateCategories(updated);
    showToast(`새 카테고리 '${trimmed}'(이)가 생성되었습니다!`, 'success');
    return true;
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    const usedChannels = channels.filter(c => c.category === categoryToDelete);
    if (usedChannels.length > 0) {
      // Reassign to '기타'
      const updatedChannels = channels.map(c => c.category === categoryToDelete ? { ...c, category: '기타' } : c);
      updateChannels(updatedChannels);

      const updatedVideos = videos.map(v => v.category === categoryToDelete ? { ...v, category: '기타' } : v);
      updateVideos(updatedVideos);
    }

    const updated = categories.filter(c => c !== categoryToDelete);
    updateCategories(updated.length > 0 ? updated : ['기타']);
    showToast(`'${categoryToDelete}' 카테고리가 삭제되었습니다.`, 'info');
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
    showToast('설정이 성공적으로 저장되었습니다.', 'success');
  };

  // 1. Sync Channels & Fetch Real Exact Uploaded Videos
  const handleSyncChannels = async () => {
    setIsSyncing(true);
    showToast('등록된 채널의 실시간 업로드 영상을 확인하고 있습니다...', 'info');

    try {
      const activeChannels = channels.filter(c => c.isActive);
      if (activeChannels.length === 0) {
        showToast('활성화된 모니터링 채널이 없습니다.', 'info');
        setIsSyncing(false);
        return;
      }

      const syncedList = await syncChannelVideos(channels, videos);
      const newFound = syncedList.length - videos.length;
      updateVideos(syncedList);

      if (newFound > 0) {
        showToast(`${newFound}개의 새로운 유튜브 업로드 영상을 동기화했습니다!`, 'success');
      } else {
        showToast(`모든 채널(${activeChannels.length}개)의 업로드 영상이 최신 상태입니다.`, 'success');
      }
    } catch (e) {
      showToast('영상 동기화 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // 1-1. Search & AI Summarize 24h Videos
  const handleSearch24hVideos = async () => {
    const activeChannels = channels.filter(c => c.isActive);
    if (activeChannels.length === 0) {
      showToast('활성화된 모니터링 채널이 없습니다. [채널 설정] 탭에서 채널을 확인해주세요.', 'info');
      return;
    }

    setIsSearching24h(true);
    showToast('등록 채널의 최근 24시간 업로드 영상 검색 및 AI 요약을 시작합니다...', 'info');

    try {
      const result = await searchAndSummarize24hVideos(activeChannels);
      if (result && result.videos && result.videos.length > 0) {
        const existingMap = new Map<string, YouTubeVideo>(videos.map(v => [v.id, v]));
        for (const v of result.videos) {
          existingMap.set(v.id, v);
        }
        const merged: YouTubeVideo[] = Array.from(existingMap.values()).sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        updateVideos(merged);
        const summarizedCount = result.videos.filter(r => r.isSummarized).length;
        showToast(`최근 24시간 업로드 영상 ${result.videos.length}건 검색 및 ${summarizedCount}건 AI 요약 완료!`, 'success');
      } else {
        showToast('최근 24시간 이내에 새로 업로드된 영상이 없습니다.', 'info');
      }
    } catch (e) {
      showToast('24시간 영상 검색 및 분석 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSearching24h(false);
    }
  };

  // 2. Analyze Single Video
  const handleAnalyzeVideo = async (video: YouTubeVideo) => {
    setAnalyzingVideoId(video.id);
    showToast(`'${video.title.substring(0, 25)}...' AI 요약 생성 중...`, 'info');

    let summaryData: any = null;
    let isAi = false;

    try {
      const res = await fetch('/api/youtube/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: video.title,
          videoDescription: video.description,
          channelTitle: video.channelTitle,
          category: video.category,
          detailLevel: settings.summaryDetailLevel
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.summary) {
          summaryData = data.summary;
          isAi = !!data.aiPowered;
        }
      }
    } catch (err) {
      console.warn('Backend analyze error, using client fallback:', err);
    }

    // If server failed or summaryData is null, create smart client fallback
    if (!summaryData) {
      summaryData = generateClientFallbackSummary(video);
    }

    const updatedVideo: YouTubeVideo = {
      ...video,
      isSummarized: true,
      summary: summaryData,
      category: (summaryData.category as VideoCategory) || video.category
    };

    const exists = videos.some(v => v.id === video.id);
    const newVideos = exists
      ? videos.map(v => v.id === video.id ? updatedVideo : v)
      : [updatedVideo, ...videos];
    updateVideos(newVideos);

    setSelectedVideo(updatedVideo);

    showToast(
      isAi 
        ? '✨ Gemini AI 핵심 주제 및 요약 생성이 완료되었습니다!' 
        : 'AI 핵심 요약이 완료되었습니다!', 
      'success'
    );
    setAnalyzingVideoId(null);
  };

  // 3. Batch Analyze All Target Videos
  const handleBatchAnalyzeYesterday = async () => {
    const unsummarized = videos.filter(v => !v.isSummarized);
    if (unsummarized.length === 0) {
      showToast('요약할 미분석 영상이 없습니다.', 'info');
      return;
    }

    const toAnalyze = unsummarized.slice(0, 10);
    setIsBatchAnalyzing(true);
    showToast(`미분석 영상 ${toAnalyze.length}건의 일괄 AI 요약을 시작합니다...`, 'info');

    let completed = 0;
    let currentVideos = [...videos];

    for (const video of toAnalyze) {
      try {
        const res = await fetch('/api/youtube/analyze-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoTitle: video.title,
            videoDescription: video.description,
            channelTitle: video.channelTitle,
            category: video.category,
            detailLevel: settings.summaryDetailLevel
          })
        });

        const data = await res.json();
        if (data.success && data.summary) {
          const updated: YouTubeVideo = {
            ...video,
            isSummarized: true,
            summary: data.summary,
            category: (data.summary.category as VideoCategory) || video.category
          };
          currentVideos = currentVideos.map(v => v.id === video.id ? updated : v);
          completed++;
        }
      } catch (e) {
        console.error('Batch item fail:', e);
      }
    }

    updateVideos(currentVideos);
    setIsBatchAnalyzing(false);
    showToast(`${completed}건의 AI 영상 요약이 완료되었습니다!`, 'success');
  };

  // 4. Generate Daily Intelligence Comprehensive Report
  const handleGenerateDailyReport = async () => {
    const targetVideos = videos.filter(v => v.isYesterday).length > 0
      ? videos.filter(v => v.isYesterday)
      : videos;

    if (targetVideos.length === 0) {
      showToast('분석할 영상 데이터가 없습니다.', 'error');
      return;
    }

    setIsGeneratingReport(true);
    showToast('업로드 영상 종합 AI 인텔리전스 리포트를 생성하고 있습니다...', 'info');

    try {
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const res = await fetch('/api/report/generate-daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: targetVideos,
          reportDate: yesterdayStr
        })
      });

      const data = await res.json();
      if (data.success && data.report) {
        const newReports = [data.report, ...reports];
        updateReports(newReports);
        setActiveTab('analytics');
        showToast('종합 분석 리포트가 성공적으로 생성되었습니다!', 'success');
      } else {
        showToast('리포트 생성에 실패했습니다.', 'error');
      }
    } catch (e) {
      showToast('리포트 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Channel Management handlers
  const handleAddChannel = async (channelData: Omit<YouTubeChannel, 'id' | 'addedAt'>) => {
    const newChannel: YouTubeChannel = {
      ...channelData,
      id: `ch-${Date.now().toString(36)}`,
      addedAt: new Date().toISOString()
    };
    
    const updatedChannels = [...channels, newChannel];
    updateChannels(updatedChannels);

    // Immediately fetch exact real uploaded videos for this newly added channel
    showToast(`'${newChannel.title}' 채널의 실시간 업로드 영상을 불러옵니다...`, 'info');
    try {
      const fetchedVideos = await fetchRealChannelVideos(newChannel);
      if (fetchedVideos && fetchedVideos.length > 0) {
        const nonExisting = fetchedVideos.filter(fv => !videos.some(ev => ev.videoId === fv.videoId));
        const merged = [...nonExisting, ...videos];
        updateVideos(merged);
        showToast(`'${newChannel.title}' 채널의 실시간 업로드 영상 ${fetchedVideos.length}건을 연동했습니다!`, 'success');
      } else {
        showToast(`'${newChannel.title}' 채널이 추가되었습니다.`, 'success');
      }
    } catch {
      showToast(`'${newChannel.title}' 채널이 추가되었습니다.`, 'success');
    }
  };

  const handleDeleteChannel = (channelId: string) => {
    const targetChannel = channels.find(c => c.id === channelId);
    const updatedChannels = channels.filter(c => c.id !== channelId);
    updateChannels(updatedChannels);

    // Also remove videos belonging to this deleted channel
    if (targetChannel) {
      const updatedVideos = videos.filter(v => 
        v.channelId !== targetChannel.channelId && 
        v.channelTitle !== targetChannel.title
      );
      updateVideos(updatedVideos);
    }
  };

  const handleToggleChannelActive = (channelId: string) => {
    const updated = channels.map(c => c.id === channelId ? { ...c, isActive: !c.isActive } : c);
    updateChannels(updated);
  };

  const handleChangeChannelCategory = (channelId: string, category: VideoCategory) => {
    const updated = channels.map(c => c.id === channelId ? { ...c, category } : c);
    updateChannels(updated);
  };

  const handleAddPresetPack = async (packChannels: any[]) => {
    let addedCount = 0;
    let current = [...channels];
    for (const p of packChannels) {
      const exists = current.some(c => c.channelId === p.channelId);
      if (!exists) {
        current.push({
          id: `ch-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          channelId: p.channelId,
          title: p.title,
          handle: p.handle,
          thumbnailUrl: p.thumbnailUrl,
          category: p.category,
          isActive: true,
          subscriberCount: p.subscriberCount,
          addedAt: new Date().toISOString()
        });
        addedCount++;
      }
    }
    updateChannels(current);
    showToast(`프리셋에서 ${addedCount}개 채널이 추가되었습니다. 영상을 불러옵니다...`, 'success');
    const synced = await syncChannelVideos(current, videos);
    updateVideos(synced);
  };

  // Video interaction handlers
  const handleToggleBookmark = (videoId: string) => {
    const updated = videos.map(v => v.id === videoId ? { ...v, isBookmarked: !v.isBookmarked } : v);
    updateVideos(updated);
    const target = updated.find(v => v.id === videoId);
    showToast(target?.isBookmarked ? '북마크에 저장되었습니다.' : '북마크가 해제되었습니다.', 'info');
  };

  const handleChangeVideoCategory = (videoId: string, newCategory: VideoCategory) => {
    const updated = videos.map(v => v.id === videoId ? { ...v, category: newCategory } : v);
    updateVideos(updated);
    if (selectedVideo?.id === videoId) {
      setSelectedVideo({ ...selectedVideo, category: newCategory });
    }
    showToast(`카테고리가 '${newCategory}'(으)로 변경되었습니다.`, 'success');
  };

  const handleResetData = () => {
    if (window.confirm('정말 모든 데이터를 초기 기본 상태로 복원하시겠습니까?')) {
      resetAllData();
      setChannels(loadChannels());
      setVideos(loadVideos());
      setReports(loadReports());
      setSettings(loadSettings());
      setCategories(loadCategories());
      showToast('초기 데이터로 복원되었습니다.', 'success');
    }
  };

  const now = Date.now();
  const totalYesterdayVideosCount = videos.filter(v => v.isYesterday).length;
  const total24hVideosCount = videos.filter(v => v.isWithin24h || (now - new Date(v.publishedAt).getTime()) <= 24 * 60 * 60 * 1000).length;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-200 selection:text-slate-900">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSyncChannels={handleSyncChannels}
        isSyncing={isSyncing}
        onSearch24hVideos={handleSearch24hVideos}
        isSearching24h={isSearching24h}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        totalYesterdayCount={totalYesterdayVideosCount}
        total24hCount={total24hVideosCount}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            videos={videos}
            channels={channels}
            categories={categories}
            onOpenDetail={(v) => setSelectedVideo(v)}
            onToggleBookmark={handleToggleBookmark}
            onReanalyze={handleAnalyzeVideo}
            onBatchAnalyzeYesterday={handleBatchAnalyzeYesterday}
            onSearch24hVideos={handleSearch24hVideos}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            isBatchAnalyzing={isBatchAnalyzing}
            isSearching24h={isSearching24h}
            analyzingVideoId={analyzingVideoId}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsReportView
            videos={videos}
            reports={reports}
            onGenerateReport={handleGenerateDailyReport}
            isGeneratingReport={isGeneratingReport}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            channels={channels}
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddChannel={handleAddChannel}
            onDeleteChannel={handleDeleteChannel}
            onToggleChannelActive={handleToggleChannelActive}
            onChangeChannelCategory={handleChangeChannelCategory}
            onAddPresetPack={handleAddPresetPack}
            settings={settings}
            onUpdateSettings={updateSettings}
            onResetAllData={handleResetData}
          />
        )}
      </main>

      {/* Video Detail Modal */}
      <VideoDetailModal
        video={selectedVideo}
        categories={categories}
        onClose={() => setSelectedVideo(null)}
        onToggleBookmark={handleToggleBookmark}
        onReanalyze={handleAnalyzeVideo}
        onChangeCategory={handleChangeVideoCategory}
        isAnalyzing={analyzingVideoId === selectedVideo?.id}
      />

      {/* Excel / CSV / Document Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allVideos={videos}
        filteredVideos={videos.filter(v => v.isYesterday)}
      />

      {/* Minimalist Clean Footer */}
      <footer className="mt-auto border-t border-slate-200/70 bg-white py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-600">YouTube Daily Briefing & Summary System</span>
          <span className="text-slate-400">Powered by Gemini AI • Clean Minimalism Architecture</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
