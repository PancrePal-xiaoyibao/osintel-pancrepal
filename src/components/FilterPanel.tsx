import React, { useState } from 'react';
import type { LanguageCode } from '../translations';
import type { FilterParams, SortBy, SortOrder } from '../lib/filtering/types';
import { Calendar, Filter, ArrowUpDown, RotateCcw, ChevronDown } from 'lucide-react';

interface FilterPanelProps {
  filters: FilterParams;
  onFiltersChange: (filters: FilterParams) => void;
  availableSources: string[];
  language: LanguageCode;
}

const UI: Record<string, Record<string, string>> = {
  ZH: {
    title: '高级筛选',
    timeRange: '时间范围',
    from: '开始日期',
    to: '结束日期',
    sources: '信息来源',
    credibility: '最低可信度',
    credibilityAny: '不限',
    sortBy: '排序方式',
    sortTime: '时间',
    sortCredibility: '可信度',
    order: '顺序',
    asc: '升序',
    desc: '降序',
    reset: '重置筛选',
    collapse: '收起',
    expand: '展开',
  },
  EN: {
    title: 'Filters',
    timeRange: 'Time Range',
    from: 'From',
    to: 'To',
    sources: 'Sources',
    credibility: 'Min Credibility',
    credibilityAny: 'Any',
    sortBy: 'Sort By',
    sortTime: 'Time',
    sortCredibility: 'Credibility',
    order: 'Order',
    asc: 'Ascending',
    desc: 'Descending',
    reset: 'Reset Filters',
    collapse: 'Collapse',
    expand: 'Expand',
  },
};

export default function FilterPanel({
  filters,
  onFiltersChange,
  availableSources,
  language,
}: FilterPanelProps) {
  const t = UI[language] || UI.ZH;
  const [collapsed, setCollapsed] = useState(false);

  const update = (patch: Partial<FilterParams>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const selectedSources = filters.sources || [];

  const toggleSource = (source: string) => {
    const next = selectedSources.includes(source)
      ? selectedSources.filter((s) => s !== source)
      : [...selectedSources, source];
    update({ sources: next.length > 0 ? next : undefined });
  };

  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <div className="bg-zinc-950/60 border border-white/10 rounded-xl glass">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 text-xs font-mono tracking-[0.15em] uppercase text-zinc-400 hover:text-white transition"
      >
        <span className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          {t.title}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-5">
          {/* Time Range */}
          <div>
            <label className="block text-[11px] font-mono tracking-[0.1em] uppercase text-zinc-500 mb-2">
              {t.timeRange}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-zinc-600">{t.from}</span>
                <input
                  type="date"
                  value={filters.from || ''}
                  onChange={(e) => update({ from: e.target.value || undefined })}
                  className="w-full mt-1 px-2 py-1.5 text-xs bg-black/60 border border-white/10 rounded-lg text-zinc-300
                             focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40
                             [color-scheme:dark]"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-600">{t.to}</span>
                <input
                  type="date"
                  value={filters.to || ''}
                  onChange={(e) => update({ to: e.target.value || undefined })}
                  className="w-full mt-1 px-2 py-1.5 text-xs bg-black/60 border border-white/10 rounded-lg text-zinc-300
                             focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40
                             [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Credibility Threshold */}
          <div>
            <label className="block text-[11px] font-mono tracking-[0.1em] uppercase text-zinc-500 mb-2">
              {t.credibility} {filters.minCredibility !== undefined ? `: ${filters.minCredibility}` : ''}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.minCredibility ?? 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                update({ minCredibility: val > 0 ? val : undefined });
              }}
              className="w-full accent-blue-500 h-1.5"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
              <span>{t.credibilityAny}</span>
              <span>100</span>
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-[11px] font-mono tracking-[0.1em] uppercase text-zinc-500 mb-2">
              {t.sortBy}
            </label>
            <div className="flex gap-1">
              {(['time', 'credibility'] as SortBy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => update({ sort: s })}
                  className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition ${
                    (filters.sort || 'time') === s
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                      : 'border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                  }`}
                >
                  {s === 'time' ? t.sortTime : t.sortCredibility}
                </button>
              ))}
            </div>
          </div>

          {/* Order */}
          <div>
            <label className="block text-[11px] font-mono tracking-[0.1em] uppercase text-zinc-500 mb-2">
              {t.order}
            </label>
            <div className="flex gap-1">
              {(['desc', 'asc'] as SortOrder[]).map((o) => (
                <button
                  key={o}
                  onClick={() => update({ order: o })}
                  className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition ${
                    (filters.order || 'desc') === o
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                      : 'border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    <ArrowUpDown className="w-3 h-3" />
                    {o === 'asc' ? t.asc : t.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Source Multi-select */}
          {availableSources.length > 0 && (
            <div>
              <label className="block text-[11px] font-mono tracking-[0.1em] uppercase text-zinc-500 mb-2">
                {t.sources}
                {selectedSources.length > 0 && (
                  <span className="ml-1 text-blue-400">({selectedSources.length})</span>
                )}
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {availableSources.map((src) => (
                  <label
                    key={src}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-xs text-zinc-400"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(src)}
                      onChange={() => toggleSource(src)}
                      className="w-3 h-3 rounded accent-blue-500"
                    />
                    <span className="truncate">{src}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-zinc-500
                       border border-white/10 rounded-lg hover:text-zinc-300 hover:border-white/20 transition"
          >
            <RotateCcw className="w-3 h-3" />
            {t.reset}
          </button>
        </div>
      )}
    </div>
  );
}
