import React, { useState, useEffect, useMemo } from 'react';
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
  Layers,
  Search,
  AlignLeft,
  RotateCw,
  Play,
  Type
} from 'lucide-react';
import { 
  generateVideoMarkdown, 
  generateVideoText, 
  generateVideoWordDoc, 
  downloadFile 
} from '../utils/exportUtils';
import { getYouTubeChannelUrl } from '../utils/youtubeService';
import { useToast } from './Toast';

interface VideoDetailModalProps {
  video: YouTubeVideo | null;
  categories?: string[];
  onClose: () => void;
  onToggleBookmark: (videoId: string) => void;
  onReanalyze: (video: YouTubeVideo, overrideDetailLevel?: 'concise' | 'standard' | 'in-depth') => void;
  onChangeCategory: (videoId: string, newCategory: VideoCategory) => void;
  isAnalyzing?: boolean;
  onUpdateVideo?: (updated: YouTubeVideo) => void;
  initialSubTab?: 'transcript' | 'summary' | 'timeline' | 'speakers' | 'takeaways' | 'original';
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

interface ParsedTranscriptItem {
  id: number;
  timestamp: string;
  seconds: number;
  text: string;
}

interface GroupedParagraph {
  startTime: string;
  startSec: number;
  text: string;
}

function parseTranscriptLines(raw: string): ParsedTranscriptItem[] {
  if (!raw) return [];
  const lines = raw.split('\n');
  const items: ParsedTranscriptItem[] = [];
  let counter = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pattern: [01:23] speech or 01:23 speech or [01:23:45] speech
    const match = trimmed.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.*)$/);
    if (match) {
      const timeStr = match[1];
      const text = match[2].trim();
      const parts = timeStr.split(':').map(Number);
      let seconds = 0;
      if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
      }
      items.push({
        id: ++counter,
        timestamp: timeStr,
        seconds,
        text: text || trimmed
      });
    } else {
      items.push({
        id: ++counter,
        timestamp: '',
        seconds: 0,
        text: trimmed
      });
    }
  }
  return items;
}

