import React from 'react';
import { Search, X, Filter as FilterIcon, SortAsc } from 'lucide-react';

type EntityType = 'hospital' | 'doctor' | 'service';

interface SearchFilters {
  query: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  // Hospital
  city?: string;
  province?: string;
  hospitalLevel?: string;
  hospitalType?: string;
  // Doctor
  hospitalId?: string;
  specialty?: string;
  title?: string;
  // Service
  category?: string;
  availability?: string;
}

interface CenterSearchPanelProps {
  entityType: EntityType;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  hospitals: { id: string; name: string }[];
}

const HOSPITAL_LEVELS = [
  { value: '', label: '全部等级' },
  { value: '3A', label: '三甲' },
  { value: '3B', label: '三乙' },
  { value: 'international', label: '国际' },
];

const HOSPITAL_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'general', label: '综合医院' },
  { value: 'cancer_center', label: '肿瘤专科' },
  { value: 'specialized', label: '专科医院' },
  { value: 'university', label: '大学附属' },
];

const SERVICE_CATEGORIES = [
  { value: '', label: '全部类别' },
  { value: 'surgery', label: '外科手术' },
  { value: 'chemotherapy', label: '化疗' },
  { value: 'radiotherapy', label: '放疗' },
  { value: 'intervention', label: '介入治疗' },
  { value: 'nutrition', label: '营养支持' },
  { value: 'psychology', label: '心理支持' },
  { value: 'rehabilitation', label: '康复' },
  { value: 'palliative', label: '姑息治疗' },
  { value: 'clinical_trial', label: '临床试验' },
  { value: 'genetic_testing', label: '基因检测' },
];

const AVAIL_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'immediate', label: '即时' },
  { value: 'within_week', label: '一周内' },
  { value: 'within_month', label: '一月内' },
  { value: 'queue_long', label: '排队较长' },
];

const SORT_OPTIONS: Record<EntityType, { value: string; label: string }[]> = {
  hospital: [
    { value: 'qualityScore', label: '质量评分' },
    { value: 'name', label: '名称' },
    { value: 'updatedAt', label: '更新时间' },
  ],
  doctor: [
    { value: 'qualityScore', label: '质量评分' },
    { value: 'name', label: '名称' },
    { value: 'patientVolume', label: '接诊量' },
  ],
  service: [
    { value: 'qualityScore', label: '质量评分' },
    { value: 'name', label: '名称' },
    { value: 'updatedAt', label: '更新时间' },
  ],
};

const selectClass = 'bg-black/60 border border-white/10 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-blue-500/60';

export default function CenterSearchPanel({ entityType, filters, onFiltersChange, hospitals }: CenterSearchPanelProps) {
  const update = (patch: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const reset = () => {
    onFiltersChange({ query: '', sortBy: 'qualityScore', sortOrder: 'desc' });
  };

  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4 space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={filters.query}
          onChange={e => update({ query: e.target.value })}
          placeholder={
            entityType === 'hospital' ? '搜索医院名称、城市...' :
            entityType === 'doctor' ? '搜索医生姓名、专长...' : '搜索服务名称...'
          }
          className="w-full bg-black/60 border border-white/10 rounded-lg py-2 pl-9 pr-8 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/60"
        />
        {filters.query && (
          <button onClick={() => update({ query: '' })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters + Sort Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Hospital Filters */}
        {entityType === 'hospital' && (
          <>
            <select className={selectClass} value={filters.hospitalLevel || ''} onChange={e => update({ hospitalLevel: e.target.value || undefined })}>
              {HOSPITAL_LEVELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className={selectClass} value={filters.hospitalType || ''} onChange={e => update({ hospitalType: e.target.value || undefined })}>
              {HOSPITAL_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              type="text"
              value={filters.city || ''}
              onChange={e => update({ city: e.target.value || undefined })}
              placeholder="城市筛选..."
              className="bg-black/60 border border-white/10 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-zinc-500 w-24 focus:outline-none focus:border-blue-500/60"
            />
          </>
        )}

        {/* Doctor Filters */}
        {entityType === 'doctor' && (
          <>
            <select className={selectClass} value={filters.hospitalId || ''} onChange={e => update({ hospitalId: e.target.value || undefined })}>
              <option value="">所属医院</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </>
        )}

        {/* Service Filters */}
        {entityType === 'service' && (
          <>
            <select className={selectClass} value={filters.category || ''} onChange={e => update({ category: e.target.value || undefined })}>
              {SERVICE_CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className={selectClass} value={filters.availability || ''} onChange={e => update({ availability: e.target.value || undefined })}>
              {AVAIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </>
        )}

        {/* Sort */}
        <div className="flex items-center gap-1 ml-auto">
          <SortAsc className="h-3.5 w-3.5 text-zinc-500" />
          <select className={selectClass} value={filters.sortBy} onChange={e => update({ sortBy: e.target.value })}>
            {SORT_OPTIONS[entityType].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => update({ sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc' })}
            className="px-2 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {filters.sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        {/* Reset */}
        <button onClick={reset} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <FilterIcon className="h-3 w-3" />
          重置
        </button>
      </div>
    </div>
  );
}
