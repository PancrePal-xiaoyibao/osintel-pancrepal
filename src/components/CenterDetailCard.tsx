import React from 'react';
import { X, MapPin, Building2, Stethoscope, Star, Globe, Award, Clock, Shield, Link, Calendar, Users, Tag, Phone } from 'lucide-react';

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
  accreditedBy?: string[];
  pancreaticAnnualSurgeries?: number;
  hasMDT: boolean;
  mdtSchedule?: string;
  contact?: string;
  website?: string;
  sourceUrls: string[];
  dataQuality: string;
  qualityScore: number;
  verifiedAt?: string;
  updatedAt: string;
}

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
  publications?: string[];
  clinicalTrialIds?: string[];
  sourceUrls: string[];
  dataQuality: string;
  qualityScore: number;
  updatedAt: string;
}

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
  requirements?: string[];
  sourceUrls: string[];
  dataQuality: string;
  qualityScore: number;
  updatedAt: string;
}

type EntityInfo = { type: 'hospital'; data: Hospital } | { type: 'doctor'; data: Doctor } | { type: 'service'; data: Service };

interface CenterDetailCardProps {
  entity: EntityInfo | null;
  hospitals: { id: string; name: string }[];
  onClose: () => void;
}

const LEVEL_LABELS: Record<string, string> = {
  '3A': '三甲', '3B': '三乙', '2A': '二甲', 'international': '国际', 'unknown': '未知',
};

const CATEGORY_LABELS: Record<string, string> = {
  surgery: '外科手术', chemotherapy: '化疗', radiotherapy: '放疗', intervention: '介入治疗',
  nutrition: '营养支持', psychology: '心理支持', rehabilitation: '康复', palliative: '姑息治疗',
  clinical_trial: '临床试验', genetic_testing: '基因检测',
};

const AVAIL_LABELS: Record<string, string> = {
  immediate: '即时可用', within_week: '一周内', within_month: '一月内',
  queue_long: '排队较长', unknown: '未知',
};

