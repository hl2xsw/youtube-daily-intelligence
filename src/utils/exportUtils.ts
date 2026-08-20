import { YouTubeVideo, DailyReport } from '../types';

/**
 * Trigger browser file download
 */
export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format single video summary as Markdown
 */
export function generateVideoMarkdown(video: YouTubeVideo): string {
  const s = video.summary;
  const publishedDate = new Date(video.publishedAt).toLocaleString('ko-KR');

  let md = `# [영상 요약] ${video.title}\n\n`;
  md += `- **채널명**: ${video.channelTitle}\n`;
  md += `- **카테고리**: ${video.category}\n`;
  md += `- **업로드 일시**: ${publishedDate} ${video.isYesterday ? '(전일 업로드)' : ''}\n`;
  md += `- **영상 링크**: ${video.videoUrl}\n`;
  if (video.duration) md += `- **영상 길이**: ${video.duration}\n`;
  md += `\n---\n\n`;

  if (s) {
    md += `## 🎯 핵심 주제 (Core Topic)\n`;
    md += `> ${s.coreTopic}\n\n`;

    md += `## 📌 핵심 포인트 (Key Takeaways)\n`;
    s.keyPoints.forEach((pt, i) => {
      md += `${i + 1}. ${pt}\n`;
    });
    md += `\n`;

    md += `## 📝 상세 요약 (Detailed Summary)\n`;
    md += `${s.detailedSummary}\n\n`;

    if (s.timelineSummary && s.timelineSummary.length > 0) {
      md += `## ⏱️ 타임라인별 주요 내용\n`;
      s.timelineSummary.forEach((t) => {
        md += `- **[${t.timestamp}] ${t.title}**: ${t.point}\n`;
      });
      md += `\n`;
    }

    if (s.takeaways && s.takeaways.length > 0) {
      md += `## 💡 시사점 및 인사이트\n`;
      s.takeaways.forEach((item) => {
        md += `- ${item}\n`;
      });
      md += `\n`;
    }

    if (s.keywords && s.keywords.length > 0) {
      md += `## 🏷️ 핵심 키워드\n`;
      md += s.keywords.map(k => `\`#${k}\``).join(' ') + `\n\n`;
    }

    if (s.sentimentLabel) {
      md += `- **분석 톤/성향**: ${s.sentimentLabel}\n`;
      md += `- **예상 읽는 시간**: 약 ${s.readingTimeMinutes}분\n`;
    }
  } else {
    md += `## 📄 영상 기본 정보\n`;
    md += `${video.description || '요약 데이터가 아직 생성되지 않았습니다.'}\n`;
  }

  md += `\n\n---\n*생성 일시: ${new Date().toLocaleString('ko-KR')} | YouTube Daily Summary System*`;
  return md;
}

/**
 * Format single video summary as Clean Text
 */
export function generateVideoText(video: YouTubeVideo): string {
  const s = video.summary;
  const publishedDate = new Date(video.publishedAt).toLocaleString('ko-KR');

  let txt = `=================================================================\n`;
  txt += `[유튜브 영상 요약 보고서] ${video.title}\n`;
  txt += `=================================================================\n\n`;
  txt += `■ 채널명: ${video.channelTitle}\n`;
  txt += `■ 카테고리: ${video.category}\n`;
  txt += `■ 업로드: ${publishedDate} ${video.isYesterday ? '(전일 업로드)' : ''}\n`;
  txt += `■ 영상 URL: ${video.videoUrl}\n`;
  if (video.duration) txt += `■ 재생 시간: ${video.duration}\n`;
  txt += `\n-----------------------------------------------------------------\n\n`;

  if (s) {
    txt += `[1] 핵심 주제\n`;
    txt += `  → ${s.coreTopic}\n\n`;

    txt += `[2] 주요 포인트\n`;
    s.keyPoints.forEach((pt, i) => {
      txt += `  ${i + 1}. ${pt}\n`;
    });
    txt += `\n`;

    txt += `[3] 상세 요약\n`;
    txt += `  ${s.detailedSummary}\n\n`;

    if (s.timelineSummary && s.timelineSummary.length > 0) {
      txt += `[4] 타임라인별 요약\n`;
      s.timelineSummary.forEach((t) => {
        txt += `  - [${t.timestamp}] ${t.title}: ${t.point}\n`;
      });
      txt += `\n`;
    }

    if (s.takeaways && s.takeaways.length > 0) {
      txt += `[5] 시사점 및 액션 플랜\n`;
      s.takeaways.forEach((t) => {
        txt += `  - ${t}\n`;
      });
      txt += `\n`;
    }

    if (s.keywords && s.keywords.length > 0) {
      txt += `[6] 키워드: ${s.keywords.join(', ')}\n\n`;
    }
  } else {
    txt += `영상 설명:\n${video.description}\n`;
  }

  txt += `\n=================================================================\n`;
  txt += `리포트 생성 시간: ${new Date().toLocaleString('ko-KR')}\n`;
  return txt;
}

/**
 * Format single video summary as Word (.doc) HTML
 */
