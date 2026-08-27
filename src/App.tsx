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
import { fetchRealChannelVideos, searchAndSummarize24hVideos, generateClientFallbackSummary, syncAndRepairChannels, calculateVideoTimeStatus } from './utils/youtubeService';
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
  const [isProcessing24h, setIsProcessing24h] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [analyzingVideoId, setAnalyzingVideoId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Sync real videos for channels in parallel - retaining up to 72 hours for today, 24h, and yesterday
  const syncChannelVideos = useCallback(async (targetChannels: YouTubeChannel[], existingVideos: YouTubeVideo[]) => {
    const active = targetChannels.filter(c => c.isActive);
    if (active.length === 0) return existingVideos;

    const nowEpoch = Date.now();
    let updatedList = [...existingVideos];

    try {
      // 1. Try unified fast batch endpoint first (<1s for all channels via RSS)
      const batchRes = await searchAndSummarize24hVideos(active, false);
      if (batchRes && batchRes.videos && batchRes.videos.length > 0) {
        for (const v of batchRes.videos) {
          const existsIdx = updatedList.findIndex(e => e.videoId === v.videoId);
          if (existsIdx >= 0) {
            updatedList[existsIdx] = {
              ...v,
              isSummarized: updatedList[existsIdx].isSummarized || v.isSummarized,
              summary: updatedList[existsIdx].summary || v.summary,
              isBookmarked: updatedList[existsIdx].isBookmarked
            };
          } else {
            updatedList = [v, ...updatedList];
          }
        }
      } else {
        // Fallback: per-channel fetch
        const results = await Promise.allSettled(
          active.map(channel => fetchRealChannelVideos(channel))
        );
        for (const res of results) {
          if (res.status === 'fulfilled' && res.value && res.value.length > 0) {
            for (const v of res.value) {
              const existsIdx = updatedList.findIndex(e => e.videoId === v.videoId);
              if (existsIdx >= 0) {
                updatedList[existsIdx] = {
                  ...v,
                  isSummarized: updatedList[existsIdx].isSummarized || v.isSummarized,
                  summary: updatedList[existsIdx].summary || v.summary,
                  isBookmarked: updatedList[existsIdx].isBookmarked
                };
              } else {
                updatedList = [v, ...updatedList];
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Sync videos error:', e);
    }

    // Filter valid channels and retain up to 30 days (720h) with fresh timeStatus
    const validChannelIds = new Set(targetChannels.map(c => c.channelId));
    const validTitles = new Set(targetChannels.map(c => c.title));
    const cleanedList = updatedList
      .filter(v => {
        if (!validChannelIds.has(v.channelId) && !validTitles.has(v.channelTitle)) return false;
        const pubTime = new Date(v.publishedAt || v.createdAt || 0).getTime();
        const diffHours = (nowEpoch - pubTime) / (1000 * 60 * 60);
        return diffHours >= -0.5 && diffHours <= 720.0;
      })
      .map(v => {
        const timeStatus = calculateVideoTimeStatus(v.publishedAt, nowEpoch);
        return {
          ...v,
          isWithin24h: timeStatus.isWithin24h,
          isToday: timeStatus.isToday,
          isYesterday: timeStatus.isYesterday,
          relativeTimeText: timeStatus.relativeTimeText || v.relativeTimeText
        };
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

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

    // ALWAYS automatically perform a live background sync on app startup
    // This immediately brings in the latest videos (5m ago, 1h ago, etc.) from all active channels
    if (initChannels.length > 0) {
      syncChannelVideos(initChannels, validVideos).then(synced => {
        if (synced && synced.length > 0) {
          setVideos(synced);
          saveVideos(synced);
        }
      });
    }

    // Auto-repair channel metadata if any dummy or un-resolved IDs exist
    syncAndRepairChannels(initChannels).then(async ({ updatedChannels, hasChanges }) => {
      if (hasChanges) {
        setChannels(updatedChannels);
        saveChannels(updatedChannels);
        const synced = await syncChannelVideos(updatedChannels, validVideos);
        if (synced && synced.length > 0) {
          setVideos(synced);
          saveVideos(synced);
        }
      }
    });
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

  // 1. Unified 24H Refresh & AI Summarize Handler (Combined Function)
  const handleRefreshAndSummarize24h = async () => {
    const activeChannels = channels.filter(c => c.isActive);
    if (activeChannels.length === 0) {
      showToast('활성화된 모니터링 채널이 없습니다. [채널 설정] 탭에서 채널을 등록해주세요.', 'info');
      return;
    }

    setIsProcessing24h(true);
    showToast('실시간 채널 최신 영상(오늘/24H/전일)을 검색하고 Gemini AI 요약을 진행합니다...', 'info');

    try {
      // Step A: Search / Fetch latest videos from active channels
      let freshVideos: YouTubeVideo[] = [];
      const searchResult = await searchAndSummarize24hVideos(activeChannels);
      
      if (searchResult && Array.isArray(searchResult.videos) && searchResult.videos.length > 0) {
        freshVideos = searchResult.videos;
      } else {
        // Fallback to syncChannelVideos
        freshVideos = await syncChannelVideos(channels, videos);
      }

      // Merge fresh videos with existing videos (preserving AI summaries and bookmarks)
      const nowEpoch = Date.now();
      let mergedMap = new Map<string, YouTubeVideo>();

      // Put existing videos in map first
      for (const ex of videos) {
        mergedMap.set(ex.videoId, ex);
      }

      // Overwrite/insert fresh videos
      for (const f of freshVideos) {
        const existing = mergedMap.get(f.videoId);
        if (existing) {
          mergedMap.set(f.videoId, {
            ...f,
            isSummarized: f.isSummarized || existing.isSummarized,
            summary: f.summary || existing.summary,
            isBookmarked: existing.isBookmarked
          });
        } else {
          mergedMap.set(f.videoId, f);
        }
      }

      // Clean list: keep within 30 days (720 hours) and calculate fresh time status
      const validChannelsSet = new Set(channels.map(c => c.channelId));
      const validTitlesSet = new Set(channels.map(c => c.title));

      const cleanedList = Array.from(mergedMap.values())
        .filter(v => {
          if (!validChannelsSet.has(v.channelId) && !validTitlesSet.has(v.channelTitle)) return false;
          const pubTime = new Date(v.publishedAt || v.createdAt || 0).getTime();
          const diffHours = (nowEpoch - pubTime) / (1000 * 60 * 60);
          return diffHours >= -0.5 && diffHours <= 720.0;
        })
        .map(v => {
          const timeStatus = calculateVideoTimeStatus(v.publishedAt, nowEpoch);
          return {
            ...v,
            isWithin24h: timeStatus.isWithin24h,
            isToday: timeStatus.isToday,
            isYesterday: timeStatus.isYesterday,
            relativeTimeText: timeStatus.relativeTimeText || v.relativeTimeText
          };
        })
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      // Immediately render the fresh video list to the UI without waiting for AI analysis
      updateVideos(cleanedList);

      // Step B: Automatically perform AI Summary for unsummarized videos (prioritizing today/24h)
      const unsummarized = cleanedList.filter(v => (!v.isSummarized || !v.summary) && (v.isToday || v.isWithin24h));
      let updatedVideosList = [...cleanedList];

      if (unsummarized.length > 0) {
        showToast(`수집된 ${unsummarized.length}건의 주요 영상을 Gemini AI로 자동 분석 중...`, 'info');
        
        // Summarize up to 6 unsummarized videos concurrently
        const summarizePromises = unsummarized.slice(0, 6).map(async (v) => {
          try {
            const res = await fetch('/api/youtube/analyze-video', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoId: v.videoId,
                videoTitle: v.title,
                videoDescription: v.description,
                channelTitle: v.channelTitle,
                category: v.category,
                detailLevel: settings.summaryDetailLevel || 'standard'
              })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.summary) {
                return {
                  ...v,
                  isSummarized: true,
                  summary: data.summary,
                  fullDescription: data.fullDescription || v.description,
                  transcript: data.transcript || '',
                  category: (data.summary.category as VideoCategory) || v.category
                };
              }
            }
          } catch (e) {
            console.warn(`Failed to auto-summarize video ${v.title}:`, e);
          }
          return v;
        });

        const summarizedResults = await Promise.allSettled(summarizePromises);
        for (const res of summarizedResults) {
          if (res.status === 'fulfilled' && res.value) {
            const sumVid = res.value;
            const idx = updatedVideosList.findIndex(item => item.id === sumVid.id);
            if (idx >= 0) {
              updatedVideosList[idx] = sumVid;
            }
          }
        }
      }

      // Sort newest first
      updatedVideosList.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      // Save to state and storage
      updateVideos(updatedVideosList);

      const todayCount = updatedVideosList.filter(v => v.isToday).length;
      const within24Count = updatedVideosList.filter(v => v.isWithin24h).length;
      const totalSummarized = updatedVideosList.filter(v => v.isSummarized).length;

      if (updatedVideosList.length > 0) {
        showToast(`영상 새로고침 완료! 오늘(당일) ${todayCount}건, 24시간 이내 ${within24Count}건, AI 요약 ${totalSummarized}건 반영`, 'success');
      } else {
        showToast('등록된 채널에서 최근 업로드된 새로운 영상을 찾지 못했습니다.', 'info');
      }
    } catch (e) {
      console.error('Error during refresh & summarize:', e);
      showToast('영상 새로고침 및 요약 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing24h(false);
    }
  };

  // Legacy individual handlers (if needed by subcomponents)
  const handleSyncChannels = handleRefreshAndSummarize24h;
  const handleSearch24hVideos = handleRefreshAndSummarize24h;

  // 1-2. Sync & Repair Channel Metadata and Fetch Videos
  const handleSyncRepairChannels = async () => {
    showToast('등록된 채널의 실시간 YouTube ID 및 프로필 정보를 확인하고 복구합니다...', 'info');
    try {
      const { updatedChannels, hasChanges } = await syncAndRepairChannels(channels);
      if (hasChanges) {
        updateChannels(updatedChannels);
      }
      const syncedVideos = await syncChannelVideos(updatedChannels, videos);
      updateVideos(syncedVideos);
      showToast('채널 정보 동기화 및 영상 수집 복구가 완료되었습니다!', 'success');
    } catch (e) {
      showToast('채널 정보 동기화 중 오류가 발생했습니다.', 'error');
    }
  };

  // 2. Analyze Single Video
  const handleAnalyzeVideo = async (video: YouTubeVideo, overrideDetailLevel?: 'concise' | 'standard' | 'in-depth') => {
    setAnalyzingVideoId(video.id);
    const detailMode = overrideDetailLevel || settings.summaryDetailLevel || 'standard';
    showToast(`'${video.title.substring(0, 22)}...' ${detailMode === 'in-depth' ? '심층 정밀' : ''} AI 분석 중...`, 'info');

    let summaryData: any = null;
    let isAi = false;
    let fetchedFullDesc = video.fullDescription;
    let fetchedTranscript = video.transcript;

    try {
      const res = await fetch('/api/youtube/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.videoId,
          videoTitle: video.title,
          videoDescription: video.description,
          fullDescription: video.fullDescription,
          transcript: video.transcript,
          channelTitle: video.channelTitle,
          category: video.category,
          detailLevel: detailMode
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.summary) {
          summaryData = data.summary;
          isAi = !!data.aiPowered;
          if (data.fullDescription) fetchedFullDesc = data.fullDescription;
          if (data.transcript) fetchedTranscript = data.transcript;
        }
      }
    } catch (err) {
      console.warn('Backend analyze error, using client fallback:', err);
    }

    // If server failed or summaryData is null, create smart contextual client fallback
    if (!summaryData) {
      summaryData = generateClientFallbackSummary({
        ...video,
        fullDescription: fetchedFullDesc
      });
    }

    const updatedVideo: YouTubeVideo = {
      ...video,
      isSummarized: true,
      summary: summaryData,
      fullDescription: fetchedFullDesc || video.fullDescription,
      transcript: fetchedTranscript || video.transcript,
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
        ? `✨ Gemini 3.7 AI 정밀 영상 분석 및 상세 요약이 완료되었습니다! ${fetchedTranscript ? '(자막 분석 포함)' : ''}` 
        : '영상 상세 분석 및 핵심 요약이 완료되었습니다!', 
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

  // 4.5 Quick Single Video / Search Query Direct Instant AI Analysis
  const [isQuickAnalyzing, setIsQuickAnalyzing] = useState(false);

  const handleQuickAnalyze = async (input: string) => {
    if (!input.trim()) return;
    setIsQuickAnalyzing(true);
    showToast(`"${input.slice(0, 25)}..." 실시간 정보를 추출하고 Gemini AI 심층 분석을 시작합니다...`, 'info');

    try {
      const res = await fetch('/api/youtube/quick-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          detailLevel: settings.summaryDetailLevel
        })
      });

      const data = await res.json();
      if (data.success && data.video) {
        const newVid: YouTubeVideo = data.video;
        const existsIdx = videos.findIndex(v => v.videoId === newVid.videoId);
        let updated: YouTubeVideo[] = [];
        if (existsIdx >= 0) {
          updated = [...videos];
          updated[existsIdx] = newVid;
        } else {
          updated = [newVid, ...videos];
        }
        updateVideos(updated);
        setSelectedVideo(newVid);
        showToast(`'${newVid.title.slice(0, 25)}' AI 분석 완료! 세부 요약창을 열었습니다.`, 'success');
      } else {
        showToast(data.error || '영상 실시간 분석에 실패했습니다.', 'error');
      }
    } catch (e: any) {
      console.error('Quick analyze error:', e);
      showToast(e?.message || '실시간 분석 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsQuickAnalyzing(false);
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
    let currentCategories = [...categories];

    for (const p of packChannels) {
      if (p.category && !currentCategories.includes(p.category)) {
        currentCategories.push(p.category);
      }
      const exists = current.some(c => 
        c.channelId === p.channelId || 
        (c.handle && p.handle && c.handle.toLowerCase() === p.handle.toLowerCase())
      );
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
    updateCategories(currentCategories);

    showToast(
      addedCount > 0 
        ? `프리셋에서 ${addedCount}개 채널이 추가되었습니다. 최신 영상을 동기화합니다...` 
        : '선택한 프리셋 채널의 최신 영상을 새로고침합니다...', 
      'success'
    );
    
    // Switch to dashboard view so user immediately sees newly added videos
    setActiveTab('dashboard');

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
        onRefreshAndSummarize24h={handleRefreshAndSummarize24h}
        isProcessing={isProcessing24h}
        onOpenExportModal={() => setIsExportModalOpen(true)}
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
            onRefreshAndSummarize24h={handleRefreshAndSummarize24h}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onQuickAnalyze={handleQuickAnalyze}
            isBatchAnalyzing={isBatchAnalyzing}
            isProcessing={isProcessing24h}
            isQuickAnalyzing={isQuickAnalyzing}
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
            onSyncRepairChannels={handleSyncRepairChannels}
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