function highlightSearchText(text: string, search: string) {
  if (!search.trim()) return text;
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    part.toLowerCase() === search.toLowerCase() ? (
      <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-1 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export const VideoDetailModal: React.FC<VideoDetailModalProps> = ({
  video,
  categories = DEFAULT_ALL_CATEGORIES,
  onClose,
  onToggleBookmark,
  onReanalyze,
  onChangeCategory,
  isAnalyzing = false,
  onUpdateVideo,
  initialSubTab = 'transcript'
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'transcript' | 'summary' | 'timeline' | 'speakers' | 'takeaways' | 'original'>(initialSubTab);
  const [selectedDetailLevel, setSelectedDetailLevel] = useState<'standard' | 'in-depth'>('standard');

  // Enhanced reader state
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [readingMode, setReadingMode] = useState<'timeline' | 'paragraph'>('timeline');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [loadedTranscript, setLoadedTranscript] = useState<string | null>(null);
  const [loadedFullDesc, setLoadedFullDesc] = useState<string | null>(null);

  // Sync state with selected video
  useEffect(() => {
    setActiveSubTab(initialSubTab);
    setTranscriptSearch('');
    setLoadedTranscript(null);
    setLoadedFullDesc(null);
  }, [video?.id, initialSubTab]);

  const effectiveTranscript = loadedTranscript || video?.transcript || '';
  const effectiveFullDesc = loadedFullDesc || video?.fullDescription || '';

  // Auto-fetch YouTube transcript and full content details if missing
  useEffect(() => {
    if (video?.videoId && (!video.transcript || !video.fullDescription)) {
      setIsFetchingDetails(true);
      fetch('/api/youtube/video-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.videoId })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            if (data.transcript) {
              setLoadedTranscript(data.transcript);
            }
            if (data.fullDescription) {
              setLoadedFullDesc(data.fullDescription);
            }
            if (onUpdateVideo && (data.transcript || data.fullDescription)) {
              onUpdateVideo({
                ...video,
                transcript: data.transcript || video.transcript,
                fullDescription: data.fullDescription || video.fullDescription
              });
            }
          }
        })
        .catch((err) => {
          console.warn('Auto-fetch video details error:', err);
        })
        .finally(() => {
          setIsFetchingDetails(false);
        });
    }
  }, [video?.videoId]);

  // Manually re-fetch transcript and details
  const handleRefetchDetails = async () => {
    if (!video?.videoId) return;
    setIsFetchingDetails(true);
    try {
      const res = await fetch('/api/youtube/video-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.videoId })
      });
      const data = await res.json();
      if (data?.success) {
        setLoadedTranscript(data.transcript || null);
        setLoadedFullDesc(data.fullDescription || null);
        if (onUpdateVideo) {
          onUpdateVideo({
            ...video,
            transcript: data.transcript || video.transcript,
            fullDescription: data.fullDescription || video.fullDescription
          });
        }
        showToast('유튜브 자막 및 전체 본문 내용을 새로고침했습니다.', 'success');
      } else {
        showToast('자막 정보를 불러오지 못했습니다.', 'error');
      }
    } catch (e) {
      showToast('자막 새로고침 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const parsedItems = useMemo(() => {
    return parseTranscriptLines(effectiveTranscript);
  }, [effectiveTranscript]);

  const filteredItems = useMemo(() => {
    if (!transcriptSearch.trim()) return parsedItems;
    const query = transcriptSearch.toLowerCase().trim();
    return parsedItems.filter(item => item.text.toLowerCase().includes(query) || item.timestamp.includes(query));
  }, [parsedItems, transcriptSearch]);

  const groupedParagraphs = useMemo(() => {
    if (parsedItems.length === 0) return [];
    const groups: GroupedParagraph[] = [];
    const groupSize = 4; // group every 4 lines into a coherent paragraph

    for (let i = 0; i < parsedItems.length; i += groupSize) {
      const slice = parsedItems.slice(i, i + groupSize);
      const startTime = slice[0]?.timestamp || '';
      const startSec = slice[0]?.seconds || 0;
      const combinedText = slice.map(s => s.text).join(' ');
      groups.push({
        startTime,
        startSec,
        text: combinedText
      });
    }
    return groups;
  }, [parsedItems]);

  const filteredParagraphs = useMemo(() => {
    if (!transcriptSearch.trim()) return groupedParagraphs;
    const query = transcriptSearch.toLowerCase().trim();
    return groupedParagraphs.filter(p => p.text.toLowerCase().includes(query));
  }, [groupedParagraphs, transcriptSearch]);

  const handleCopyTranscriptOnly = async () => {
    if (!effectiveTranscript && !effectiveFullDesc) return;
    try {
      const textToCopy = effectiveTranscript
        ? `[유튜브 음성 발화 자막 스크립트 전문]\n${video?.title}\n\n${effectiveTranscript}\n\n[영상 원본 상세 설명]\n${effectiveFullDesc || video?.description}`
        : `[영상 원본 상세 설명 전문]\n${video?.title}\n\n${effectiveFullDesc || video?.description}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedTranscript(true);
      showToast('자막 및 본문 내용 전문이 복사되었습니다.', 'success');
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch (e) {
      showToast('복사에 실패했습니다.', 'error');
    }
  };

  const handleDownloadTranscriptTxt = () => {
    if (!video) return;
    const safeTitle = video.title.replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 40);
    let content = `=================================================================\n`;
    content += `[유튜브 자막 스크립트 및 내용 전문] ${video.title}\n`;
    content += `채널: ${video.channelTitle} | 영상 URL: ${video.videoUrl}\n`;
    content += `=================================================================\n\n`;
    if (effectiveTranscript) {
      content += `[🎙️ 음성 발화 자막 스크립트 전문]\n\n${effectiveTranscript}\n\n`;
    }
    if (effectiveFullDesc || video.description) {
      content += `-----------------------------------------------------------------\n`;
      content += `[📄 영상 전체 원본 설명 & 챕터]\n\n${effectiveFullDesc || video.description}\n\n`;
    }
    downloadFile(`[자막전문]_${safeTitle}.txt`, content, 'text/plain;charset=utf-8');
    showToast('자막 전문 텍스트(.txt) 파일로 다운로드되었습니다.', 'success');
  };

  // Optional: Automatically trigger AI analysis only if user specifically navigates to summary or timeline
  useEffect(() => {
    if (video && !video.summary && !isAnalyzing && activeSubTab === 'summary') {
      onReanalyze(video, selectedDetailLevel);
    }
  }, [video?.id, activeSubTab]);

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
                <a
                  href={getYouTubeChannelUrl({ channelId: video.channelId, title: video.channelTitle })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-slate-800 hover:text-red-600 truncate flex items-center gap-1 group/ch transition-colors"
                  title={`'${video.channelTitle}' 유튜브 채널로 이동하여 확인`}
                >
                  <span>{video.channelTitle}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover/ch:text-red-500 shrink-0" />
                </a>
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
              href={getYouTubeChannelUrl({ channelId: video.channelId, title: video.channelTitle })}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors flex items-center gap-1 shadow-2xs group/ch"
              title={`'${video.channelTitle}' 유튜브 채널로 이동하여 확인`}
            >
              <ExternalLink className="w-3 h-3 text-red-500 group-hover/ch:translate-x-0.5 transition-transform" />
              <span>채널 확인</span>
            </a>

            <a
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1"
            >
              <Tv2 className="w-3.5 h-3.5 text-red-500" />
              영상 바로가기
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Modal Navigation Subtabs */}
        <div className="flex border-b border-slate-200 px-4 sm:px-5 gap-1 sm:gap-2 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('transcript')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'transcript'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Subtitles className="w-3.5 h-3.5 text-emerald-600" />
            <span>자막 & 내용 전문</span>
            {parsedItems.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                {parsedItems.length}구간
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-medium">
                전문
              </span>
            )}
          </button>
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
            <div className="space-y-4">
              {/* Header and Control Bar */}
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-2.5">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="자막 및 내용 검색 (예: 특정 단어, 문장)..."
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  {transcriptSearch && (
                    <button
                      onClick={() => setTranscriptSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* View Modes & Formatting Tools */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Reading Mode Selector */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      onClick={() => setReadingMode('timeline')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                        readingMode === 'timeline'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="타임스탬프가 포함된 대화형 타임라인 보기"
                    >
                      <Clock className="w-3 h-3 text-emerald-600" />
                      타임라인별
                    </button>
                    <button
                      onClick={() => setReadingMode('paragraph')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                        readingMode === 'paragraph'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="문단 형태로 자연스럽게 이어 읽기"
                    >
                      <AlignLeft className="w-3 h-3 text-blue-600" />
                      문단 연속 읽기
                    </button>
                  </div>

                  {/* Font Size Selector */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      onClick={() => setFontSize('sm')}
                      className={`px-2 py-0.5 rounded-md font-medium ${
                        fontSize === 'sm' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                      }`}
                      title="보통 글자 크기 (13px)"
                    >
                      보통
                    </button>
                    <button
                      onClick={() => setFontSize('base')}
                      className={`px-2 py-0.5 rounded-md font-medium ${
                        fontSize === 'base' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                      }`}
                      title="큰 글자 크기 (15px)"
                    >
                      크게
                    </button>
                    <button
                      onClick={() => setFontSize('lg')}
                      className={`px-2 py-0.5 rounded-md font-medium ${
                        fontSize === 'lg' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                      }`}
                      title="아주 큰 글자 크기 (17px)"
                    >
                      특대
                    </button>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={handleCopyTranscriptOnly}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs flex items-center gap-1 transition-colors"
                    title="자막 및 내용 전문을 클립보드에 복사"
                  >
                    {copiedTranscript ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    <span>{copiedTranscript ? '복사됨' : '전문 복사'}</span>
                  </button>

                  {/* Download TXT */}
                  <button
                    onClick={handleDownloadTranscriptTxt}
                    className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs flex items-center gap-1 transition-colors"
                    title="자막 전문 텍스트(.txt) 파일로 다운로드"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    <span>.txt 저장</span>
                  </button>

                  {/* Refetch Button */}
                  <button
                    onClick={handleRefetchDetails}
                    disabled={isFetchingDetails}
                    className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs transition-colors disabled:opacity-50"
                    title="YouTube 공식 자막 및 본문 새로고침"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isFetchingDetails ? 'animate-spin text-emerald-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Search result indicator */}
              {transcriptSearch && (
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                  <span>
                    '<strong>{transcriptSearch}</strong>' 검색 결과:{' '}
                    <strong>
                      {readingMode === 'timeline' ? filteredItems.length : filteredParagraphs.length}
                    </strong>
                    개 구간 발견
                  </span>
                  <button onClick={() => setTranscriptSearch('')} className="text-[11px] underline text-amber-800 hover:text-amber-950 font-semibold">
                    검색어 지우기
                  </button>
                </div>
              )}

              {/* Subtitle Body */}
              {isFetchingDetails && !effectiveTranscript ? (
                <div className="py-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">유튜브 공식 발화 자막 및 전체 본문 정보를 가져오는 중입니다...</p>
                </div>
              ) : parsedItems.length > 0 ? (
                readingMode === 'timeline' ? (
                  /* Timeline View */
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredItems.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        검색어 '{transcriptSearch}'와 일치하는 자막 발화 구간이 없습니다.
                      </div>
                    ) : (
                      filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/90 transition-all flex items-start gap-2.5 sm:gap-3 group"
                        >
                          {item.timestamp ? (
                            <a
                              href={`https://www.youtube.com/watch?v=${video.videoId}&t=${item.seconds}s`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[11px] font-bold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 px-2 py-0.5 rounded border border-emerald-200 hover:border-emerald-600 shrink-0 transition-colors flex items-center gap-1 shadow-2xs"
                              title="클릭 시 해당 시간대로 유튜브 영상이 재생됩니다"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              {item.timestamp}
                            </a>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                          )}
                          <div
                            className={`flex-1 text-slate-800 leading-relaxed ${
                              fontSize === 'sm'
                                ? 'text-xs'
                                : fontSize === 'base'
                                ? 'text-sm'
                                : 'text-base leading-loose'
                            }`}
                          >
                            {highlightSearchText(item.text, transcriptSearch)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Continuous Paragraph Mode */
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200/90 max-h-[50vh] overflow-y-auto space-y-4">
                    {filteredParagraphs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        검색어 '{transcriptSearch}'와 일치하는 자막 문단이 없습니다.
                      </div>
                    ) : (
                      filteredParagraphs.map((para, idx) => (
                        <div key={idx} className="space-y-1.5 pb-2 border-b border-slate-200/60 last:border-b-0">
                          {para.startTime && (
                            <a
                              href={`https://www.youtube.com/watch?v=${video.videoId}&t=${para.startSec}s`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-slate-500 hover:text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200 transition-colors"
                              title="해당 시간대부터 유튜브에서 영상 시청"
                            >
                              <Play className="w-2 h-2 fill-current" />
                              {para.startTime} 구간 재생
                            </a>
                          )}
                          <p
                            className={`text-slate-800 font-sans leading-relaxed ${
                              fontSize === 'sm'
                                ? 'text-xs'
                                : fontSize === 'base'
                                ? 'text-sm'
                                : 'text-base leading-loose'
                            }`}
                          >
                            {highlightSearchText(para.text, transcriptSearch)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )
              ) : (
                /* Fallback info when CC captions are not posted by creator */
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Subtitles className="w-4 h-4 text-amber-700" />
                    <span>유튜브 음성 발화 자막 안내</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    이 영상은 제작자가 유튜브에 공식 텍스트 자막(CC)을 제공하지 않았거나 비공개 상태입니다.
                    대신 제작자가 등록한 <strong>전체 원본 설명, 세부 챕터 및 본문 전문</strong>을 아래에서 누락 없이 확인하실 수 있습니다.
                  </p>
                </div>
              )}

              {/* Complete Video Description & Chapter Content */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    영상 원본 전체 본문 및 상세 설명 전문 (Full Content)
                  </h4>
                  <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold border border-blue-100">
                    원문 그대로 표시
                  </span>
                </div>
                <div
                  className={`p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto ${
                    fontSize === 'sm'
                      ? 'text-xs'
                      : fontSize === 'base'
                      ? 'text-sm'
                      : 'text-base leading-loose'
                  }`}
                >
                  {effectiveFullDesc || video.description || '등록된 원본 영상 설명이 없습니다.'}
                </div>
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
