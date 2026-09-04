import React, { useState, useRef, useEffect } from 'react';
import { YouTubeChannel, VideoCategory, AppSettings } from '../types';
import { CHANNEL_PRESET_PACKS } from '../data/defaultChannels';
import { 
  lookupYouTubeChannel, 
  getYouTubeChannelUrl, 
  searchYouTubeChannels,
  YouTubeChannelSearchResult,
  getStoredYoutubeApiKey,
  setStoredYoutubeApiKey,
  checkServerYoutubeApiStatus,
  testYoutubeApiKey
} from '../utils/youtubeService';
import { 
  Plus, 
  Trash2, 
  Tv2, 
  Settings, 
  Check, 
  Sliders, 
  Layers, 
  Sparkles, 
  Download, 
  Upload, 
  RotateCcw, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  PackagePlus, 
  FolderPlus, 
  Tag, 
  X,
  RefreshCw,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  ListFilter,
  Youtube,
  Key,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useToast } from './Toast';

const POPULAR_SEARCH_KEYWORDS = [
  '박세리',
  '슈카월드',
  '삼프로TV',
  '경읽남',
  '조코딩',
  '잇섭',
  '안될과학',
  '티타임즈TV',
  'SBS 뉴스',
  '월급쟁이부자들',
  '김작가TV',
  '노마드코더',
  '사물궁이'
];

interface SettingsViewProps {
  channels: YouTubeChannel[];
  categories: string[];
  onAddCategory: (categoryName: string) => boolean;
  onDeleteCategory: (categoryName: string) => void;
  onAddChannel: (channel: Omit<YouTubeChannel, 'id' | 'addedAt'>) => void;
  onDeleteChannel: (channelId: string) => void;
  onToggleChannelActive: (channelId: string) => void;
  onChangeChannelCategory: (channelId: string, category: VideoCategory) => void;
  onAddPresetPack: (packChannels: any[]) => void;
  onSyncRepairChannels?: () => Promise<void>;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetAllData: () => void;
}

