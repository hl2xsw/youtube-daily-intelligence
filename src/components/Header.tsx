import React from 'react';
import { ActiveTab } from '../types';
import { 
  Tv2, 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  RefreshCw, 
  Download, 
  Sparkles,
  Search,
  Globe
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onRefreshAndSummarize24h: () => void;
  isProcessing: boolean;
  onOpenExportModal: () => void;
  onOpenVideoSearch?: () => void;
  total24hCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRefreshAndSummarize24h,
  isProcessing = false,
  onOpenExportModal,
  onOpenVideoSearch,
  total24hCount = 0
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-2xs">
              <Tv2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  YouTube Daily Brief
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                설정 채널의 최근 24시간 업로드 영상 검색 및 Gemini AI 핵심 요약
              </p>
            </div>
          </div>

          {/* Navigation Tabs - Clean Segmented Control */}
          <nav className="hidden md:flex items-center p-1 bg-slate-100/90 rounded-lg border border-slate-200/80">
            <button
              id="tab-dashboard-btn"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              대시보드
              {total24hCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-slate-900 text-white rounded text-[10px] font-bold">
                  {total24hCount}
                </span>
              )}
            </button>

            <button
              id="tab-analytics-btn"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              통계 및 AI 리포트
            </button>

            <button
              id="tab-settings-btn"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              채널 설정
            </button>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Live YouTube Search Button */}
            {onOpenVideoSearch && (
              <button
                id="header-video-search-btn"
                onClick={onOpenVideoSearch}
                title="유튜브 전체 실시간 동영상 검색 & AI 분석"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 rounded-lg shadow-2xs transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">동영상 검색</span>
              </button>
            )}

            {/* Unified 24H Refresh & AI Summarize Button */}
            <button
              id="header-refresh-summarize-btn"
              onClick={onRefreshAndSummarize24h}
              disabled={isProcessing}
              title="현재 시간 기준 최근 24시간 영상을 새로고침하고 미분석 영상을 Gemini AI로 자동 요약합니다"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-amber-300 hover:bg-amber-400 active:bg-amber-500 border border-amber-400 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${isProcessing ? 'animate-spin' : ''}`} />
              <Sparkles className="w-3.5 h-3.5 text-amber-900" />
              <span>{isProcessing ? '24H 동기화 & 요약 중...' : '24H 새로고침 & AI 요약'}</span>
            </button>

            {/* Export Modal Button */}
            <button
              id="header-export-btn"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">내보내기</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md text-center whitespace-nowrap transition-colors ${
              activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            대시보드 ({total24hCount})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md text-center whitespace-nowrap transition-colors ${
              activeTab === 'analytics' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            통계 및 리포트
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md text-center whitespace-nowrap transition-colors ${
              activeTab === 'settings' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            채널 설정
          </button>
        </div>
      </div>
    </header>
  );
};
