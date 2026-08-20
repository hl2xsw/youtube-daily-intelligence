import React, { useState, useMemo } from 'react';
import { YouTubeVideo, DailyReport, VideoCategory } from '../types';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { 
  Sparkles, 
  Download, 
  FileText, 
  FileCode, 
  FileType, 
  Copy, 
  Check, 
  Printer, 
  Calendar, 
  Layers, 
  TrendingUp, 
  Lightbulb, 
  CheckCircle2,
  Tv2,
  Tag,
  Clock,
  RotateCw
} from 'lucide-react';
import { 
  generateDailyReportMarkdown, 
  downloadFile 
} from '../utils/exportUtils';
import { useToast } from './Toast';

interface AnalyticsReportViewProps {
  videos: YouTubeVideo[];
  reports: DailyReport[];
  onGenerateReport: () => Promise<void>;
  isGeneratingReport: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  'IT/테크': '#3b82f6',
  '경제/재테크': '#10b981',
  '비즈니스/스타트업': '#a855f7',
  '과학/지식': '#6366f1',
  '뉴스/시사': '#f59e0b',
  '자기계발/교육': '#14b8a6',
  '라이프/엔터': '#f43f5e',
  '기타': '#64748b'
};

export const AnalyticsReportView: React.FC<AnalyticsReportViewProps> = ({
  videos,
  reports,
  onGenerateReport,
  isGeneratingReport
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reports[0]?.id || null);

  const activeReport = useMemo(() => {
    if (!reports.length) return null;
    return reports.find(r => r.id === selectedReportId) || reports[0];
  }, [reports, selectedReportId]);

  // Yesterday videos dataset
  const yesterdayVideos = useMemo(() => videos.filter(v => v.isYesterday), [videos]);
  const targetVideos = yesterdayVideos.length > 0 ? yesterdayVideos : videos;

  // 1. Category Distribution Data
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    targetVideos.forEach(v => {
      counts[v.category] = (counts[v.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || '#64748b'
    })).sort((a, b) => b.value - a.value);
  }, [targetVideos]);

  // 2. Channel Activity Data
  const channelActivityData = useMemo(() => {
    const counts: Record<string, number> = {};
    targetVideos.forEach(v => {
      counts[v.channelTitle] = (counts[v.channelTitle] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name: name.length > 8 ? `${name.substring(0, 8)}...` : name,
      fullName: name,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [targetVideos]);

  // 3. Top Keywords Frequency
  const topKeywords = useMemo(() => {
    const freqs: Record<string, number> = {};
    targetVideos.forEach(v => {
      v.summary?.keywords?.forEach(k => {
        if (k && k.length > 1) {
          freqs[k] = (freqs[k] || 0) + 1;
        }
      });
    });
    return Object.entries(freqs)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 14);
  }, [targetVideos]);

  // Download Report
  const handleDownloadReport = (format: 'markdown' | 'txt' | 'doc') => {
    if (!activeReport) return;
    const dateStr = activeReport.reportDate;

    if (format === 'markdown') {
      const md = generateDailyReportMarkdown(activeReport);
      downloadFile(`[AI종합보고서]_${dateStr}.md`, md, 'text/markdown;charset=utf-8');
      showToast('AI 종합 보고서가 마크다운(.md)으로 다운로드되었습니다.', 'success');
    } else if (format === 'txt') {
      const txt = generateDailyReportMarkdown(activeReport);
      downloadFile(`[AI종합보고서]_${dateStr}.txt`, txt, 'text/plain;charset=utf-8');
      showToast('AI 종합 보고서가 텍스트(.txt)로 다운로드되었습니다.', 'success');
    } else if (format === 'doc') {
      const docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
        <head><meta charset='utf-8'><title>${activeReport.title}</title>
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; padding: 24px; }
          h1 { color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
          h2 { color: #1e40af; margin-top: 24px; }
          .summary-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; }
        </style>
        </head>
        <body>
          <h1>📊 ${activeReport.title}</h1>
          <p><b>분석 일자:</b> ${activeReport.reportDate} | <b>분석 영상 수:</b> ${activeReport.totalVideosAnalyzed}개</p>
          <div class="summary-box">
            <h2>전일 종합 총평 (Executive Summary)</h2>
            <p>${activeReport.executiveSummary}</p>
          </div>
          <h2>주요 카테고리별 핵심 트렌드</h2>
          ${activeReport.topTrends.map(t => `
            <h3>[${t.category}] ${t.topic}</h3>
            <p>${t.description}</p>
          `).join('')}
          <h2>종합 시사점</h2>
          <ul>${activeReport.keyTakeaways.map(k => `<li>${k}</li>`).join('')}</ul>
          <h2>권장 액션 플랜</h2>
          <ul>${activeReport.recommendedActions?.map(a => `<li>${a}</li>`).join('') || ''}</ul>
        </body></html>
      `;
      downloadFile(`[AI종합보고서]_${dateStr}.doc`, docHtml, 'application/msword;charset=utf-8');
      showToast('AI 종합 보고서가 워드 문서(.doc)로 다운로드되었습니다.', 'success');
    }
  };

  const handleCopyReport = async () => {
    if (!activeReport) return;
    try {
      const md = generateDailyReportMarkdown(activeReport);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      showToast('보고서 전체가 클립보드에 복사되었습니다.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('복사에 실패했습니다.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Analytics & Visual Statistics Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-800" />
              전일 영상 데이터 통계 시각화
            </h2>
            <p className="text-xs text-slate-500">
              전일 업로드된 콘텐츠의 카테고리 분포, 채널별 업로드 비중, 주요 키워드 분석
            </p>
          </div>
          <span className="text-xs text-slate-600 font-medium bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
            총 {targetVideos.length}건 데이터 기반
          </span>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Category Breakdown (Donut Chart) */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                카테고리별 업로드 비중
              </h3>
              <span className="text-[11px] text-slate-400">비율 (%)</span>
            </div>

            <div className="h-60 w-full">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(val: any, name: any) => [`${val}개 영상 (${Math.round((val / targetVideos.length) * 100)}%)`, name]}
                    />
                    <Legend 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  데이터가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Channel Upload Volume (Bar Chart) */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Tv2 className="w-3.5 h-3.5 text-slate-800" />
                주요 채널별 영상 업로드 수
              </h3>
              <span className="text-[11px] text-slate-400">영상 수(개)</span>
            </div>

            <div className="h-60 w-full">
              {channelActivityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <RechartsTooltip 
                      formatter={(value: any, name: any, item: any) => [`${value}개`, item.payload.fullName]}
                    />
                    <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Trending Keywords Cloud Bar */}
        {topKeywords.length > 0 && (
          <div className="mt-3.5 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 shrink-0">
              <Tag className="w-3.5 h-3.5 text-slate-600" />
              <span>전일 주요 키워드:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topKeywords.map((item, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-medium transition-colors"
                >
                  #{item.keyword} <span className="text-[10px] text-slate-400 font-normal">({item.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Automated AI Daily Intelligence Report Section */}
      <div className="pt-2 border-t border-slate-200/70">
        <div className="bg-slate-900 rounded-xl p-5 sm:p-6 text-white shadow-2xs border border-slate-800">
          {/* Header & Generate Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700 mb-2">
                <Sparkles className="w-3 h-3 text-slate-300" />
                Gemini AI Comprehensive Intelligence
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                전일 유튜브 브리핑 종합 분석 리포트
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                전일 업로드된 모든 채널의 영상을 한눈에 꿰뚫어보는 종합 인사이트 리포트를 자동 생성합니다.
              </p>
            </div>

            {/* Generate Report Button */}
            <button
              id="generate-daily-report-btn"
              onClick={onGenerateReport}
              disabled={isGeneratingReport}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-semibold text-xs shadow-2xs transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingReport ? 'animate-spin text-slate-900' : 'text-slate-700'}`} />
              <span>{isGeneratingReport ? 'AI 종합 리포트 생성 중...' : '새 AI 종합 리포트 생성'}</span>
            </button>
          </div>

          {/* Active Report Content */}
          {activeReport ? (
            <div className="mt-5 space-y-5">
              {/* Report Header Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/60">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {activeReport.title}
                  </h3>
                  <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1 flex-wrap">
                    <span>기준 일자: {activeReport.reportDate}</span>
                    <span>•</span>
                    <span>분석 영상: 총 {activeReport.totalVideosAnalyzed}개</span>
                    <span>•</span>
                    <span>생성 시각: {new Date(activeReport.createdAt).toLocaleString('ko-KR')}</span>
                  </div>
                </div>

                {/* Report Download Toolbar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleDownloadReport('markdown')}
                    className="px-2.5 py-1 bg-slate-700/80 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-md border border-slate-600 flex items-center gap-1.5 transition-colors"
                  >
                    <FileCode className="w-3 h-3 text-slate-300" />
                    <span>.md</span>
                  </button>
                  <button
                    onClick={() => handleDownloadReport('doc')}
                    className="px-2.5 py-1 bg-slate-700/80 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-md border border-slate-600 flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3 h-3 text-slate-300" />
                    <span>.doc</span>
                  </button>
                  <button
                    onClick={() => handleDownloadReport('txt')}
                    className="px-2.5 py-1 bg-slate-700/80 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-md border border-slate-600 flex items-center gap-1.5 transition-colors"
                  >
                    <FileType className="w-3 h-3 text-slate-300" />
                    <span>.txt</span>
                  </button>
                  <button
                    onClick={handleCopyReport}
                    className="px-2.5 py-1 bg-slate-700/80 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-md border border-slate-600 flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-300" />}
                    <span>{copied ? '복사됨' : '복사'}</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-2.5 py-1 bg-slate-700/80 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-md border border-slate-600 flex items-center gap-1.5 transition-colors"
                    title="인쇄 및 PDF 저장"
                  >
                    <Printer className="w-3 h-3" />
                    <span>인쇄</span>
                  </button>
                </div>
              </div>

              {/* 1. Executive Summary Box */}
              <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <span>📋</span>
                  <span>전일 종합 핵심 브리핑 (Executive Summary)</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                  {activeReport.executiveSummary}
                </p>
              </div>

              {/* 2. Key Sector Trends */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                  분야별 주요 핵심 트렌드 (Key Trends)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeReport.topTrends.map((trend, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-700/50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-700 text-slate-200 border border-slate-600">
                            {trend.category}
                          </span>
                          <h5 className="text-xs font-bold text-white">{trend.topic}</h5>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
                          {trend.description}
                        </p>
                      </div>

                      {trend.relatedVideoTitles?.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-700/40 text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300">관련 영상: </span>
                          <span className="italic">{trend.relatedVideoTitles.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Strategic Key Takeaways */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50">
                  <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    핵심 시사점 (Key Takeaways)
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {activeReport.keyTakeaways.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-slate-400 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50">
                  <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    권장 액션 플랜 (Recommended Actions)
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {activeReport.recommendedActions?.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{action}</span>
                      </li>
                    )) || <li>액션 플랜을 준비 중입니다.</li>}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto text-slate-600 mb-2.5" />
              <p className="text-xs font-semibold text-slate-300">아직 생성된 AI 종합 리포트가 없습니다.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">상단의 [새 AI 종합 리포트 생성] 버튼을 클릭해보세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
