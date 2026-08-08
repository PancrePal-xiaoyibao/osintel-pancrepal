import React from 'react';
import { MapPin, Building2, Award, Stethoscope, Star } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  shortName?: string;
  city: string;
  province: string;
  country: string;
  hospitalLevel: string;
  hospitalType: string;
  pancreaticAnnualSurgeries?: number;
  hasMDT: boolean;
  qualityScore: number;
}

interface CenterHospitalListProps {
  hospitals: Hospital[];
  onSelect: (hospital: Hospital) => void;
}

const LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  '3A': { label: '三甲', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  '3B': { label: '三乙', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  '2A': { label: '二甲', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  'international': { label: '国际', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  'unknown': { label: '未知', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
};

const TYPE_LABELS: Record<string, string> = {
  general: '综合医院',
  cancer_center: '肿瘤专科',
  specialized: '专科医院',
  university: '大学附属',
};

export default function CenterHospitalList({ hospitals, onSelect }: CenterHospitalListProps) {
  if (hospitals.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">未找到匹配的医院</p>
        <p className="text-xs mt-1">请尝试调整筛选条件</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {hospitals.map(h => {
        const levelInfo = LEVEL_LABELS[h.hospitalLevel] || LEVEL_LABELS.unknown;
        return (
          <button
            key={h.id}
            onClick={() => onSelect(h)}
            className="text-left rounded-xl border border-white/5 bg-zinc-900/50 hover:border-white/10 hover:bg-zinc-900/70 p-4 transition-all cursor-pointer group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {h.name}
                </h3>
                {h.shortName && (
                  <span className="text-xs text-zinc-500">{h.shortName}</span>
                )}
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border ${levelInfo.color}`}>
                {levelInfo.label}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5 mb-2 text-xs text-zinc-500">
              <MapPin className="h-3 w-3" />
              <span>{h.city}, {h.province}</span>
              <span className="ml-auto px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                {TYPE_LABELS[h.hospitalType] || h.hospitalType}
              </span>
            </div>

            {/* Bottom bar */}
            <div className="flex items-center gap-3 text-xs text-zinc-500 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-400" />
                <span className="text-zinc-300 font-mono">{h.qualityScore}</span>
              </div>
              {h.pancreaticAnnualSurgeries && (
                <div className="flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  <span>年手术 {h.pancreaticAnnualSurgeries}+</span>
                </div>
              )}
              {h.hasMDT && (
                <div className="flex items-center gap-1 ml-auto">
                  <Award className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">MDT</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
