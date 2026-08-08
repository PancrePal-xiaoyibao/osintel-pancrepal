import React from 'react';
import { Stethoscope, Building2, GraduationCap, Star, Tag } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  title: string;
  hospitalIds: string[];
  departmentName?: string;
  specialties: string[];
  academicTitle?: string;
  academicOrg?: string;
  patientVolume?: number;
  qualityScore: number;
}

interface Hospital {
  id: string;
  name: string;
}

interface CenterDoctorListProps {
  doctors: Doctor[];
  hospitals: Hospital[];
  onSelect: (doctor: Doctor) => void;
}

function getHospitalName(hospitalIds: string[], hospitals: Hospital[]): string {
  if (hospitalIds.length === 0) return '未知';
  const names = hospitalIds
    .map(id => hospitals.find(h => h.id === id)?.name)
    .filter(Boolean);
  return names.length > 0 ? names.join(', ') : '未知';
}

export default function CenterDoctorList({ doctors, hospitals, onSelect }: CenterDoctorListProps) {
  if (doctors.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">未找到匹配的医生</p>
        <p className="text-xs mt-1">请尝试调整筛选条件</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {doctors.map(d => (
        <button
          key={d.id}
          onClick={() => onSelect(d)}
          className="text-left rounded-xl border border-white/5 bg-zinc-900/50 hover:border-white/10 hover:bg-zinc-900/70 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                {d.name}
              </h3>
              <span className="text-xs text-zinc-400">{d.title}</span>
            </div>
            <div className="flex items-center gap-1 text-xs shrink-0">
              <Star className="h-3 w-3 text-amber-400" />
              <span className="text-zinc-300 font-mono">{d.qualityScore}</span>
            </div>
          </div>

          {/* Hospital */}
          <div className="flex items-center gap-1.5 mb-2 text-xs text-zinc-500">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{getHospitalName(d.hospitalIds, hospitals)}</span>
          </div>

          {/* Department & Academic */}
          <div className="flex flex-wrap gap-1 mb-2">
            {d.departmentName && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">{d.departmentName}</span>
            )}
            {d.academicTitle && (
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] border border-purple-500/20">
                <GraduationCap className="h-2.5 w-2.5 inline mr-0.5" />
                {d.academicTitle}
              </span>
            )}
          </div>

          {/* Specialties */}
          <div className="flex flex-wrap gap-1 pt-2 border-t border-white/5">
            <Tag className="h-3 w-3 text-zinc-600 mt-0.5" />
            {d.specialties.slice(0, 3).map((s, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">{s}</span>
            ))}
            {d.specialties.length > 3 && (
              <span className="text-[10px] text-zinc-600">+{d.specialties.length - 3}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
