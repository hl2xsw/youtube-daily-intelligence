import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
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
  Tag,
  Lightbulb,
  CheckCircle2,
  Tv2,
  Users,
  Quote,
  Subtitles,
  Flame,
  Layers
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
  onReanalyze: (video: YouTubeVideo, overrideDetailLevel?: 'concise' | 'standard' | 'in-depth') => void;
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
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'timeline' | 'speakers' | 'takeaways' | 'transcript' | 'original'>('summary');
  const [selectedDetailLevel, setSelectedDetailLevel] = useState<'standard' | 'in-depth'>('standard');

  // Automatically trigger AI analysis if video summary is missing
  React.useEffect(() => {
    if (video && !video.summary && !isAnalyzing) {
      onReanalyze(video, selectedDetailLevel);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 pb-3.5 border-b border-slate-200 flex items-start justify-between gap-3 bg-white">
          <div className="flex items-start gap-3 min-w-0">
            {video.channelThumbnail ? (
              <img 
                src={video.channelThumbnail} 
                alt={video.channelTitle}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5" 
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                {video.channelTitle.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-xs font-bold text-slate-800">{video.channelTitle}</span>
                {video.relativeTimeText && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                    {video.relativeTimeText}
                  </span>
                )}
                {/* Category Dropdown */}
                <select
                  value={video.category}
                  onChange={(e) => onChangeCategory(video.id, e.target.value as VideoCategory)}
                  className="px-2 py-0.5 text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer hover:border-slate-300"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {video.transcript && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Subtitles className="w-3 h-3 text-emerald-600" />
                    자막 스크립트 확보
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 leading-snug">
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
                  <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-700 font-semibold text-[11px] border border-slate-200/60">
                    {s.sentimentLabel}
                  </span>
                )}
                {s?.readingTimeMinutes && (
                  <span className="text-[11px] text-slate-400">
                    예상 정독 {s.readingTimeMinutes}분
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Close & Bookmark buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onToggleBookmark(video.id)}
              className={`p-2 rounded-lg border border-slate-200 transition-colors ${
                video.isBookmarked ? 'bg-amber-50 text-amber-500 border-amber-300' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="북마크 토글"
            >
              <Bookmark className={`w-4 h-4 ${video.isBookmarked ? 'fill-amber-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Bar for Documents Export & Deep AI Re-analyze */}
        <div className="px-4 sm:px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
              <Download className="w-3 h-3 text-slate-600" />
              내보내기:
            </span>
            <button
              onClick={() => handleDownload('markdown')}
              className="px-2 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md shadow-2xs transition-colors flex items-center gap-1"
            >
              <FileCode className="w-3 h-3 text-blue-600" />
              Markdown
            </button>
            <button
              onClick={() => handleDownload('txt')}
              className="px-2 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md shadow-2xs transition-colors flex items-center gap-1"
            >
              <FileType className="w-3 h-3 text-slate-600" />
              Text
            </button>
            <button
              onClick={() => handleDownload('doc')}
              className="px-2 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md shadow-2xs transition-colors flex items-center gap-1"
            >
              <FileText className="w-3 h-3 text-indigo-600" />
              Word (.doc)
            </button>
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md shadow-2xs transition-colors flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Analysis Mode Toggle */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setSelectedDetailLevel('standard')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                  selectedDetailLevel === 'standard'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                표준 요약
              </button>
              <button
                onClick={() => setSelectedDetailLevel('in-depth')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                  selectedDetailLevel === 'in-depth'
                    ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame className="w-3 h-3" />
                심층 정밀 분석
              </button>
            </div>

            <button
              onClick={() => onReanalyze(video, selectedDetailLevel)}
              disabled={isAnalyzing}
              className="px-3 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
              {isAnalyzing ? '분석 중...' : selectedDetailLevel === 'in-depth' ? '심층 AI 분석' : 'AI 재분석'}
            </button>

            <a
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1"
            >
              <Tv2 className="w-3.5 h-3.5 text-red-500" />
              유튜브 바로가기
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Modal Navigation Subtabs */}
        <div className="flex border-b border-slate-200 px-4 sm:px-5 gap-1 sm:gap-2 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('summary')}
            className={`py-2.5 px-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'summary'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            핵심 요약 & 상세 맥락
          </button>
          {s?.timelineSummary && s.timelineSummary.length > 0 && (
            <button
              onClick={() => setActiveSubTab('timeline')}
              className={`py-2.5 px-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'timeline'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              타임라인 흐름 ({s.timelineSummary.length})
            </button>
          )}
          {s?.speakerInsights && s.speakerInsights.length > 0 && (
            <button
              onClick={() => setActiveSubTab('speakers')}
              className={`py-2.5 px-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'speakers'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              출연진/논의 쟁점 ({s.speakerInsights.length})
            </button>
          )}
          {s?.takeaways && s.takeaways.length > 0 && (
            <button
              onClick={() => setActiveSubTab('takeaways')}
              className={`py-2.5 px-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'takeaways'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              실전 시사점 ({s.takeaways.length})
            </button>
          )}
          {video.transcript && (
            <button
              onClick={() => setActiveSubTab('transcript')}
              className={`py-2.5 px-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'transcript'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Subtitles className="w-3.5 h-3.5 text-emerald-600" />
              자막 스크립트 전문
            </button>
          )}
          <button
            onClick={() => setActiveSubTab('original')}
            className={`py-2.5 px-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'original'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            원본 설명 & 키워드
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeSubTab === 'summary' && (
            <div className="space-y-5">
              {!s ? (
                <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Sparkles className={`w-6 h-6 ${isAnalyzing ? 'animate-spin text-blue-600' : ''}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {isAnalyzing ? 'Gemini 3.7 AI가 영상 발화 내용과 자막을 정밀 분석하고 있습니다...' : '영상 상세 분석 및 요약이 준비되지 않았습니다'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                      영상 제목, 원본 설명, 타임라인 챕터 및 음성 자막 스크립트를 종합 분석하여 실제 발표자가 논의한 핵심 쟁점, 데이터, 근거, 결론을 상세 보고서로 제공합니다.
                    </p>
                  </div>
                  {!isAnalyzing && (
                    <button
                      onClick={() => onReanalyze(video, selectedDetailLevel)}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm inline-flex items-center gap-2 mt-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>지금 Gemini AI로 정밀 심층 분석 생성하기</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Core Topic Card */}
                  <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1.5">
                      <span>🎯</span>
                      <span>핵심 논제 및 테제 (Core Thesis)</span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-50 leading-relaxed">
                      {s.coreTopic}
                    </p>
                  </div>

                  {/* Key Quotes if available */}
                  {s.keyQuotes && s.keyQuotes.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
                        <Quote className="w-3.5 h-3.5 text-amber-600" />
                        <span>영상 핵심 어록 & 주요 발언</span>
                      </div>
                      <div className="space-y-1.5">
                        {s.keyQuotes.map((q, idx) => (
                          <p key={idx} className="text-xs text-amber-950 font-medium italic leading-relaxed pl-2 border-l-2 border-amber-400">
                            "{q}"
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Points */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-slate-800" />
                        핵심 요약 포인트 (Key Arguments & Facts)
                      </h3>
                      <span className="text-[11px] text-slate-500 font-semibold">{s.keyPoints.length}개 핵심 논점</span>
                    </div>
                    <div className="grid gap-2">
                      {s.keyPoints.map((point, index) => (
                        <div 
                          key={index}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3 hover:bg-slate-100/60 transition-colors"
                        >
                          <span className="w-5 h-5 rounded-md bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            {index + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                            {point}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Summary (Rendered via ReactMarkdown for rich structured reading) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-slate-800" />
                        상세 맥락 요약 (In-Depth Context & Analysis)
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">배경 • 핵심 논거 • 리스크 • 전망</span>
                    </div>
                    <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed shadow-2xs">
                      <div className="prose prose-slate max-w-none text-xs sm:text-sm space-y-3">
                        <ReactMarkdown
                          components={{
                            h3: ({ node, ...props }) => (
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-4 mb-1.5 pb-1 border-b border-slate-100 flex items-center gap-1.5" {...props} />
                            ),
                            p: ({ node, ...props }) => (
                              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-2" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul className="list-disc pl-4 space-y-1 my-2" {...props} />
                            ),
                            li: ({ node, ...props }) => (
                              <li className="text-xs sm:text-sm text-slate-700" {...props} />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong className="font-bold text-slate-900" {...props} />
                            )
                          }}
                        >
                          {s.detailedSummary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeSubTab === 'timeline' && s?.timelineSummary && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-800" />
                  타임라인별 핵심 내용 및 논의 진행 흐름
                </h3>
                <span className="text-xs text-slate-500 font-semibold">{s.timelineSummary.length}개 구간</span>
              </div>
              <div className="space-y-2.5">
                {s.timelineSummary.map((t, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3">
                    <a
                      href={`${video.videoUrl}&t=${t.timestamp.replace(':', 'm')}s`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-blue-700 text-white font-mono text-xs font-bold shrink-0 transition-colors flex items-center gap-1"
                      title="해당 시간으로 유튜브 재생"
                    >
                      <Tv2 className="w-3 h-3 text-amber-300" />
                      {t.timestamp}
                    </a>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">{t.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{t.point}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'speakers' && s?.speakerInsights && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-800" />
                  출연진별 입장 및 핵심 논거
                </h3>
                <span className="text-xs text-slate-500 font-semibold">{s.speakerInsights.length}명 패널</span>
              </div>
              <div className="grid gap-3">
                {s.speakerInsights.map((sp, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                          {sp.speaker.charAt(0)}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">{sp.speaker}</span>
                      </div>
                      {sp.stance && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold">
                          {sp.stance}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
                      {sp.mainArgument}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'takeaways' && s?.takeaways && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-slate-800" />
                  실무 및 투자 관점 실천 액션 플랜 (Key Takeaways)
                </h3>
                <span className="text-xs text-slate-500 font-semibold">{s.takeaways.length}개 시사점</span>
              </div>
              <div className="space-y-2.5">
                {s.takeaways.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      💡
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'transcript' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Subtitles className="w-4 h-4 text-emerald-600" />
                  유튜브 실제 발화 자막 스크립트 (Full Transcript)
                </h3>
                <span className="text-xs text-slate-500 font-medium">타임스탬프 포함 자막</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap border border-slate-800">
                {video.transcript || '자막 스크립트를 불러오는 중입니다...'}
              </div>
            </div>
          )}

          {activeSubTab === 'original' && (
            <div className="space-y-4">
              {/* Keywords */}
              {s?.keywords && s.keywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-600" />
                    추출 핵심 키워드
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {s.keywords.map((k, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200">
                        #{k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comprehensive Video Context & Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    영상 종합 배경 및 상세 설명
                  </h4>
                  <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold border border-blue-100">
                    심층 해설 전문
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans shadow-2xs">
                  {video.fullDescription || s?.generatedFullDescription || video.description || `본 영상은 '${video.title}'을 핵심 주제로 설정하여 ${video.channelTitle ? `${video.channelTitle} 채널에서 ` : ''}관련 분야의 최신 이슈와 구체적인 사실관계, 전문가적 인사이트를 전달합니다. 해당 현안이 촉발된 거시적 배경부터 주요 이해관계자들의 핵심 주장과 데이터, 그리고 향후 관련 산업과 시장에 미칠 파급 효과를 다각도로 분석하여 시청자가 본질을 명확히 이해할 수 있도록 구성되어 있습니다.`}
                </div>
              </div>

              {/* Original Raw YouTube Description if distinct */}
              {video.description && video.description !== video.fullDescription && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h5 className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <span>YouTube 원본 등록 스니펫</span>
                    </h5>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-100/70 border border-slate-200 text-[11px] text-slate-600 whitespace-pre-line max-h-40 overflow-y-auto leading-relaxed">
                    {video.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-400">ID: {video.videoId}</span>
            {s?.sentiment && (
              <span className="text-[11px] text-slate-500 font-medium">
                • 성향: <strong className="text-slate-700">{s.sentimentLabel}</strong>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
