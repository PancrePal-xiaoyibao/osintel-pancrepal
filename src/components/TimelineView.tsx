import React from 'react';
import type { LanguageCode } from '../translations';
import type { ScoredResult } from '../lib/credibility/types';
import type { SourceTier, EvidenceLevel } from '../lib/credibility/types';
import {
  ExternalLink, Clock, Shield, Microscope, FileText,
  Award, AlertCircle, Database, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';

interface TimelineViewProps {
  items: ScoredResult[];
  isLoading: boolean;
  language: LanguageCode;
  onItemClick?: (item: ScoredResult) => void;
}

/** Category labels — plain string lookups, kept outside UI dict for type safety */
function tierLabel(tier: SourceTier, lang: string): string {
  if (lang === 'EN') return tier.replace('s', 'S').replace(/_/g, ' ');
  const m: Record<string, string> = {
    s1_regulatory: '监管机构', s2_top_journal: '顶级期刊',
    s3_clinical_trial: '临床试验', s4_academic: '学术',
    s5_guideline: '诊疗指南', s6_medical_news: '医学媒体',
    s7_general_news: '通用新闻', s8_unknown: '未知',
  };
  return m[tier] || tier;
}

function evidenceLabel(level: EvidenceLevel, lang: string): string {
  if (lang === 'EN') return level.replace(/_/g, ' ');
  const m: Record<string, string> = {
    meta_analysis: 'Meta分析', systematic_review: '系统综述',
    rct: 'RCT', cohort_study: '队列研究', case_control: '病例对照',
    case_report: '病例报告', expert_opinion: '专家意见', unknown: '未知',
  };
  return m[level] || level;
}

function daysAgoLabel(d: number, lang: string): string {
  return lang === 'EN' ? `${d} days ago` : `${d} 天前`;
}

const UI: Record<string, Record<string, string>> = {
  ZH: {
    empty: '暂无匹配结果',
    emptyHint: '调整筛选条件或等待数据更新试试',
    loading: '加载中...',
    error: '加载失败，请重试',
    today: '今天',
    yesterday: '昨天',
    noDate: '无日期',
    expand: '展开',
    collapse: '收起',
    source: '来源',
    evidence: '证据等级',
  },
  EN: {
    empty: 'No results found',
    emptyHint: 'Try adjusting filters or wait for data updates',
    loading: 'Loading...',
    error: 'Failed to load, please retry',
    today: 'Today',
    yesterday: 'Yesterday',
    noDate: 'No date',
    expand: 'Expand',
    collapse: 'Collapse',
    source: 'Source',
    evidence: 'Evidence',
  },
};

function getRelativeTime(publishedAt: string | undefined, lang: string): string {
  if (!publishedAt) return lang === 'EN' ? 'No date' : '无日期';
  const now = Date.now();
  const then = new Date(publishedAt).getTime();
  if (isNaN(then)) return lang === 'EN' ? 'No date' : '无日期';
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return lang === 'EN' ? 'Today' : '今天';
  if (diffDays === 1) return lang === 'EN' ? 'Yesterday' : '昨天';
  if (diffDays < 30) return daysAgoLabel(diffDays, lang);
  return new Date(publishedAt).toLocaleDateString(lang === 'EN' ? 'en-US' : 'zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function tierColor(tier: SourceTier): string {
  switch (tier) {
    case 's1_regulatory': case 's2_top_journal':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 's3_clinical_trial': case 's4_academic':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 's5_guideline':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case 's6_medical_news':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 's7_general_news':
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
    default:
      return 'bg-zinc-700/30 text-zinc-500 border-zinc-700/40';
  }
}

function credibilityColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (score >= 40) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-red-500/15 text-red-400 border-red-500/30';
}

function evidenceIcon(level: EvidenceLevel) {
  switch (level) {
    case 'meta_analysis': case 'systematic_review': return <Award className="w-3 h-3" />;
    case 'rct': return <Microscope className="w-3 h-3" />;
    case 'cohort_study': case 'case_control': return <Database className="w-3 h-3" />;
    case 'case_report': return <FileText className="w-3 h-3" />;
    default: return <AlertCircle className="w-3 h-3" />;
  }
}

function SkeletonCard() {
  return (
    <div className="bg-zinc-950/45 border border-white/10 rounded-xl p-4 animate-pulse glass">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 bg-zinc-800 rounded w-20" />
        <div className="h-4 bg-zinc-800 rounded w-12" />
      </div>
      <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
      <div className="h-3 bg-zinc-800 rounded w-full mb-1" />
      <div className="h-3 bg-zinc-800 rounded w-2/3" />
    </div>
  );
}

function TimelineCard({
  item,
  t,
  language,
  onItemClick,
}: {
  item: ScoredResult;
  t: typeof UI.ZH;
  language: string;
  onItemClick?: (item: ScoredResult) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const cs = item.credibility;

  return (
    <div
      className="bg-zinc-950/45 border border-white/10 rounded-xl p-4 hover:border-white/20 transition group glass"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <button
          onClick={() => onItemClick?.(item)}
          className="text-left flex-1 min-w-0"
        >
          <h4 className="text-sm font-medium text-zinc-200 hover:text-white transition line-clamp-2 group-hover:line-clamp-none leading-snug">
            {item.title}
          </h4>
        </button>

        {/* Credibility badge */}
        {cs && (
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${credibilityColor(cs.score)}`}>
            <Shield className="w-2.5 h-2.5" />
            {cs.score}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {/* Tier badge */}
        {cs && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${tierColor(cs.sourceTier)}`}>
            {tierLabel(cs.sourceTier, language)}
          </span>
        )}

        {/* Evidence badge */}
        {cs && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/10 text-zinc-500 bg-zinc-800/40">
            {evidenceIcon(cs.evidenceLevel)}
            {evidenceLabel(cs.evidenceLevel, language)}
          </span>
        )}

        {/* Source */}
        <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
          {item.source}
        </span>
      </div>

      {/* Snippet */}
      <p className={`text-xs text-zinc-500 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
        {item.snippet || ''}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-3">
          {/* Date */}
          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600">
            <Clock className="w-2.5 h-2.5" />
            {getRelativeTime(item.publishedAt, language)}
          </span>

          {/* Identifier pills */}
          {item.doi && (
            <span className="text-[10px] font-mono text-zinc-700 bg-zinc-800/30 px-1.5 py-0.5 rounded">
              DOI
            </span>
          )}
          {item.pmid && (
            <span className="text-[10px] font-mono text-zinc-700 bg-zinc-800/30 px-1.5 py-0.5 rounded">
              PMID
            </span>
          )}
          {item.nct && (
            <span className="text-[10px] font-mono text-zinc-700 bg-zinc-800/30 px-1.5 py-0.5 rounded">
              NCT
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {item.snippet && item.snippet.length > 80 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition flex items-center gap-0.5"
            >
              {expanded ? t.collapse : t.expand}
              {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          )}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-blue-500/70 hover:text-blue-400 transition flex items-center gap-0.5"
          >
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TimelineView({
  items,
  isLoading,
  language,
  onItemClick,
}: TimelineViewProps) {
  const t = UI[language as keyof typeof UI] || UI.ZH;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Empty state
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
          <Database className="w-7 h-7 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-400 font-medium mb-1">{t.empty}</p>
        <p className="text-xs text-zinc-600">{t.emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <React.Fragment key={`${item.url}-${idx}`}>
          <TimelineCard
            item={item}
            t={t}
            language={language}
            onItemClick={onItemClick}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
