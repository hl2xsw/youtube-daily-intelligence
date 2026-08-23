import React, { useState } from 'react';
import { YouTubeVideo, VideoCategory } from '../types';
import { 
  X, 
  Download, 
  ExternalLink, 
  Sparkles, 
  Copy, 
  Check, 
  FileText, 
  FileCode, 
  FileType, 
  Clock, 
  Calendar, 
  Bookmark, 
  Share2,
  Tag,
  Lightbulb,
  CheckCircle2,
  Tv2
} from 'lucide-react';
import { 
  generateVideoMarkdown, 
  generateVideoText, 
  generateVideoWordDoc, 
  downloadFile 
} from '../utils/exportUtils';
import { useToast } from './Toast';

interface VideoDetailModalProps {
  video: YouTubeVideo | null;
  categories?: string[];
  onClose: () => void;
  onToggleBookmark: (videoId: string) => void;
  onReanalyze: (video: YouTubeVideo) => void;
  onChangeCategory: (videoId: string, newCategory: VideoCategory) => void;
  isAnalyzing?: boolean;
}

const DEFAULT_ALL_CATEGORIES: string[] = [
  'IT/테크',
  '경제/재테크',
  '비즈니스/스타트업',
  '과학/지식',
  '뉴스/시사',
  '자기계발/교육',
  '라이프/엔터',
  '기타'
];