const POPULAR_CATEGORY_PRESETS = [
  'AI/인공지능',
  '부동산/청약',
  '글로벌/해외이슈',
  '건강/운동',
  '디자인/UIUX',
  '게임/e스포츠',
  '어학/영어',
  '자기계발/동기부여'
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  channels,
  categories,
  onAddCategory,
  onDeleteCategory,
  onAddChannel,
  onDeleteChannel,
  onToggleChannelActive,
  onChangeChannelCategory,
  onAddPresetPack,
  onSyncRepairChannels,
  settings,
  onUpdateSettings,
  onResetAllData
}) => {
  const { showToast } = useToast();

  // YouTube API Key State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [storedApiKey, setStoredApiKey] = useState('');
  const [hasServerApiKey, setHasServerApiKey] = useState(false);
  const [serverKeyMasked, setServerKeyMasked] = useState<string | null>(null);
  const [serverKeySource, setServerKeySource] = useState<string | null>(null);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [showKeyPlaintext, setShowKeyPlaintext] = useState(false);
  const [showApiKeySection, setShowApiKeySection] = useState(true);
  const [apiKeyStatusMessage, setApiKeyStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Initialize API Key Status on Mount
  useEffect(() => {
    const localKey = getStoredYoutubeApiKey();
    setStoredApiKey(localKey);
    setApiKeyInput(localKey);

    checkServerYoutubeApiStatus().then(status => {
      setHasServerApiKey(status.hasServerApiKey);
      setServerKeyMasked(status.keyMasked);
      setServerKeySource(status.source || null);
    });
  }, []);

  const handleSaveAndTestApiKey = async () => {
    const keyToTest = apiKeyInput.trim();
    if (!keyToTest) {
      setStoredYoutubeApiKey('');
      setStoredApiKey('');
      setApiKeyStatusMessage({ type: 'info', text: 'API 키가 삭제되었습니다. (기본 모드로 동작)' });
      showToast('API 키가 삭제되었습니다.', 'info');
      return;
    }

    setIsTestingApiKey(true);
    setApiKeyStatusMessage(null);
    try {
      const result = await testYoutubeApiKey(keyToTest);
      if (result.success) {
        setStoredYoutubeApiKey(keyToTest);
        setStoredApiKey(keyToTest);
        setApiKeyStatusMessage({ type: 'success', text: 'Google 공식 YouTube Data API v3 인증 성공! 배포 환경에서도 100% 안정적으로 모든 채널이 검색됩니다.' });
        showToast('YouTube Data API v3 인증 및 저장이 완료되었습니다!', 'success');
      } else {
        setApiKeyStatusMessage({ type: 'error', text: result.message });
        showToast(result.message, 'error');
      }
    } catch (e: any) {
      setApiKeyStatusMessage({ type: 'error', text: '검증 중 오류 발생: ' + e.message });
      showToast('API 키 검증 실패', 'error');
    } finally {
      setIsTestingApiKey(false);
    }
  };

  // Search & Add Channel Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDefaultCategory, setSelectedDefaultCategory] = useState<VideoCategory>(categories[0] || 'IT/테크');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeChannelSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [channelCategoryOverrides, setChannelCategoryOverrides] = useState<Record<string, VideoCategory>>({});

  // Accurate duplicate check against the current active channels list
  const isChannelAlreadyRegistered = (target: { channelId?: string; handle?: string; title?: string }) => {
    return channels.some(c => {
      // 1. Exact match by channelId
      if (c.channelId && target.channelId && c.channelId === target.channelId) {
        return true;
      }
      // 2. Exact match by handle (only if both handles are valid and contain real text beyond '@')
      const cHandle = (c.handle || '').replace(/^@/, '').trim().toLowerCase();
      const tHandle = (target.handle || '').replace(/^@/, '').trim().toLowerCase();
      if (cHandle.length >= 2 && tHandle.length >= 2 && cHandle === tHandle) {
        return true;
      }
      return false;
    });
  };

  // Direct Manual Add Toggle
  const [showDirectAdd, setShowDirectAdd] = useState(false);
  const [directInput, setDirectInput] = useState('');
  const [isDirectAdding, setIsDirectAdding] = useState(false);

  // Preset Pack Preview Modal State
  const [previewPack, setPreviewPack] = useState<typeof CHANNEL_PRESET_PACKS[0] | null>(null);
  const [selectedPackChannelIds, setSelectedPackChannelIds] = useState<Set<string>>(new Set());

  // Channel List Filter & Sync State
  const [isSyncingChannels, setIsSyncingChannels] = useState(false);
  const [searchChannelFilter, setSearchChannelFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [channelToDelete, setChannelToDelete] = useState<YouTubeChannel | null>(null);

  // Category Management State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  // Focus input when category creation opens
  useEffect(() => {
    if (isCreatingCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [isCreatingCategory]);

  // Keep selectedDefaultCategory valid if categories change
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedDefaultCategory)) {
      setSelectedDefaultCategory(categories[0]);
    }
  }, [categories, selectedDefaultCategory]);

  // Handle Category Creation
  const handleCreateCategory = (nameToCreate?: string) => {
    const targetName = (nameToCreate || newCategoryInput).trim();
    if (!targetName) {
      showToast('카테고리 이름을 입력해주세요.', 'error');
      return;
    }

    const success = onAddCategory(targetName);
    if (success) {
      setNewCategoryInput('');
      setIsCreatingCategory(false);
      setSelectedDefaultCategory(targetName);
    }
  };

  // 1. Search YouTube Channels First
  const handleSearchChannels = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      showToast('검색할 채널명, @핸들, 또는 채널 URL을 입력해주세요.', 'error');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchYouTubeChannels(query);
      setSearchResults(results);
      if (results.length === 0) {
        showToast(`'${query}'에 대한 검색 결과가 없습니다.`, 'info');
      } else {
        const exact = results.find(r => r.isExactMatch);
        if (exact) {
          showToast(`'${exact.title}' 일치 채널을 찾았습니다. [채널 확인] 후 추가하세요.`, 'success');
        } else {
          showToast(`'${query}' 관련 유튜브 채널 ${results.length}건을 검색했습니다.`, 'success');
        }
      }
    } catch (err: any) {
      showToast('채널 검색 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 1-1. Search by Quick Keyword Click
  const handleSearchWithKeyword = async (keyword: string) => {
    setSearchQuery(keyword);
    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchYouTubeChannels(keyword);
      setSearchResults(results);
      if (results.length === 0) {
        showToast(`'${keyword}'에 대한 검색 결과가 없습니다.`, 'info');
      } else {
        const exact = results.find(r => r.isExactMatch);
        if (exact) {
          showToast(`'${exact.title}' 채널을 찾았습니다. [채널 확인] 후 추가하세요.`, 'success');
        } else {
          showToast(`'${keyword}' 관련 유튜브 채널 ${results.length}건을 찾았습니다.`, 'success');
        }
      }
    } catch (err: any) {
      showToast('채널 검색 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Select & Add Channel from Search Results
  const handleSelectChannelToAdd = (candidate: YouTubeChannelSearchResult) => {
    const isAlreadyAdded = isChannelAlreadyRegistered(candidate);

    if (isAlreadyAdded) {
      showToast(`'${candidate.title}' 채널은 이미 등록되어 있습니다.`, 'info');
      return;
    }

    const assignedCategory = channelCategoryOverrides[candidate.channelId] || candidate.category || selectedDefaultCategory;

    onAddChannel({
      channelId: candidate.channelId,
      title: candidate.title,
      handle: candidate.handle,
      description: candidate.description,
      thumbnailUrl: candidate.thumbnailUrl,
      category: assignedCategory,
      isActive: true,
      subscriberCount: candidate.subscriberCount
    });

    showToast(`'${candidate.title}' 채널이 성공적으로 추가되었습니다!`, 'success');
  };

  // 3. Direct Manual Addition Fallback
  const handleDirectAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = directInput.trim();
    if (!input) {
      showToast('채널 URL, @핸들 또는 ID를 입력해주세요.', 'error');
      return;
    }

    setIsDirectAdding(true);
    try {
      const channelData = await lookupYouTubeChannel(input);
      if (channelData) {
        const exists = isChannelAlreadyRegistered(channelData);

        if (exists) {
          showToast('이미 등록된 유튜브 채널입니다.', 'info');
          setIsDirectAdding(false);
          return;
        }

        onAddChannel({
          channelId: channelData.channelId,
          title: channelData.title,
          handle: channelData.handle,
          description: channelData.description,
          thumbnailUrl: channelData.thumbnailUrl,
          category: selectedDefaultCategory,
          isActive: true,
          subscriberCount: channelData.subscriberCount
        });

        setDirectInput('');
        setShowDirectAdd(false);
        showToast(`'${channelData.title}' 채널이 추가되었습니다!`, 'success');
      } else {
        showToast('채널 정보를 찾을 수 없습니다.', 'error');
      }
    } catch {
      showToast('채널 추가 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsDirectAdding(false);
    }
  };

  // 4. Open Preset Pack Preview Modal
  const handleOpenPresetPreview = (pack: typeof CHANNEL_PRESET_PACKS[0]) => {
    setPreviewPack(pack);
    // Pre-select all channels that are not already registered
    const initialSelected = new Set<string>();
    pack.channels.forEach(ch => {
      const isAlreadyAdded = isChannelAlreadyRegistered(ch);
      if (!isAlreadyAdded) {
        initialSelected.add(ch.channelId);
      }
    });
    setSelectedPackChannelIds(initialSelected);
  };

  // 5. Confirm Adding Selected Channels from Preset Pack
  const handleConfirmAddPresetPack = () => {
    if (!previewPack) return;

    const channelsToAdd = previewPack.channels.filter(ch => selectedPackChannelIds.has(ch.channelId));
    if (channelsToAdd.length === 0) {
      showToast('추가할 채널을 1개 이상 선택해주세요.', 'info');
      return;
    }

    onAddPresetPack(channelsToAdd);
    setPreviewPack(null);
    showToast(`'${previewPack.name}'에서 ${channelsToAdd.length}개 채널이 추가되었습니다!`, 'success');
  };

  // Filter channels list by search query and category filter
  const filteredChannels = channels.filter(c => {
    if (selectedCategoryFilter !== 'ALL' && c.category !== selectedCategoryFilter) {
      return false;
    }
    if (!searchChannelFilter.trim()) return true;
    const q = searchChannelFilter.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.handle?.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-800" />
            유튜브 채널 관리 및 요약 설정
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            채널을 검색하여 원하는 채널을 정확하게 선택 추가하고, 추천 프리셋 패키지 목록을 미리 확인 후 일괄 등록하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200">
            총 {channels.length}개 채널 • {categories.length}개 카테고리
          </span>
        </div>
      </div>

      {/* 0. Official YouTube Data API v3 Key Setup Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
                <Key className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                YouTube Data API v3 연동 (배포 환경 검색 필수)
              </h3>
              {(hasServerApiKey || storedApiKey) ? (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[11px] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  공식 API 활성화됨
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[11px] font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  API 키 등록 권장
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              💡 <b>배포 환경에서 검색이 안 되던 이유</b>: Cloud Run 등 공용 클라우드 서버의 데이터센터 IP는 YouTube의 봇 방어 시스템에 의해 비공식 스크래핑이 자동 차단됩니다. 
              직접 발급받으신 <b className="text-white underline decoration-red-400">YouTube Data API v3 키</b>를 등록하시면 Google 공식 API를 통해 전 세계 모든 채널이 0.1초 만에 100% 무결점으로 실시간 검색됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowApiKeySection(prev => !prev)}
            className="text-xs text-slate-400 hover:text-white font-medium underline underline-offset-2 shrink-0 py-1"
          >
            {showApiKeySection ? '접기' : 'API 키 설정 열기'}
          </button>
        </div>

        {showApiKeySection && (
          <div className="space-y-3 pt-2 border-t border-slate-700/60">
            {/* Server status indicator */}
            {hasServerApiKey ? (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg flex items-center justify-between text-xs text-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <b>.env 파일 환경 변수</b>({serverKeySource || 'YOUTUBE_API_KEY'})에서 공식 YouTube API 키가 정상적으로 로드되었습니다! ({serverKeyMasked})
                  </span>
                </div>
                <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-mono shrink-0 ml-2">.env 연동 완료</span>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-lg flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    프로젝트 루트의 <code>.env</code> 파일에 <code>YOUTUBE_API_KEY=발급받은키</code>를 작성하시면 자동으로 읽어와 적용됩니다.
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Auto Detect</span>
              </div>
            )}

            {/* Input & Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKeyPlaintext ? 'text' : 'password'}
                  placeholder={hasServerApiKey ? `.env 파일(${serverKeySource || '환경변수'})에서 이미 API 키를 사용 중입니다 (새 키 입력 시 덮어쓰기)` : "Google Cloud에서 발급받은 YouTube Data API v3 키를 붙여넣으세요 (예: AIzaSy...)"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full pl-3 pr-16 py-2 text-xs sm:text-sm bg-slate-950/60 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all font-mono"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowKeyPlaintext(prev => !prev)}
                    title={showKeyPlaintext ? '키 숨기기' : '키 표시'}
                    className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                  >
                    {showKeyPlaintext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {apiKeyInput && (
                    <button
                      type="button"
                      onClick={() => setApiKeyInput('')}
                      title="지우기"
                      className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveAndTestApiKey}
                  disabled={isTestingApiKey}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 h-[38px] cursor-pointer"
                >
                  {isTestingApiKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>검증 중...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{apiKeyInput.trim() ? '인증 및 저장' : '키 삭제'}</span>
                    </>
                  )}
                </button>
                {storedApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKeyInput('');
                      setStoredYoutubeApiKey('');
                      setStoredApiKey('');
                      setApiKeyStatusMessage({ type: 'info', text: '저장된 API 키가 삭제되었습니다.' });
                      showToast('API 키가 삭제되었습니다.', 'info');
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs rounded-lg transition-colors h-[38px]"
                  >
                    초기화
                  </button>
                )}
              </div>
            </div>

            {/* Status Message */}
            {apiKeyStatusMessage && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                apiKeyStatusMessage.type === 'success' 
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                  : apiKeyStatusMessage.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-300'
              }`}>
                {apiKeyStatusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {apiKeyStatusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                <span>{apiKeyStatusMessage.text}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 flex-wrap gap-2">
              <span>* 입력된 API 키는 브라우저 로컬스토리지에 안전하게 보관되며 검색 시 공식 API 엔드포인트 호출에 사용됩니다.</span>
              <a
                href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:underline flex items-center gap-1 font-medium"
              >
                Google Cloud Console에서 무료 키 발급받기
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 1. Search-First Add YouTube Channel Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-700" />
              유튜브 채널 검색 후 선택 추가
              {(hasServerApiKey || storedApiKey) ? (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                  공식 API 검색 연동 중
                </span>
              ) : null}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              채널명, @핸들, 키워드 또는 채널 URL을 검색하면 일치하는 채널 목록에서 확인 후 안전하게 추가할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDirectAdd(prev => !prev)}
            className="text-xs text-slate-500 hover:text-slate-900 font-medium underline underline-offset-2"
          >
            {showDirectAdd ? '검색 모드로 전환' : 'URL/핸들 직접 입력 모드'}
          </button>
        </div>

        {/* Standard Search Bar */}
        {!showDirectAdd ? (
          <div className="space-y-3">
            <form onSubmit={handleSearchChannels} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="채널명 또는 키워드 입력 (예: 슈카월드, 삼프로TV, 경읽남, 조코딩, 잇섭, SBS 뉴스, 안될과학...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all text-slate-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setHasSearched(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 h-[38px] cursor-pointer"
              >
                {isSearching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>{isSearching ? '검색 중...' : '채널 검색'}</span>
              </button>
            </form>

            {/* Quick Popular Keywords Tags */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 shrink-0 mr-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                추천 검색어:
              </span>
              {POPULAR_SEARCH_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleSearchWithKeyword(kw)}
                  className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 border border-slate-200/80 hover:border-red-200 transition-colors cursor-pointer"
                >
                  #{kw}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Direct URL / Handle Manual Add Form */
          <form onSubmit={handleDirectAdd} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">채널 URL / @핸들 / ID 직접 입력</span>
              <button
                type="button"
                onClick={() => setShowDirectAdd(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="예: https://youtube.com/@TTimesTV 또는 @TTimesTV"
                value={directInput}
                onChange={(e) => setDirectInput(e.target.value)}
                className="sm:col-span-8 px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-900"
              />
              <select
                value={selectedDefaultCategory}
                onChange={(e) => setSelectedDefaultCategory(e.target.value as VideoCategory)}
                className="sm:col-span-2 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isDirectAdding}
                className="sm:col-span-2 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Plus className={`w-3.5 h-3.5 ${isDirectAdding ? 'animate-spin' : ''}`} />
                <span>{isDirectAdding ? '확인 중...' : '즉시 추가'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Search Results Display Area */}
        {hasSearched && (
          <div className="pt-3 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>검색 결과 ({searchResults.length}개 채널 발견)</span>
                <span className="text-[11px] font-normal text-slate-500 ml-1">
                  • <strong>[채널 확인]</strong> 버튼을 누르면 해당 유튜브 채널로 바로 이동하여 확인할 수 있습니다.
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 self-end sm:self-auto cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>검색 결과 닫기</span>
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-4">
                {/* 1. Exact / High-Relevance Matching Hero Card */}
                {(() => {
                  const exactMatch = searchResults.find(r => r.isExactMatch) || searchResults[0];
                  if (!exactMatch) return null;

                  const isAlreadyAdded = isChannelAlreadyRegistered(exactMatch);
                  const channelCategory = channelCategoryOverrides[exactMatch.channelId] || exactMatch.category || selectedDefaultCategory;
                  const channelUrl = getYouTubeChannelUrl(exactMatch);

                  return (
                    <div className="p-4 rounded-xl border-2 border-red-200/90 bg-gradient-to-r from-red-50/40 via-white to-amber-50/20 shadow-xs space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-red-100/70 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs font-bold text-red-950">
                            {exactMatch.isExactMatch ? '🎯 찾으시는 동일 채널이 맞나요?' : '⭐ 대표 추천 채널'}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700">
                            {exactMatch.matchReason || '채널명 일치'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                          채널을 확인한 후 안전하게 추가하세요
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <a
                            href={channelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative group shrink-0 block"
                            title={`'${exactMatch.title}' 유튜브 채널로 이동하여 확인`}
                          >
                            <img
                              src={exactMatch.thumbnailUrl}
                              alt={exactMatch.title}
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 rounded-full object-cover border-2 border-red-200 group-hover:ring-2 group-hover:ring-red-500 transition-all shadow-xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </div>
                          </a>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={channelUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm sm:text-base font-bold text-slate-900 hover:text-red-600 transition-colors flex items-center gap-1.5 group/link"
                                title={`'${exactMatch.title}' 유튜브 채널 새 탭에서 열어 확인`}
                              >
                                <span>{exactMatch.title}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-red-500 transition-colors" />
                              </a>
                              {exactMatch.handle && exactMatch.handle.trim() && (
                                <span className="text-xs text-slate-500 font-mono">
                                  {exactMatch.handle}
                                </span>
                              )}
                              {exactMatch.subscriberCount && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold border border-slate-200/80">
                                  구독자 {exactMatch.subscriberCount}
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[11px] font-semibold border border-amber-200/70">
                                {exactMatch.category || '기타'}
                              </span>
                            </div>

                            {exactMatch.description && (
                              <p className="text-xs text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">
                                {exactMatch.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-500 text-[11px]">분류:</span>
                            <select
                              value={channelCategory}
                              onChange={(e) => {
                                setChannelCategoryOverrides(prev => ({
                                  ...prev,
                                  [exactMatch.channelId]: e.target.value as VideoCategory
                                }));
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-800 cursor-pointer focus:outline-none shadow-2xs"
                            >
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* 유튜브 채널 확인 버튼 */}
                            <a
                              href={channelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors flex items-center gap-1.5 shadow-2xs group/btn"
                              title={`'${exactMatch.title}' 유튜브 채널로 이동하여 확인`}
                            >
                              <Youtube className="w-4 h-4 text-red-600" />
                              <span>채널 확인</span>
                              <ExternalLink className="w-3 h-3 text-red-500 group-hover/btn:translate-x-0.5 transition-transform" />
                            </a>

                            <button
                              type="button"
                              disabled={isAlreadyAdded}
                              onClick={() => handleSelectChannelToAdd(exactMatch)}
                              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                                isAlreadyAdded
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white'
                              }`}
                            >
                              {isAlreadyAdded ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>이미 추가됨</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>채널 추가하기</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Other Related Channels Section */}
                {(() => {
                  const exactMatch = searchResults.find(r => r.isExactMatch) || searchResults[0];
                  const otherResults = searchResults.filter(r => r.channelId !== exactMatch?.channelId);

                  if (otherResults.length === 0) return null;

                  return (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>🔍 관련 추천 채널 ({otherResults.length}개)</span>
                        </span>
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                          버튼을 눌러 유튜브 채널을 확인하거나 내 목록에 추가할 수 있습니다.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {otherResults.map((result) => {
                          const isAlreadyAdded = isChannelAlreadyRegistered(result);
                          const channelCategory = channelCategoryOverrides[result.channelId] || result.category || selectedDefaultCategory;
                          const channelUrl = getYouTubeChannelUrl(result);

                          return (
                            <div 
                              key={result.channelId}
                              className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-2.5 shadow-2xs"
                            >
                              <div className="flex items-start gap-3">
                                <a
                                  href={channelUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative group/avatar shrink-0 block"
                                  title={`'${result.title}' 유튜브 채널로 이동하여 확인`}
                                >
                                  <img
                                    src={result.thumbnailUrl}
                                    alt={result.title}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 group-hover/avatar:ring-2 group-hover/avatar:ring-red-500 transition-all"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </div>
                                </a>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <a
                                      href={channelUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs sm:text-sm font-bold text-slate-900 hover:text-red-600 truncate flex items-center gap-1 group/title transition-colors"
                                      title={`'${result.title}' 유튜브 채널 새 탭에서 열어 확인`}
                                    >
                                      <span className="truncate">{result.title}</span>
                                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover/title:text-red-500 transition-colors shrink-0" />
                                    </a>
                                    {result.handle && result.handle.trim() && (
                                      <span className="text-[11px] text-slate-500 font-mono">
                                        {result.handle}
                                      </span>
                                    )}
                                    {result.subscriberCount && (
                                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                                        {result.subscriberCount}
                                      </span>
                                    )}
                                    {result.matchReason && (
                                      <span className="px-1.5 py-0.2 bg-slate-50 text-slate-500 rounded text-[10px] border border-slate-200/60">
                                        {result.matchReason}
                                      </span>
                                    )}
                                  </div>
                                  {result.description && (
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                      {result.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-slate-500 text-[11px]">분류:</span>
                                  <select
                                    value={channelCategory}
                                    onChange={(e) => {
                                      setChannelCategoryOverrides(prev => ({
                                        ...prev,
                                        [result.channelId]: e.target.value as VideoCategory
                                      }));
                                    }}
                                    className="px-2 py-1 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer focus:outline-none"
                                  >
                                    {categories.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* 유튜브 채널 확인 버튼 */}
                                  <a
                                    href={channelUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors flex items-center gap-1 shadow-2xs group/check"
                                    title={`'${result.title}' 유튜브 채널로 이동하여 확인`}
                                  >
                                    <Youtube className="w-3.5 h-3.5 text-red-600" />
                                    <span>채널 확인</span>
                                    <ExternalLink className="w-3 h-3 text-red-500 group-hover/check:translate-x-0.5 transition-transform" />
                                  </a>

                                  <button
                                    type="button"
                                    disabled={isAlreadyAdded}
                                    onClick={() => handleSelectChannelToAdd(result)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                                      isAlreadyAdded
                                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                                    }`}
                                  >
                                    {isAlreadyAdded ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>이미 추가됨</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>추가</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-2.5">
                <Search className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">
                  '{searchQuery}'에 일치하는 채널을 찾을 수 없습니다.
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                  채널의 공식 @핸들(예: @shukaworld) 또는 유튜브 채널 URL을 입력해보시거나, 
                  {!hasServerApiKey && !storedApiKey && (
                    <span className="block text-red-600 font-semibold mt-1">
                      💡 상단 'YouTube Data API v3 연동'에 API 키를 등록하시면 배포 환경에서도 모든 채널이 100% 검색됩니다.
                    </span>
                  )}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {!hasServerApiKey && !storedApiKey && (
                    <button
                      type="button"
                      onClick={() => setShowApiKeySection(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Key className="w-3 h-3" />
                      <span>YouTube API 키 등록하기</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDirectInput(searchQuery);
                      setShowDirectAdd(true);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>'{searchQuery}' 직접 입력 모드로 추가</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1-Click Preset Channel Packs (With Preview & Select Flow) */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <PackagePlus className="w-3.5 h-3.5 text-slate-700" />
            추천 채널 프리셋 패키지 (목록 확인 및 선택 추가)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {CHANNEL_PRESET_PACKS.map((pack) => {
              const totalChannels = pack.channels.length;
              const alreadyCount = pack.channels.filter(pc => isChannelAlreadyRegistered(pc)).length;

              return (
                <div 
                  key={pack.id} 
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-1.5 py-0.5 bg-slate-200/70 text-slate-700 rounded text-[10px] font-semibold">
                        {pack.badge}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {alreadyCount === totalChannels ? '전체 등록됨' : `${alreadyCount}/${totalChannels}개 등록`}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1">{pack.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{pack.description}</p>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenPresetPreview(pack)}
                      className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                      title="포함된 채널 목록을 확인하고 원하는 채널만 선택하여 추가합니다."
                    >
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>채널 미리보기 ({totalChannels}개)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Registered YouTube Channels List & Management */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Tv2 className="w-3.5 h-3.5 text-slate-700" />
              모니터링 등록 채널 목록 ({filteredChannels.length}/{channels.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              채널별 카테고리를 설정하고, 새로운 카테고리를 생성하여 분류 체계를 자유롭게 확장할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search channel in list */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="채널/핸들 검색..."
                value={searchChannelFilter}
                onChange={(e) => setSearchChannelFilter(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white text-slate-900"
              />
            </div>

            {/* Sync & Repair Channels Button */}
            {onSyncRepairChannels && (
              <button
                type="button"
                disabled={isSyncingChannels}
                onClick={async () => {
                  setIsSyncingChannels(true);
                  try {
                    await onSyncRepairChannels();
                  } finally {
                    setIsSyncingChannels(false);
                  }
                }}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
                title="모든 등록 채널의 YouTube ID와 프로필 정보를 최신 상태로 동기화하고 수집 오류를 복구합니다."
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncingChannels ? 'animate-spin' : ''}`} />
                <span>{isSyncingChannels ? '복구/동기화 중...' : '정보 동기화/복구'}</span>
              </button>
            )}

            {/* Create Category Button */}
            <button
              id="create-category-btn"
              type="button"
              onClick={() => setIsCreatingCategory(prev => !prev)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 shrink-0 ${
                isCreatingCategory
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>새 카테고리 생성</span>
            </button>
          </div>
        </div>

        {/* Category Creation Card (Interactive Form) */}
        {isCreatingCategory && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Tag className="w-3.5 h-3.5 text-slate-700" />
                <span>새 카테고리 생성하기</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCategory(false);
                  setNewCategoryInput('');
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="닫기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={newCategoryInputRef}
                  type="text"
                  placeholder="생성할 카테고리명 입력 (예: AI/머신러닝, 부동산/투자, 디자인/UIUX...)"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-900"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCreateCategory()}
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>카테고리 생성</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCategory(false);
                    setNewCategoryInput('');
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  취소
                </button>
              </div>
            </div>

            {/* Quick Suggestions for Category Creation */}
            <div className="pt-2 border-t border-slate-200/70">
              <span className="text-[11px] text-slate-500 font-medium mr-2">추천 카테고리 (클릭 시 즉시 생성):</span>
              <div className="inline-flex flex-wrap gap-1.5 mt-1 sm:mt-0">
                {POPULAR_CATEGORY_PRESETS.map((preset, idx) => {
                  const alreadyExists = categories.includes(preset);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={alreadyExists}
                      onClick={() => handleCreateCategory(preset)}
                      className={`px-2 py-0.5 text-[11px] rounded-md transition-colors ${
                        alreadyExists 
                          ? 'bg-slate-200/50 text-slate-400 cursor-not-allowed'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      + {preset}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Category Filter & Badges List Toolbar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
            <Tag className="w-3 h-3" />
            분류:
          </span>

          {/* ALL Filter */}
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            전체 ({channels.length})
          </button>

          {/* Individual Categories Badges */}
          {categories.map(cat => {
            const count = channels.filter(c => c.category === cat).length;
            const isSelected = selectedCategoryFilter === cat;
            return (
              <div
                key={cat}
                className={`group inline-flex items-center rounded-md border text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className="px-2.5 py-1 flex items-center gap-1"
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    ({count})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCategoryToDelete(cat);
                  }}
                  className={`pr-1.5 pl-0.5 py-1 text-slate-400 hover:text-rose-500 transition-colors ${
                    isSelected ? 'hover:text-rose-300' : ''
                  }`}
                  title={`'${cat}' 카테고리 삭제`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Channel Cards / List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {filteredChannels.map(channel => {
            const channelUrl = getYouTubeChannelUrl(channel);

            return (
              <div 
                key={channel.id}
                className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors bg-white"
              >
                {/* Channel Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <a
                    href={channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group/avatar shrink-0 block"
                    title={`'${channel.title}' 유튜브 채널로 이동`}
                  >
                    <img
                      src={channel.thumbnailUrl}
                      alt={channel.title}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 group-hover/avatar:ring-2 group-hover/avatar:ring-red-500 transition-all"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </a>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-red-600 truncate flex items-center gap-1 group/title transition-colors"
                        title={`'${channel.title}' 유튜브 채널 새 탭에서 열기`}
                      >
                        <span className="truncate">{channel.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover/title:text-red-500 transition-colors shrink-0" />
                      </a>
                      {channel.handle && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {channel.handle}
                        </span>
                      )}
                      {channel.subscriberCount && (
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                          {channel.subscriberCount}
                        </span>
                      )}
                    </div>
                    {channel.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {channel.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* YouTube Channel Direct Link Button (바로가기) */}
                  <a
                    href={channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200/80 rounded-md transition-colors shrink-0 shadow-2xs group/btn"
                    title={`'${channel.title}' 유튜브 채널 페이지 새 탭에서 열기`}
                  >
                    <span>바로가기</span>
                    <ExternalLink className="w-3 h-3 text-red-500 group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>

                  {/* Category Changer */}
                  <div className="flex items-center gap-1">
                    <select
                      value={channel.category}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE_NEW__') {
                          setIsCreatingCategory(true);
                        } else {
                          onChangeChannelCategory(channel.id, e.target.value as VideoCategory);
                        }
                      }}
                      className="px-2 py-1 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__CREATE_NEW__">+ 새 카테고리 생성...</option>
                    </select>
                  </div>

                  {/* Active / Pause Toggle */}
                  <button
                    type="button"
                    onClick={() => onToggleChannelActive(channel.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      channel.isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                    title={channel.isActive ? '모니터링 활성 상태' : '모니터링 일시정지 상태'}
                  >
                    {channel.isActive ? '수집 활성' : '일시정지'}
                  </button>

                  {/* Delete Channel Button */}
                  <button
                    type="button"
                    onClick={() => setChannelToDelete(channel)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="채널 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredChannels.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              {searchChannelFilter || selectedCategoryFilter !== 'ALL'
                ? '선택한 조건에 일치하는 채널이 없습니다.'
                : '등록된 모니터링 채널이 없습니다.'}
            </div>
          )}
        </div>
      </div>

      {/* 3. AI Summary & System Preferences */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-5">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-slate-700" />
          AI 요약 엔진 및 시스템 환경 설정
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Detail Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              AI 요약 상세도 수준
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['concise', 'standard', 'in-depth'] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onUpdateSettings({ summaryDetailLevel: lvl })}
                  className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                    settings.summaryDetailLevel === lvl
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {lvl === 'concise' ? '간결 핵심' : lvl === 'standard' ? '표준 상세' : '심층 분석'}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Language */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              요약 출력 기본 언어
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ preferredLanguage: 'ko' })}
                className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                  settings.preferredLanguage === 'ko'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                🇰🇷 한국어 (기본)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ preferredLanguage: 'en' })}
                className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                  settings.preferredLanguage === 'en'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                🇺🇸 English
              </button>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-slate-900">새 영상 발견 시 자동 AI 요약 수행</div>
              <div className="text-[11px] text-slate-500">동기화 시 전일 업로드된 신규 영상을 백그라운드에서 즉시 요약합니다.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoAnalyzeNewVideos}
              onChange={(e) => onUpdateSettings({ autoAnalyzeNewVideos: e.target.checked })}
              className="w-4 h-4 accent-slate-900"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-slate-900">타임라인 구간별 요약 항상 포함</div>
              <div className="text-[11px] text-slate-500">영상 진행 시간에 따른 핵심 논점을 요약 문서에 함께 정리합니다.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.includeTimelineInSummary}
              onChange={(e) => onUpdateSettings({ includeTimelineInSummary: e.target.checked })}
              className="w-4 h-4 accent-slate-900"
            />
          </label>
        </div>

        {/* Reset All Data Button */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            초기 샘플 데이터 및 채널 목록으로 복원합니다.
          </span>
          <button
            type="button"
            onClick={onResetAllData}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            초기 데이터로 초기화
          </button>
        </div>
      </div>

      {/* Preset Pack Preview Modal */}
      {previewPack && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                    {previewPack.badge}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{previewPack.name}</h4>
                </div>
                <p className="text-xs text-slate-500 mt-1">{previewPack.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPack(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selection Toolbar */}
            <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = new Set<string>();
                    previewPack.channels.forEach(ch => {
                      const isAlready = channels.some(c => c.channelId === ch.channelId || (c.handle && ch.handle && c.handle.toLowerCase() === ch.handle.toLowerCase()));
                      if (!isAlready) allIds.add(ch.channelId);
                    });
                    if (selectedPackChannelIds.size === allIds.size) {
                      setSelectedPackChannelIds(new Set());
                    } else {
                      setSelectedPackChannelIds(allIds);
                    }
                  }}
                  className="font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
                >
                  {selectedPackChannelIds.size > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-slate-900" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>전체 선택 / 해제</span>
                </button>
              </div>
              <span className="text-slate-500 font-medium">
                선택됨: <b className="text-slate-900">{selectedPackChannelIds.size}</b> / {previewPack.channels.length}개
              </span>
            </div>

            {/* Channels List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {previewPack.channels.map((ch) => {
                const isAlready = isChannelAlreadyRegistered(ch);
                const isChecked = selectedPackChannelIds.has(ch.channelId);

                return (
                  <div
                    key={ch.channelId}
                    onClick={() => {
                      if (isAlready) return;
                      setSelectedPackChannelIds(prev => {
                        const next = new Set(prev);
                        if (next.has(ch.channelId)) {
                          next.delete(ch.channelId);
                        } else {
                          next.add(ch.channelId);
                        }
                        return next;
                      });
                    }}
                    className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                      isAlready 
                        ? 'bg-slate-50/60 cursor-not-allowed opacity-75' 
                        : 'hover:bg-slate-50 cursor-pointer bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        disabled={isAlready}
                        checked={isAlready || isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
                      />
                      <img
                        src={ch.thumbnailUrl}
                        alt={ch.title}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{ch.title}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{ch.handle}</span>
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                            {ch.subscriberCount}
                          </span>
                        </div>
                        {ch.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ch.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium border border-slate-200/80">
                        {ch.category}
                      </span>
                      {/* 유튜브 채널 확인 링크 */}
                      <a
                        href={getYouTubeChannelUrl(ch)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded flex items-center gap-1 transition-colors shadow-2xs group/btn"
                        title={`'${ch.title}' 유튜브 채널 새 탭에서 열어 확인`}
                      >
                        <ExternalLink className="w-3 h-3 text-red-500 group-hover/btn:translate-x-0.5 transition-transform" />
                        <span>채널 확인</span>
                      </a>
                      {isAlready && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold border border-emerald-200 flex items-center gap-0.5">
                          <Check className="w-3 h-3" />
                          이미 등록됨
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                선택한 채널을 내 모니터링 목록에 즉시 등록하고 최신 영상을 연동합니다.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewPack(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  닫기
                </button>
                <button
                  type="button"
                  disabled={selectedPackChannelIds.size === 0}
                  onClick={handleConfirmAddPresetPack}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md disabled:opacity-50 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>선택한 {selectedPackChannelIds.size}개 채널 추가하기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Channel Confirmation Modal */}
      {channelToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl border border-slate-200 p-5 space-y-3.5">
            <div className="flex items-center gap-2.5 text-slate-800">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-slate-700" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">채널 삭제 확인</h4>
            </div>

            <p className="text-xs text-slate-600">
              <b className="text-slate-900">'{channelToDelete.title}'</b> 채널을 모니터링 목록에서 삭제하시겠습니까?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setChannelToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteChannel(channelToDelete.id);
                  setChannelToDelete(null);
                  showToast(`'${channelToDelete.title}' 채널이 삭제되었습니다.`, 'info');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl border border-slate-200 p-5 space-y-3.5">
            <div className="flex items-center gap-2.5 text-slate-800">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-slate-700" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">카테고리 삭제</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <b className="text-slate-900">'{categoryToDelete}'</b> 카테고리를 삭제하시겠습니까? 해당 카테고리가 지정된 채널 및 영상은 '기타'로 자동 변경됩니다.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory(categoryToDelete);
                  setCategoryToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
