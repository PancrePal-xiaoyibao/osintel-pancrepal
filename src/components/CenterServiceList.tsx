import React from 'react';
import { HeartPulse, Building2, Clock, Star, Shield } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  hospitalId: string;
  departmentName?: string;
  availability: string;
  costRange?: string;
  insuranceCoverage?: string[];
  qualityScore: number;
}

interface Hospital {
  id: string;
  name: string;
}

interface CenterServiceListProps {
  services: Service[];
  hospitals: Hospital[];
  onSelect: (service: Service) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  surgery: { label: '外科手术', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  chemotherapy: { label: '化疗', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  radiotherapy: { label: '放疗', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  intervention: { label: '介入治疗', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  nutrition: { label: '营养支持', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  psychology: { label: '心理支持', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  rehabilitation: { label: '康复', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  palliative: { label: '姑息治疗', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  clinical_trial: { label: '临床试验', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  genetic_testing: { label: '基因检测', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
};

const AVAILABILITY_LABELS: Record<string, { label: string; color: string }> = {
  immediate: { label: '即时', color: 'bg-emerald-500/10 text-emerald-400' },
  within_week: { label: '一周内', color: 'bg-blue-500/10 text-blue-400' },
  within_month: { label: '一月内', color: 'bg-amber-500/10 text-amber-400' },
  queue_long: { label: '排队较长', color: 'bg-rose-500/10 text-rose-400' },
  unknown: { label: '未知', color: 'bg-zinc-800 text-zinc-400' },
};

export default function CenterServiceList({ services, hospitals, onSelect }: CenterServiceListProps) {
  if (services.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <HeartPulse className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">未找到匹配的服务</p>
        <p className="text-xs mt-1">请尝试调整筛选条件</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {services.map(s => {
        const catInfo = CATEGORY_LABELS[s.category] || { label: s.category, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
        const avInfo = AVAILABILITY_LABELS[s.availability] || { label: s.availability, color: 'bg-zinc-800 text-zinc-400' };
        const hospName = hospitals.find(h => h.id === s.hospitalId)?.name || '未知';
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="text-left rounded-xl border border-white/5 bg-zinc-900/50 hover:border-white/10 hover:bg-zinc-900/70 p-4 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors flex-1 min-w-0 mr-2">
                {s.name}
              </h3>
              <div className="flex items-center gap-1 text-xs shrink-0">
                <Star className="h-3 w-3 text-amber-400" />
                <span className="text-zinc-300 font-mono">{s.qualityScore}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{s.description}</p>

            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${catInfo.color}`}>
                {catInfo.label}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${avInfo.color}`}>
                <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                {avInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-white/5 text-xs text-zinc-500">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{hospName}</span>
              </div>
              {s.departmentName && <span>{s.departmentName}</span>}
              {s.insuranceCoverage && s.insuranceCoverage.length > 0 && (
                <div className="flex items-center gap-1 ml-auto">
                  <Shield className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">{s.insuranceCoverage[0]}医保</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