export const VideoDetailModal: React.FC<VideoDetailModalProps> = ({
  video,
  categories = DEFAULT_ALL_CATEGORIES,
  onClose,
  onToggleBookmark,
  onReanalyze,
  onChangeCategory,
  isAnalyzing = false
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'timeline' | 'takeaways' | 'original'>('summary');

  // Automatically trigger AI analysis if video summary is missing
  React.useEffect(() => {
    if (video && !video.summary && !isAnalyzing) {
      onReanalyze(video);
    }
  }, [video?.id]);

  if (!video) return null;

  const s = video.summary;
  const pubDate = new Date(video.publishedAt).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleDownload = (format: 'markdown' | 'txt' | 'doc') => {
    const safeTitle = video.title.replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 40);
    if (format === 'markdown') {
      const content = generateVideoMarkdown(video);
      downloadFile(`[요약]_${safeTitle}.md`, content, 'text/markdown;charset=utf-8');
      showToast('마크다운 파일(.md)로 다운로드되었습니다.', 'success');
    } else if (format === 'txt') {
      const content = generateVideoText(video);
      downloadFile(`[요약]_${safeTitle}.txt`, content, 'text/plain;charset=utf-8');
      showToast('텍스트 파일(.txt)로 다운로드되었습니다.', 'success');
    } else if (format === 'doc') {
      const content = generateVideoWordDoc(video);
      downloadFile(`[요약]_${safeTitle}.doc`, content, 'application/msword;charset=utf-8');
      showToast('워드 문서 파일(.doc)로 다운로드되었습니다.', 'success');
    }
  };

  const handleCopy = async () => {
    try {
      const text = generateVideoText(video);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('요약 전문이 클립보드에 복사되었습니다.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('복사에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 pb-3.5 border-b border-slate-200 flex items-start justify-between gap-3 bg-white">
          <div className="flex items-start gap-3 min-w-0">
            {video.channelThumbnail ? (
              <img 
                src={video.channelThumbnail} 
                alt={video.channelTitle}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5" 
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                {video.channelTitle.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-xs font-semibold text-slate-700">{video.channelTitle}</span>
                {video.relativeTimeText && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                    {video.relativeTimeText}
                  </span>
                )}
                {/* Category Dropdown */}
                <select
                  value={video.category}
                  onChange={(e) => onChangeCategory(video.id, e.target.value as VideoCategory)}
                  className="px-1.5 py-0.5 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer hover:border-slate-300"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {video.title}
              </h2>
              <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {pubDate}
                </span>
                {video.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {video.duration}
                  </span>
                )}
                {s && (
                  <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-medium text-[10px]">
                    {s.sentimentLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Close & Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggleBookmark(video.id)}
              className={`p-1.5 rounded-lg border border-slate-200 transition-colors ${
                video.isBookmarked ? 'bg-amber-50 text-amber-500' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="북마크 토글"
            >
              <Bookmark className={`w-4 h-4 ${video.isBookmarked ? 'fill-amber-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Bar for Documents Export */}
        <div className="px-4 sm:px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mr-1">
              <Download className="w-3 h-3 text-slate-700" />
              문서 저장:
            </span>
            <button
              onClick={() => handleDownload('markdown')}
              className="px-2 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md shadow-2xs transition-colors flex items-center gap-1"
            >
              <FileCode className="w-3 h-3 text-slate-500" />
              .md
            </button>
            <button
              onClick={() => handleDownload('txt')}
              className="px-2 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md shadow-2xs transition-colors flex items-center gap-1"
            >
              <FileType className="w-3 h-3 text-slate-500" />
              .txt
            </button>
            <button
              onClick={() => handleDownload('doc')}
              className="px-2 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md shadow-2xs transition-colors flex items-center gap-1"
            >
              <FileText className="w-3 h-3 text-slate-500" />
              .doc
            </button>
            <button
              onClick={handleCopy}
              className="px-2 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md shadow-2xs transition-colors flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onReanalyze(video)}
              disabled={isAnalyzing}
              className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-slate-800' : 'text-slate-500'}`} />
              {isAnalyzing ? '분석 중...' : 'AI 재분석'}
            </button>

            <a
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors flex items-center gap-1"
            >
              <Tv2 className="w-3 h-3 text-slate-500" />
              유튜브
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Modal Navigation Subtabs */}
        <div className="flex border-b border-slate-200 px-4 sm:px-5 gap-2 bg-white">
          <button
            onClick={() => setActiveSubTab('summary')}
            className={`py-2 px-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeSubTab === 'summary'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            핵심 요약 & 포인트
          </button>
          {s?.timelineSummary && s.timelineSummary.length > 0 && (
            <button
              onClick={() => setActiveSubTab('timeline')}
              className={`py-2 px-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeSubTab === 'timeline'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              타임라인 요약
            </button>
          )}
          {s?.takeaways && s.takeaways.length > 0 && (
            <button
              onClick={() => setActiveSubTab('takeaways')}
              className={`py-2 px-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeSubTab === 'takeaways'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              시사점 및 인사이트
            </button>
          )}
          <button
            onClick={() => setActiveSubTab('original')}
            className={`py-2 px-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeSubTab === 'original'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            원본 설명 및 키워드
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeSubTab === 'summary' && (
            <div className="space-y-4">
              {!s ? (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Sparkles className={`w-5 h-5 ${isAnalyzing ? 'animate-spin text-blue-600' : ''}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isAnalyzing ? 'Gemini AI가 영상 핵심 요약을 분석 및 생성하고 있습니다...' : 'AI 핵심 요약이 준비되지 않았습니다'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      영상 제목과 설명을 심층 분석하여 핵심 주제, 주요 포인트, 상세 줄거리, 시사점을 자동 정리합니다.
                    </p>
                  </div>
                  {!isAnalyzing && (
                    <button
                      onClick={() => onReanalyze(video)}
                      className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>지금 Gemini AI로 핵심 요약 생성하기</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Core Topic Box */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                      <span>🎯</span>
                      <span>핵심 주제 (Core Topic)</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                      {s.coreTopic}
                    </p>
                  </div>

                  {/* Key Points */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      핵심 요약 포인트 (Key Points)
                    </h3>
                    <div className="grid gap-1.5">
                      {s.keyPoints.map((point, index) => (
                        <div 
                          key={index}
                          className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/80 flex items-start gap-2.5"
                        >
                          <span className="w-4 h-4 rounded bg-slate-900 text-white font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <p className="text-xs text-slate-800 font-normal leading-relaxed">
                            {point}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Summary */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-700" />
                      상세 맥락 요약
                    </h3>
                    <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
                      {s.detailedSummary}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeSubTab === 'timeline' && s?.timelineSummary && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-700" />
                영상 진행 흐름별 주요 내용 요약
              </h3>
              <div className="space-y-2">
                {s.timelineSummary.map((t, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/80 flex items-start gap-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px] font-semibold shrink-0">
                      {t.timestamp}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 mb-0.5">{t.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{t.point}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'takeaways' && s?.takeaways && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-slate-700" />
                시사점 및 실행 포인트
              </h3>
              <div className="space-y-2">
                {s.takeaways.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/80 flex items-start gap-2.5">
                    <span className="text-slate-600 font-bold text-xs mt-0.5">💡</span>
                    <p className="text-xs text-slate-800 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'original' && (
            <div className="space-y-3">
              {/* Keywords */}
              {s?.keywords && s.keywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-500" />
                    추출 키워드
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {s.keywords.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
                        #{k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Original Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1.5">유튜브 원본 설명 텍스트</h4>
                <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 text-xs text-slate-600 whitespace-pre-line max-h-56 overflow-y-auto leading-relaxed">
                  {video.description || '영상 설명이 없습니다.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">ID: {video.videoId}</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-2xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
