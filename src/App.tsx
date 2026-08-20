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
  resetAllData
} from './utils/storage';
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
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  // Modal & Loading States
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [analyzingVideoId, setAnalyzingVideoId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    const initChannels = loadChannels();
    const initVideos = loadVideos();
    const initReports = loadReports();
    const initSettings = loadSettings();

    setChannels(initChannels);
    setVideos(initVideos);
    setReports(initReports);
    setSettings(initSettings);
  }, []);

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

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
    showToast('설정이 성공적으로 저장되었습니다.', 'success');
  };

  // 1. Sync Channels & Fetch New Videos
  const handleSyncChannels = async () => {
    setIsSyncing(true);
    showToast('등록된 채널의 최신 영상을 확인하고 있습니다...', 'info');

    try {
      const activeChannels = channels.filter(c => c.isActive);
      let newVideosFound = 0;
      let updatedVideosList = [...videos];

      for (const channel of activeChannels) {
        try {
          const res = await fetch('/api/youtube/fetch-rss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              channelId: channel.channelId,
              channelTitle: channel.title 
            })
          });

          const data = await res.json();
          if (data.success && data.videos && data.videos.length > 0) {
            for (const v of data.videos) {
              const exists = updatedVideosList.some(existing => existing.videoId === v.videoId);
              if (!exists) {
                const newVideo: YouTubeVideo = {
                  ...v,
                  category: channel.category,
                  createdAt: new Date().toISOString()
                };
                updatedVideosList = [newVideo, ...updatedVideosList];
                newVideosFound++;
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch RSS for ${channel.title}:`, err);
        }
      }

      updateVideos(updatedVideosList);
      if (newVideosFound > 0) {
        showToast(`${newVideosFound}개의 새로운 영상을 발견하여 업데이트했습니다!`, 'success');
      } else {
        showToast('모든 채널의 최신 영상 데이터가 최신 상태입니다.', 'success');
      }
    } catch (e) {
      showToast('영상 동기화 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Analyze Single Video
  const handleAnalyzeVideo = async (video: YouTubeVideo) => {
    setAnalyzingVideoId(video.id);
    showToast(`'${video.title.substring(0, 25)}...' AI 요약 생성 중...`, 'info');

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
        const updatedVideo: YouTubeVideo = {
          ...video,
          isSummarized: true,
          summary: data.summary,
          category: (data.summary.category as VideoCategory) || video.category
        };

        const newVideos = videos.map(v => v.id === video.id ? updatedVideo : v);
        updateVideos(newVideos);

        if (selectedVideo?.id === video.id) {
          setSelectedVideo(updatedVideo);
        }

        showToast('AI 핵심 주제 및 요약 생성이 완료되었습니다!', 'success');
      } else {
        showToast('요약 생성에 실패했습니다.', 'error');
      }
    } catch (err) {
      showToast('서버 연결 중 오류가 발생했습니다.', 'error');
    } finally {
      setAnalyzingVideoId(null);
    }
  };

  // 3. Batch Analyze All Yesterday Videos
  const handleBatchAnalyzeYesterday = async () => {
    const yesterdayVideos = videos.filter(v => v.isYesterday);
    if (yesterdayVideos.length === 0) {
      showToast('전일 업로드된 영상이 없습니다.', 'info');
      return;
    }

    setIsBatchAnalyzing(true);
    showToast(`전일 영상 ${yesterdayVideos.length}건의 일괄 요약을 시작합니다...`, 'info');

    let completed = 0;
    let currentVideos = [...videos];

    for (const video of yesterdayVideos) {
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
    showToast(`전일 영상 ${completed}건의 AI 요약이 모두 완료되었습니다!`, 'success');
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
    showToast('전일 영상 종합 AI 인텔리전스 리포트를 생성하고 있습니다...', 'info');

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
        showToast('전일 종합 분석 리포트가 성공적으로 생성되었습니다!', 'success');
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
  const handleAddChannel = (channelData: Omit<YouTubeChannel, 'id' | 'addedAt'>) => {
    const newChannel: YouTubeChannel = {
      ...channelData,
      id: `ch-${Date.now().toString(36)}`,
      addedAt: new Date().toISOString()
    };
    updateChannels([...channels, newChannel]);
  };

  const handleDeleteChannel = (channelId: string) => {
    const updated = channels.filter(c => c.id !== channelId);
    updateChannels(updated);
  };

  const handleToggleChannelActive = (channelId: string) => {
    const updated = channels.map(c => c.id === channelId ? { ...c, isActive: !c.isActive } : c);
    updateChannels(updated);
  };

  const handleChangeChannelCategory = (channelId: string, category: VideoCategory) => {
    const updated = channels.map(c => c.id === channelId ? { ...c, category } : c);
    updateChannels(updated);
  };

  const handleAddPresetPack = (packChannels: any[]) => {
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
    showToast(`프리셋 패키지에서 ${addedCount}개 채널이 추가되었습니다!`, 'success');
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
      showToast('초기 데이터로 복원되었습니다.', 'success');
    }
  };

  const totalYesterdayVideosCount = videos.filter(v => v.isYesterday).length;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-200 selection:text-slate-900">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSyncChannels={handleSyncChannels}
        isSyncing={isSyncing}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        totalYesterdayCount={totalYesterdayVideosCount}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            videos={videos}
            channels={channels}
            onOpenDetail={(v) => setSelectedVideo(v)}
            onToggleBookmark={handleToggleBookmark}
            onReanalyze={handleAnalyzeVideo}
            onBatchAnalyzeYesterday={handleBatchAnalyzeYesterday}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            isBatchAnalyzing={isBatchAnalyzing}
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
