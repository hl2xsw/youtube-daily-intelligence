import React, { useState } from 'react';
import { YouTubeVideo } from '../types';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Bookmark, 
  Copy, 
  Clock, 
  Calendar, 
  Check, 
  Share2,
  FileCode,
  FileType,
  Lightbulb,
  Tag,
  Flame
} from 'lucide-react';
import { 
  generateVideoMarkdown, 
  generateVideoText, 
  generateVideoWordDoc, 
  downloadFile 
} from '../utils/exportUtils';
import { formatVideoKstDate } from '../utils/youtubeService';
import { useToast } from './Toast';

interface VideoCardProps {
  video: YouTubeVideo;
  onOpenDetail: (video: YouTubeVideo) => void;
  onToggleBookmark: (videoId: string) => void;
  onReanalyze: (video: YouTubeVideo) => void;
  isAnalyzing?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onOpenDetail,
  onToggleBookmark,
  onReanalyze,
  isAnalyzing = false
}) => {
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const s = video.summary;
  const formattedDate = formatVideoKstDate(video.publishedAt, true);

  // Handle document file save
  const handleSaveDocument = (format: 'markdown' | 'txt' | 'doc') => {
    setShowExportMenu(false);
    const safeTitle = video.title.replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 40);

    if (format === 'markdown') {
      const content = generateVideoMarkdown(video);
      downloadFile(`[요약]_${safeTitle}.md`, content, 'text/markdown;charset=utf-8');
      showToast('마크다운(.md) 요약본이 저장되었습니다.', 'success', `${safeTitle}.md`);
    } else if (format === 'txt') {
      const content = generateVideoText(video);
      downloadFile(`[요약]_${safeTitle}.txt`, content, 'text/plain;charset=utf-8');
      showToast('텍스트(.txt) 요약본이 저장되었습니다.', 'success', `${safeTitle}.txt`);
    } else if (format === 'doc') {
      const content = generateVideoWordDoc(video);
      downloadFile(`[요약]_${safeTitle}.doc`, content, 'application/msword;charset=utf-8');
      showToast('워드 문서(.doc) 요약본이 저장되었습니다.', 'success', `${safeTitle}.doc`);
    }
  };

  // Copy summary to clipboard
  const handleCopySummary = async () => {
    setShowExportMenu(false);
    try {
      const text = generateVideoText(video);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('요약 내용이 클립보드에 복사되었습니다.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('클립보드 복사에 실패했습니다.', 'error');
    }
  };

  // Category Color Map - Minimalist subtle tones
  const categoryColorMap: Record<string, { bg: string; text: string; border: string }> = {
    'IT/테크': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    '경제/재테크': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    '비즈니스/스타트업': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    '과학/지식': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    '뉴스/시사': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    '자기계발/교육': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    '라이프/엔터': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    '기타': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
  };

  const catStyle = categoryColorMap[video.category] || categoryColorMap['기타'];

  return (
    <div 
      id={`video-card-${video.id}`}
      className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all duration-150 flex flex-col overflow-hidden group"
    >
      {/* Top Header info */}
      <div className="p-4 sm:p-4.5 pb-2.5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {video.channelThumbnail ? (
            <img 
              src={video.channelThumbnail} 
              alt={video.channelTitle}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0" 
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
              {video.channelTitle.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-slate-900 truncate" title={video.channelTitle}>
              {video.channelTitle}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Badges: Today, Relative Time, Yesterday, Category */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {video.isToday ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
              <Flame className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" />
              오늘 {video.relativeTimeText ? `(${video.relativeTimeText})` : ''}
            </span>
          ) : video.relativeTimeText ? (
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              video.isWithin24h 
                ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                : video.isYesterday 
                ? 'bg-slate-900 text-white' 
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {video.isYesterday ? `어제 (${video.relativeTimeText})` : video.relativeTimeText}
            </span>
          ) : video.isYesterday ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-white">
              전일 영상
            </span>
          ) : null}
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
            {video.category}
          </span>
          <button
            onClick={() => onToggleBookmark(video.id)}
            title={video.isBookmarked ? '북마크 해제' : '북마크 추가'}
            className={`p-1 rounded transition-colors ${
              video.isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-500'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${video.isBookmarked ? 'fill-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 sm:px-4.5 flex-1 flex flex-col">
        {/* Video Title & Thumbnail Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          {/* Thumbnail */}
          <div className="relative rounded-lg overflow-hidden bg-slate-900 shrink-0 w-full sm:w-40 aspect-video border border-slate-100">
            <img 
              src={video.thumbnailUrl} 
              alt={video.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
            />
            {video.duration && (
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.2 rounded bg-black/75 text-white text-[10px] font-mono font-medium">
                {video.duration}
              </span>
            )}
            <a 
              href={video.videoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
              title="유튜브에서 원본 보기"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Title & Preview */}
          <div className="flex-1 min-w-0">
            <h3 
              onClick={() => onOpenDetail(video)}
              className="text-sm font-bold text-slate-900 hover:text-blue-600 cursor-pointer line-clamp-2 leading-snug transition-colors"
            >
              {video.title}
            </h3>

            {/* Core Topic Box (Clean Minimalist Card) */}
            {s ? (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-0.5">
                  <span className="text-blue-600">🎯</span>
                  <span>핵심 주제</span>
                </div>
                <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                  {s.coreTopic}
                </p>
              </div>
            ) : (
              <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500 line-clamp-1 truncate">
                  {video.description || 'AI 요약 대기 중'}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReanalyze(video);
                  }}
                  disabled={isAnalyzing}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`w-3 h-3 text-amber-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? '분석중...' : 'AI 요약'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Key Points (Direct On-Card Summary) */}
        {s && (
          <div className="mt-0.5 space-y-1.5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-slate-500" />
                주요 포인트
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                약 {s.readingTimeMinutes}분 소요
              </span>
            </div>
            <ul className="space-y-1.5">
              {s.keyPoints.slice(0, 3).map((pt, idx) => (
                <li key={idx} className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                  <span className="w-3.5 h-3.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="line-clamp-2">{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Collapsible Expanded Details */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-3 text-xs">
            {/* Detailed Summary */}
            {s?.detailedSummary && (
              <div>
                <h5 className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    상세 맥락 요약 (In-Depth Summary)
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                    상세 보고서
                  </span>
                </h5>
                <div className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/90 whitespace-pre-line">
                  {s.detailedSummary}
                </div>
              </div>
            )}

            {/* Video Context & Original Description */}
            <div>
              <h5 className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-600" />
                  영상 배경 및 원본 설명
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {video.fullDescription ? '전체 설명 확보' : '요약 해설'}
                </span>
              </h5>
              <div className="text-slate-600 text-[11px] leading-relaxed bg-slate-100/70 p-2.5 rounded-lg border border-slate-200 whitespace-pre-line max-h-48 overflow-y-auto">
                {video.fullDescription || s?.generatedFullDescription || video.description || '원본 설명이 등록되지 않은 영상입니다.'}
              </div>
            </div>

            {/* Timeline Breakdown */}
            {s?.timelineSummary && s.timelineSummary.length > 0 && (
              <div>
                <h5 className="font-bold text-slate-900 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                  타임라인별 핵심 내용
                </h5>
                <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                  {s.timelineSummary.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 py-0.5">
                      <span className="font-mono text-[10px] font-semibold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded shrink-0">
                        {t.timestamp}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800">{t.title}: </span>
                        <span className="text-slate-600">{t.point}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Takeaways */}
            {s?.takeaways && s.takeaways.length > 0 && (
              <div>
                <h5 className="font-bold text-slate-900 mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  실무 및 투자 시사점
                </h5>
                <ul className="space-y-1 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
                  {s.takeaways.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-slate-700 text-[11px] leading-relaxed">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Keywords */}
            {s?.keywords && s.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {s.keywords.map((k, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium border border-slate-200">
                    #{k}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer Toolbar */}
      <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 mt-auto flex items-center justify-between gap-2">
        {/* Left: Expand Details toggle & Reanalyze */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            {isExpanded ? (
              <>
                <span>접기</span>
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                <span>상세</span>
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>

          <button
            onClick={() => onReanalyze(video)}
            disabled={isAnalyzing}
            title="Gemini AI로 요약 다시 생성하기"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors disabled:opacity-50"
          >
            <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{isAnalyzing ? '요약중...' : '재요약'}</span>
          </button>
        </div>

        {/* Right: Save as Document Menu & Full Detail Modal */}
        <div className="flex items-center gap-1.5 relative">
          {/* Document Save Button */}
          <div className="relative">
            <button
              id={`save-doc-btn-${video.id}`}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-md shadow-2xs transition-colors"
            >
              <Download className="w-3 h-3 text-slate-700" />
              <span>문서 저장</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {/* Document Export Dropdown */}
            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setShowExportMenu(false)} 
                />
                <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-xs">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    요약본 문서 다운로드
                  </div>
                  <button
                    onClick={() => handleSaveDocument('markdown')}
                    className="w-full px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>마크다운 (.md)</span>
                  </button>
                  <button
                    onClick={() => handleSaveDocument('txt')}
                    className="w-full px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileType className="w-3.5 h-3.5 text-slate-500" />
                    <span>텍스트 파일 (.txt)</span>
                  </button>
                  <button
                    onClick={() => handleSaveDocument('doc')}
                    className="w-full px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>워드 문서 (.doc)</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={handleCopySummary}
                    className="w-full px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copied ? '복사 완료' : '클립보드 복사'}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Open Detail Modal */}
          <button
            onClick={() => onOpenDetail(video)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
            title="상세 모달 열기"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
