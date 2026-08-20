import React, { useState } from 'react';
import { YouTubeVideo } from '../types';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  FileType, 
  FileText, 
  Check, 
  Layers, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  generateVideosCSV, 
  generateExcelXML, 
  generateBatchMarkdown, 
  downloadFile 
} from '../utils/exportUtils';
import { useToast } from './Toast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allVideos: YouTubeVideo[];
  filteredVideos: YouTubeVideo[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  allVideos,
  filteredVideos
}) => {
  const { showToast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'xls' | 'markdown' | 'txt'>('csv');
  const [dataScope, setDataScope] = useState<'yesterday' | 'filtered' | 'all'>('yesterday');

  if (!isOpen) return null;

  const yesterdayVideos = allVideos.filter(v => v.isYesterday);

  const getTargetVideos = () => {
    if (dataScope === 'yesterday') return yesterdayVideos;
    if (dataScope === 'filtered') return filteredVideos;
    return allVideos;
  };

  const handleExport = () => {
    const targets = getTargetVideos();
    if (targets.length === 0) {
      showToast('내보낼 영상 데이터가 없습니다.', 'error');
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const scopeLabel = dataScope === 'yesterday' ? '전일영상' : dataScope === 'filtered' ? '필터영상' : '전체영상';

    if (selectedFormat === 'csv') {
      const csv = generateVideosCSV(targets);
      downloadFile(`유튜브_${scopeLabel}_요약데이터_${dateStr}.csv`, csv, 'text/csv;charset=utf-8');
      showToast(`CSV 파일이 성공적으로 다운로드되었습니다. (총 ${targets.length}건)`, 'success');
    } else if (selectedFormat === 'xls') {
      const xls = generateExcelXML(targets);
      downloadFile(`유튜브_${scopeLabel}_요약데이터_${dateStr}.xls`, xls, 'application/vnd.ms-excel;charset=utf-8');
      showToast(`엑셀(.xls) 파일이 다운로드되었습니다. (총 ${targets.length}건)`, 'success');
    } else if (selectedFormat === 'markdown') {
      const md = generateBatchMarkdown(targets, `유튜브 ${scopeLabel} 일괄 요약집`);
      downloadFile(`유튜브_${scopeLabel}_일괄요약집_${dateStr}.md`, md, 'text/markdown;charset=utf-8');
      showToast(`마크다운(.md) 일괄 요약집이 다운로드되었습니다. (총 ${targets.length}건)`, 'success');
    } else if (selectedFormat === 'txt') {
      const md = generateBatchMarkdown(targets, `유튜브 ${scopeLabel} 일괄 요약집`);
      downloadFile(`유튜브_${scopeLabel}_일괄요약집_${dateStr}.txt`, md, 'text/plain;charset=utf-8');
      showToast(`텍스트(.txt) 일괄 요약집이 다운로드되었습니다. (총 ${targets.length}건)`, 'success');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">데이터 및 요약본 내보내기</h3>
              <p className="text-xs text-slate-500">엑셀(CSV) 또는 일괄 요약 문서로 저장</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Step 1: Format Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-2">
              1. 저장 파일 형식 선택
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  selectedFormat === 'csv'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">CSV 데이터 (.csv)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">UTF-8 BOM 지원</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('xls')}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  selectedFormat === 'xls'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Excel 서식 (.xls)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">서식 포함 엑셀</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('markdown')}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  selectedFormat === 'markdown'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileCode className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">마크다운 (.md)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">전체 핵심 요약집</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('txt')}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  selectedFormat === 'txt'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileType className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">텍스트 문서 (.txt)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">일반 텍스트 형식</div>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Data Scope */}
          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-2">
              2. 대상 영상 범위 선택
            </label>
            <div className="space-y-1.5">
              <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/60">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="dataScope"
                    checked={dataScope === 'yesterday'}
                    onChange={() => setDataScope('yesterday')}
                    className="w-3.5 h-3.5 accent-slate-900"
                  />
                  <div className="text-xs font-medium text-slate-800">
                    전일 업로드 영상만 내보내기 (추천)
                  </div>
                </div>
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 font-semibold rounded text-[10px]">
                  {yesterdayVideos.length}건
                </span>
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/60">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="dataScope"
                    checked={dataScope === 'filtered'}
                    onChange={() => setDataScope('filtered')}
                    className="w-3.5 h-3.5 accent-slate-900"
                  />
                  <div className="text-xs font-medium text-slate-800">
                    현재 화면에 필터링된 영상 내보내기
                  </div>
                </div>
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 font-semibold rounded text-[10px]">
                  {filteredVideos.length}건
                </span>
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/60">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="dataScope"
                    checked={dataScope === 'all'}
                    onChange={() => setDataScope('all')}
                    className="w-3.5 h-3.5 accent-slate-900"
                  />
                  <div className="text-xs font-medium text-slate-800">
                    전체 수집된 영상 데이터 내보내기
                  </div>
                </div>
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 font-semibold rounded text-[10px]">
                  {allVideos.length}건
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            총 <b className="text-slate-900 font-semibold">{getTargetVideos().length}</b>건 포함
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-md"
            >
              취소
            </button>
            <button
              onClick={handleExport}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-2xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
