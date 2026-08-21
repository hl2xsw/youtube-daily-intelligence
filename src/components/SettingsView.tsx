import React, { useState, useRef, useEffect } from 'react';
import { YouTubeChannel, VideoCategory, AppSettings } from '../types';
import { CHANNEL_PRESET_PACKS } from '../data/defaultChannels';
import { lookupYouTubeChannel } from '../utils/youtubeService';
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
  X 
} from 'lucide-react';
import { useToast } from './Toast';

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
  settings,
  onUpdateSettings,
  onResetAllData
}) => {
  const { showToast } = useToast();

  // Add Channel Form State
  const [channelInput, setChannelInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory>(categories[0] || 'IT/테크');
  const [isLookingUp, setIsLookingUp] = useState(false);
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

  // Keep selectedCategory valid if categories change
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

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
      setSelectedCategory(targetName);
    }
  };

  // Handle Add Channel
  const handleLookupAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelInput.trim()) {
      showToast('채널 URL, @핸들 또는 채널 ID를 입력해주세요.', 'error');
      return;
    }

    setIsLookingUp(true);
    try {
      let channelData: any = null;

      // 1. Try server endpoint first
      try {
        const res = await fetch('/api/youtube/lookup-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: channelInput.trim() })
        });
        const data = await res.json();
        if (data.success && data.channel) {
          channelData = data.channel;
        }
      } catch {
        // server endpoint unavailable, continue to client lookup
      }

      // 2. Client-side fallback if server didn't return
      if (!channelData) {
        channelData = await lookupYouTubeChannel(channelInput.trim());
      }

      if (channelData) {
        // Check if already exists
        const exists = channels.some(c => 
          c.channelId === channelData.channelId || 
          (c.handle && c.handle.toLowerCase() === channelData.handle?.toLowerCase())
        );

        if (exists) {
          showToast('이미 등록된 유튜브 채널입니다.', 'info');
          setIsLookingUp(false);
          return;
        }

        onAddChannel({
          channelId: channelData.channelId,
          title: channelData.title,
          handle: channelData.handle,
          description: channelData.description,
          thumbnailUrl: channelData.thumbnailUrl,
          category: selectedCategory,
          isActive: true,
          subscriberCount: channelData.subscriberCount
        });

        setChannelInput('');
        showToast(`'${channelData.title}' 채널이 성공적으로 추가되었습니다!`, 'success');
      } else {
        showToast('유튜브 채널 정보를 찾을 수 없습니다. @핸들 또는 전체 URL을 다시 확인해주세요.', 'error');
      }
    } catch (err: any) {
      // Fallback manual addition
      const title = channelInput.replace('@', '').trim();
      onAddChannel({
        channelId: `UC_${Date.now().toString(36)}`,
        title: title || '신규 채널',
        handle: channelInput.startsWith('@') ? channelInput : `@${title.toLowerCase().replace(/\s+/g, '')}`,
        description: `${title} 채널 모니터링`,
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        category: selectedCategory,
        isActive: true,
        subscriberCount: '신규 등록'
      });
      setChannelInput('');
      showToast(`'${title}' 채널이 등록되었습니다.`, 'success');
    } finally {
      setIsLookingUp(false);
    }
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
            매일 전일 영상을 모니터링할 유튜브 채널을 추가/삭제하고, 카테고리를 자유롭게 생성하여 분류하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200">
            총 {channels.length}개 채널 • {categories.length}개 카테고리
          </span>
        </div>
      </div>

      {/* 1. Add YouTube Channel Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-slate-700" />
          신규 유튜브 채널 추가하기
        </h3>
        <p className="text-xs text-slate-500 mb-3.5">
          유튜브 채널 URL (예: <code className="font-mono text-slate-700">https://youtube.com/@shukaworld</code>), @핸들, 또는 채널 ID를 입력하세요.
        </p>

        <form onSubmit={handleLookupAndAdd} className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              채널 URL / @핸들 / ID
            </label>
            <input
              type="text"
              placeholder="예: @jocoding 또는 https://youtube.com/@shukaworld"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all text-slate-900"
            />
          </div>

          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                기본 분류 카테고리
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-0.5"
                title="새 카테고리 생성"
              >
                <Plus className="w-3 h-3" />
                카테고리 추가
              </button>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as VideoCategory)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={isLookingUp}
              className="w-full py-1.5 px-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 h-[34px]"
            >
              <Plus className={`w-3.5 h-3.5 ${isLookingUp ? 'animate-spin' : ''}`} />
              <span>{isLookingUp ? '채널 확인 중...' : '채널 추가'}</span>
            </button>
          </div>
        </form>

        {/* 1-Click Preset Channel Packs */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <PackagePlus className="w-3.5 h-3.5 text-slate-700" />
            추천 채널 프리셋 패키지 (원클릭 추가)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {CHANNEL_PRESET_PACKS.map((pack, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{pack.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{pack.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onAddPresetPack(pack.channels)}
                  className="mt-2.5 w-full py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-slate-500" />
                  <span>패키지 일괄 추가 ({pack.channels.length}개)</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Registered YouTube Channels List & Management + Category Creation */}
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
            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="채널/핸들 검색..."
                value={searchChannelFilter}
                onChange={(e) => setSearchChannelFilter(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white text-slate-900"
              />
            </div>

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
                {/* Delete Category Button (allows deleting any category) */}
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
          {filteredChannels.map(channel => (
            <div 
              key={channel.id}
              className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors bg-white"
            >
              {/* Channel Info */}
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={channel.thumbnailUrl}
                  alt={channel.title}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {channel.title}
                    </h4>
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
          ))}

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