export default function CenterDetailCard({ entity, hospitals, onClose }: CenterDetailCardProps) {
  if (!entity) return null;

  const badgeClass = 'px-2 py-0.5 rounded text-[10px] font-medium border';
  const sectionClass = 'border-t border-white/5 pt-3 mt-3';
  const labelClass = 'text-xs text-zinc-500 flex items-center gap-1.5';
  const valueClass = 'text-sm text-zinc-200';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-zinc-950 border-l border-white/10 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {entity.type === 'hospital' && <Building2 className="h-5 w-5 text-blue-400" />}
            {entity.type === 'doctor' && <Stethoscope className="h-5 w-5 text-emerald-400" />}
            {entity.type === 'service' && <Calendar className="h-5 w-5 text-amber-400" />}
            <span className="text-xs text-zinc-500 font-mono">
              {entity.type === 'hospital' ? '医院详情' : entity.type === 'doctor' ? '医生详情' : '服务详情'}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          {/* === HOSPITAL DETAIL === */}
          {entity.type === 'hospital' && (() => {
            const h = entity.data;
            return (
              <>
                <h2 className="text-xl font-bold text-white">{h.name}</h2>
                {h.shortName && <p className="text-sm text-zinc-400">{h.shortName}</p>}
                
                <div className="flex flex-wrap gap-2">
                  <span className={`${badgeClass} bg-blue-500/10 text-blue-400 border-blue-500/20`}>
                    {LEVEL_LABELS[h.hospitalLevel] || h.hospitalLevel}
                  </span>
                  <span className={`${badgeClass} bg-zinc-800 text-zinc-400 border-zinc-700`}>
                    {h.hospitalType === 'general' ? '综合医院' : h.hospitalType === 'cancer_center' ? '肿瘤专科' : h.hospitalType}
                  </span>
                  <span className={`${badgeClass} ${h.qualityScore >= 80 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Star className="h-2.5 w-2.5 inline mr-0.5" />{h.qualityScore}
                  </span>
                </div>

                <div className={labelClass}><MapPin className="h-3.5 w-3.5" />{h.city}, {h.province}, {h.country}</div>
                <div className={labelClass}><Globe className="h-3.5 w-3.5" />{h.latitude.toFixed(2)}, {h.longitude.toFixed(2)}</div>

                {h.pancreaticAnnualSurgeries && (
                  <div className={labelClass}><Stethoscope className="h-3.5 w-3.5" />年胰腺手术量：{h.pancreaticAnnualSurgeries}+</div>
                )}
                {h.hasMDT && (
                  <div className={labelClass}><Award className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">多学科会诊 (MDT) {h.mdtSchedule ? `— ${h.mdtSchedule}` : ''}</span>
                  </div>
                )}

                {h.accreditedBy && h.accreditedBy.length > 0 && (
                  <div className={`${badgeClass} inline-block bg-purple-500/10 text-purple-400 border-purple-500/20`}>
                    {h.accreditedBy.join(', ')} 认证
                  </div>
                )}

                {h.contact && (
                  <div className={sectionClass}>
                    <div className={labelClass}><Phone className="h-3.5 w-3.5" />联系方式：<span className="text-zinc-300 font-mono">{h.contact}</span></div>
                  </div>
                )}

                {h.website && (
                  <div className={labelClass}><Link className="h-3.5 w-3.5" />
                    <a href={h.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">{h.website}</a>
                  </div>
                )}

                {h.sourceUrls.length > 0 && (
                  <div className={sectionClass}>
                    <p className="text-xs text-zinc-500 mb-1">数据来源：</p>
                    {h.sourceUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="block text-xs text-blue-400 hover:text-blue-300 truncate">{url}</a>
                    ))}
                  </div>
                )}

                <div className={sectionClass}>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>数据质量：{h.dataQuality}</span>
                    {h.verifiedAt && <span>验证时间：{new Date(h.verifiedAt).toLocaleDateString('zh-CN')}</span>}
                    <span>更新：{new Date(h.updatedAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
              </>
            );
          })()}

          {/* === DOCTOR DETAIL === */}
          {entity.type === 'doctor' && (() => {
            const d = entity.data;
            const hospNames = d.hospitalIds.map(id => hospitals.find(h => h.id === id)?.name).filter(Boolean);
            return (
              <>
                <h2 className="text-xl font-bold text-white">{d.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className={`${badgeClass} bg-zinc-800 text-zinc-400 border-zinc-700`}>{d.title}</span>
                  {d.academicTitle && (
                    <span className={`${badgeClass} bg-purple-500/10 text-purple-400 border-purple-500/20`}>{d.academicTitle}</span>
                  )}
                  <span className={`${badgeClass} ${d.qualityScore >= 80 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Star className="h-2.5 w-2.5 inline mr-0.5" />{d.qualityScore}
                  </span>
                </div>

                <div className={labelClass}><Building2 className="h-3.5 w-3.5" />{hospNames.length > 0 ? hospNames.join(', ') : '未知医院'}</div>
                {d.departmentName && <div className={labelClass}><Tag className="h-3.5 w-3.5" />{d.departmentName}</div>}
                {d.academicOrg && <div className={labelClass}><Award className="h-3.5 w-3.5" />{d.academicOrg}</div>}

                <div className={sectionClass}>
                  <p className="text-xs text-zinc-500 mb-1">专长：</p>
                  <div className="flex flex-wrap gap-1">
                    {d.specialties.map((s, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">{s}</span>
                    ))}
                  </div>
                </div>

                {d.patientVolume && (
                  <div className={labelClass}><Users className="h-3.5 w-3.5" />年接诊量：{d.patientVolume}+</div>
                )}

                {d.sourceUrls.length > 0 && (
                  <div className={sectionClass}>
                    <p className="text-xs text-zinc-500 mb-1">数据来源：</p>
                    {d.sourceUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="block text-xs text-blue-400 hover:text-blue-300 truncate">{url}</a>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          {/* === SERVICE DETAIL === */}
          {entity.type === 'service' && (() => {
            const s = entity.data;
            const hospName = hospitals.find(h => h.id === s.hospitalId)?.name || '未知';
            return (
              <>
                <h2 className="text-xl font-bold text-white">{s.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className={`${badgeClass} bg-blue-500/10 text-blue-400 border-blue-500/20`}>
                    {CATEGORY_LABELS[s.category] || s.category}
                  </span>
                  <span className={`${badgeClass} ${s.availability === 'immediate' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Clock className="h-2.5 w-2.5 inline mr-0.5" />{AVAIL_LABELS[s.availability] || s.availability}
                  </span>
                  <span className={`${badgeClass} ${s.qualityScore >= 80 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Star className="h-2.5 w-2.5 inline mr-0.5" />{s.qualityScore}
                  </span>
                </div>

                <div className={labelClass}><Building2 className="h-3.5 w-3.5" />{hospName}</div>
                {s.departmentName && <div className={labelClass}><Tag className="h-3.5 w-3.5" />{s.departmentName}</div>}

                <div className={sectionClass}>
                  <p className="text-sm text-zinc-300 leading-relaxed">{s.description}</p>
                </div>

                {s.costRange && (
                  <div className={labelClass}>费用：<span className="text-zinc-300">{s.costRange}</span></div>
                )}

                {s.insuranceCoverage && s.insuranceCoverage.length > 0 && (
                  <div className={labelClass}>
                    <Shield className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">医保：{s.insuranceCoverage.join(', ')}</span>
                  </div>
                )}

                {s.requirements && s.requirements.length > 0 && (
                  <div className={sectionClass}>
                    <p className="text-xs text-zinc-500 mb-1">准入条件：</p>
                    {s.requirements.map((r, i) => (
                      <p key={i} className="text-xs text-zinc-400">• {r}</p>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}