export function generateVideoWordDoc(video: YouTubeVideo): string {
  const s = video.summary;
  const publishedDate = new Date(video.publishedAt).toLocaleString('ko-KR');

  return `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>${escapeHtml(video.title)}</title>
    <style>
      body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; }
      h1 { font-size: 22px; color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 16px; }
      h2 { font-size: 16px; color: #1e40af; margin-top: 20px; margin-bottom: 8px; }
      .meta-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; }
      .meta-item { margin-bottom: 4px; font-size: 13px; }
      .core-box { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 12px 0; font-size: 14px; font-weight: bold; }
      ul, ol { padding-left: 20px; }
      li { margin-bottom: 6px; font-size: 13.5px; }
      .tag { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px; }
      .footer { margin-top: 30px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    </style>
  </head>
  <body>
    <h1>[유튜브 영상 요약 보고서] ${escapeHtml(video.title)}</h1>
    
    <div class="meta-box">
      <div class="meta-item"><b>채널명:</b> ${escapeHtml(video.channelTitle)}</div>
      <div class="meta-item"><b>카테고리:</b> ${escapeHtml(video.category)}</div>
      <div class="meta-item"><b>업로드 일시:</b> ${publishedDate} ${video.isYesterday ? '(전일 업로드)' : ''}</div>
      <div class="meta-item"><b>영상 링크:</b> <a href="${video.videoUrl}">${video.videoUrl}</a></div>
      ${video.duration ? `<div class="meta-item"><b>재생 시간:</b> ${video.duration}</div>` : ''}
    </div>

    ${s ? `
      <h2>🎯 핵심 주제 (Core Topic)</h2>
      <div class="core-box">${escapeHtml(s.coreTopic)}</div>

      <h2>📌 주요 포인트 (Key Points)</h2>
      <ol>
        ${s.keyPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
      </ol>

      <h2>📝 상세 요약 (Detailed Summary)</h2>
      <p style="font-size: 13.5px;">${escapeHtml(s.detailedSummary)}</p>

      ${s.timelineSummary && s.timelineSummary.length > 0 ? `
        <h2>⏱️ 타임라인별 요약</h2>
        <ul>
          ${s.timelineSummary.map(t => `<li><b>[${t.timestamp}] ${escapeHtml(t.title)}:</b> ${escapeHtml(t.point)}</li>`).join('')}
        </ul>
      ` : ''}

      ${s.takeaways && s.takeaways.length > 0 ? `
        <h2>💡 시사점 및 인사이트</h2>
        <ul>
          ${s.takeaways.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
        </ul>
      ` : ''}

      ${s.keywords && s.keywords.length > 0 ? `
        <h2>🏷️ 핵심 키워드</h2>
        <div>
          ${s.keywords.map(k => `<span class="tag">#${escapeHtml(k)}</span>`).join('')}
        </div>
      ` : ''}
    ` : `
      <h2>영상 기본 설명</h2>
      <p>${escapeHtml(video.description)}</p>
    `}

    <div class="footer">
      리포트 자동 생성: ${new Date().toLocaleString('ko-KR')} | YouTube Daily Summary System
    </div>
  </body>
  </html>
  `;
}

/**
 * Generate bundled batch document of multiple videos (e.g. all yesterday videos)
 */
export function generateBatchMarkdown(videos: YouTubeVideo[], titlePrefix: string = '전일 유튜브 영상 일괄 요약집'): string {
  const dateStr = new Date().toLocaleDateString('ko-KR');
  let md = `# 📑 ${titlePrefix} (${dateStr})\n\n`;
  md += `> 총 **${videos.length}**건의 영상 요약 및 핵심 인사이트 분석 모음\n\n`;
  md += `---\n\n`;

  videos.forEach((video, idx) => {
    md += `## [영상 #${idx + 1}] ${video.title}\n`;
    md += `- **채널**: ${video.channelTitle} | **카테고리**: ${video.category} | **일시**: ${new Date(video.publishedAt).toLocaleDateString('ko-KR')}\n`;
    md += `- **URL**: ${video.videoUrl}\n\n`;

    if (video.summary) {
      md += `### 🎯 핵심 주제\n${video.summary.coreTopic}\n\n`;
      md += `### 📌 주요 포인트\n`;
      video.summary.keyPoints.forEach(kp => {
        md += `- ${kp}\n`;
      });
      md += `\n### 📝 상세 요약\n${video.summary.detailedSummary}\n\n`;
      if (video.summary.takeaways?.length) {
        md += `### 💡 시사점\n`;
        video.summary.takeaways.forEach(t => md += `- ${t}\n`);
        md += `\n`;
      }
    }
    md += `\n---\n\n`;
  });

  return md;
}

/**
 * Generate CSV data with UTF-8 BOM for Microsoft Excel compatibility
 */
export function generateVideosCSV(videos: YouTubeVideo[]): string {
  // UTF-8 BOM
  const BOM = '\uFEFF';
  const headers = [
    '영상 제목',
    '채널명',
    '카테고리',
    '업로드일시',
    '전일여부',
    '재생시간',
    '핵심주제',
    '주요포인트1',
    '주요포인트2',
    '주요포인트3',
    '상세요약',
    '핵심키워드',
    '시사점',
    '분석성향',
    '영상URL'
  ];

  const escapeCsv = (str: string | undefined | null) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = videos.map(v => {
    const s = v.summary;
    const pubDate = new Date(v.publishedAt).toISOString().split('T')[0];
    const kp1 = s?.keyPoints?.[0] || '';
    const kp2 = s?.keyPoints?.[1] || '';
    const kp3 = s?.keyPoints?.[2] || '';
    const keywords = s?.keywords?.join(', ') || '';
    const takeaways = s?.takeaways?.join(' / ') || '';

    return [
      escapeCsv(v.title),
      escapeCsv(v.channelTitle),
      escapeCsv(v.category),
      escapeCsv(pubDate),
      escapeCsv(v.isYesterday ? '전일' : '기타'),
      escapeCsv(v.duration || '-'),
      escapeCsv(s?.coreTopic || '-'),
      escapeCsv(kp1),
      escapeCsv(kp2),
      escapeCsv(kp3),
      escapeCsv(s?.detailedSummary || v.description),
      escapeCsv(keywords),
      escapeCsv(takeaways),
      escapeCsv(s?.sentimentLabel || '-'),
      escapeCsv(v.videoUrl)
    ].join(',');
  });

  return BOM + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Generate Excel XML (.xls) formatted document with styled tables
 */
export function generateExcelXML(videos: YouTubeVideo[]): string {
  const rows = videos.map(v => {
    const s = v.summary;
    const pubDate = new Date(v.publishedAt).toISOString().split('T')[0];
    return `
      <tr>
        <td>${escapeHtml(v.title)}</td>
        <td>${escapeHtml(v.channelTitle)}</td>
        <td>${escapeHtml(v.category)}</td>
        <td>${pubDate}</td>
        <td>${v.isYesterday ? '전일' : '기타'}</td>
        <td>${escapeHtml(v.duration || '-')}</td>
        <td>${escapeHtml(s?.coreTopic || '-')}</td>
        <td>${escapeHtml(s?.keyPoints?.join('\n• ') || '-')}</td>
        <td>${escapeHtml(s?.detailedSummary || v.description)}</td>
        <td>${escapeHtml(s?.takeaways?.join('; ') || '-')}</td>
        <td>${escapeHtml(s?.keywords?.join(', ') || '-')}</td>
        <td><a href="${v.videoUrl}">${v.videoUrl}</a></td>
      </tr>
    `;
  }).join('');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; font-family: 'Malgun Gothic', sans-serif; font-size: 11pt; }
        th { background-color: #2563eb; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 12px; }
        td { border: 1px solid #e2e8f0; padding: 6px 10px; vertical-align: top; }
        tr:nth-child(even) { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>영상 제목</th>
            <th>채널명</th>
            <th>카테고리</th>
            <th>업로드일</th>
            <th>전일 구분</th>
            <th>재생시간</th>
            <th>핵심 주제</th>
            <th>주요 포인트</th>
            <th>상세 요약</th>
            <th>시사점/인사이트</th>
            <th>키워드</th>
            <th>영상 URL</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

/**
 * Format Daily Comprehensive Report as Markdown
 */
export function generateDailyReportMarkdown(report: DailyReport): string {
  let md = `# 📊 ${report.title}\n\n`;
  md += `- **분석 기준 일자**: ${report.reportDate}\n`;
  md += `- **분석 대상 영상 수**: 총 ${report.totalVideosAnalyzed}개 (모니터링 채널: ${report.channelsCount}개)\n`;
  md += `- **생성 시각**: ${new Date(report.createdAt).toLocaleString('ko-KR')}\n\n`;
  md += `---\n\n`;

  md += `## 📋 전일 종합 핵심 브리핑 (Executive Summary)\n`;
  md += `${report.executiveSummary}\n\n`;

  md += `## 📈 주요 카테고리별 트렌드 & 이슈 (Key Trends)\n`;
  report.topTrends.forEach((t, i) => {
    md += `### ${i + 1}. [${t.category}] ${t.topic}\n`;
    md += `${t.description}\n\n`;
    if (t.relatedVideoTitles?.length) {
      md += `*관련 영상:*\n`;
      t.relatedVideoTitles.forEach(title => md += `- ${title}\n`);
      md += `\n`;
    }
  });

  md += `## 💡 종합 시사점 (Key Takeaways)\n`;
  report.keyTakeaways.forEach((item, i) => {
    md += `${i + 1}. ${item}\n`;
  });
  md += `\n`;

  if (report.recommendedActions?.length) {
    md += `## 🚀 권장 액션 플랜 (Recommended Actions)\n`;
    report.recommendedActions.forEach((act, i) => {
      md += `${i + 1}. ${act}\n`;
    });
    md += `\n`;
  }

  md += `---\n*YouTube Intelligence Daily Briefing System*`;
  return md;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
