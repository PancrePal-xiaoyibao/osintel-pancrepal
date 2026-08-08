import React, { useMemo } from 'react';
import { MapPin, Building2, Globe, Star } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  shortName?: string;
  city: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  hospitalLevel: string;
  hospitalType: string;
  qualityScore: number;
  hasMDT: boolean;
  pancreaticAnnualSurgeries?: number;
}

interface CenterMapViewProps {
  hospitals: Hospital[];
  onSelect: (hospital: Hospital) => void;
}

interface CityGroup {
  city: string;
  province: string;
  hospitals: Hospital[];
  avgLat: number;
  avgLng: number;
}

const LEVEL_COLORS: Record<string, string> = {
  '3A': 'bg-blue-500',
  '3B': 'bg-sky-500',
  '2A': 'bg-teal-500',
  'international': 'bg-purple-500',
  'unknown': 'bg-zinc-600',
};

export default function CenterMapView({ hospitals, onSelect }: CenterMapViewProps) {
  const cityGroups = useMemo(() => {
    const map = new Map<string, CityGroup>();
    hospitals.forEach(h => {
      const key = `${h.city}-${h.province}`;
      if (!map.has(key)) {
        map.set(key, { city: h.city, province: h.province, hospitals: [], avgLat: 0, avgLng: 0 });
      }
      const g = map.get(key)!;
      g.hospitals.push(h);
      g.avgLat = (g.avgLat * (g.hospitals.length - 1) + h.latitude) / g.hospitals.length;
      g.avgLng = (g.avgLng * (g.hospitals.length - 1) + h.longitude) / g.hospitals.length;
    });
    return Array.from(map.values()).sort((a, b) => b.hospitals.length - a.hospitals.length);
  }, [hospitals]);

  if (hospitals.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">暂无医院位置数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* City Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cityGroups.map(group => {
          const topHospital = group.hospitals.sort((a, b) => b.qualityScore - a.qualityScore)[0];
          const threeA = group.hospitals.filter(h => h.hospitalLevel === '3A').length;
          const mdt = group.hospitals.filter(h => h.hasMDT).length;

          return (
            <div key={`${group.city}-${group.province}`} className="rounded-xl border border-white/5 bg-zinc-900/50 hover:border-white/10 transition-colors p-4">
              {/* City Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">{group.city}</h3>
                    <p className="text-[10px] text-zinc-500">{group.province}</p>
                  </div>
                </div>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{group.hospitals.length} 家医院</span>
              </div>

              {/* City Stats */}
              <div className="flex gap-3 mb-3 text-[10px] text-zinc-500">
                {threeA > 0 && <span className="text-blue-400">{threeA} 家三甲</span>}
                {mdt > 0 && <span className="text-emerald-400">{mdt} 家有 MDT</span>}
              </div>

              {/* Top Hospital */}
              {topHospital && (
                <button
                  onClick={() => onSelect(topHospital)}
                  className="w-full text-left rounded-lg bg-zinc-800/50 hover:bg-zinc-800 p-3 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`h-2 w-2 rounded-full ${LEVEL_COLORS[topHospital.hospitalLevel] || 'bg-zinc-500'}`} />
                    <span className="text-xs text-white group-hover:text-blue-400 transition-colors truncate">{topHospital.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5 text-amber-400" />{topHospital.qualityScore}</span>
                    {topHospital.pancreaticAnnualSurgeries && <span>年手术 {topHospital.pancreaticAnnualSurgeries}+</span>}
                  </div>
                </button>
              )}

              {/* Hospital List */}
              {group.hospitals.length > 1 && (
                <div className="mt-2 space-y-1">
                  {group.hospitals.map(h => (
                    <button
                      key={h.id}
                      onClick={() => onSelect(h)}
                      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 text-xs text-zinc-400 hover:text-zinc-200 transition-colors group"
                    >
                      <div className={`h-1.5 w-1.5 rounded-full ${LEVEL_COLORS[h.hospitalLevel] || 'bg-zinc-600'}`} />
                      <span className="truncate flex-1">{h.name}</span>
                      <span className="shrink-0 text-zinc-600 font-mono">{h.qualityScore}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Geographic Context */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4 text-zinc-500" />
          <span className="text-xs text-zinc-500">分布概览</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {cityGroups.map(g => (
            <span key={`stat-${g.city}`} className="text-xs text-zinc-400">
              <MapPin className="h-3 w-3 inline text-zinc-600 mr-1" />
              {g.city}({g.hospitals.length})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
