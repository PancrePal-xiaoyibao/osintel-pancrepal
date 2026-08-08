import React, { Suspense, lazy, useEffect, useState, useMemo } from 'react';
import { Building2, Stethoscope, HeartPulse, Globe, Loader2 } from 'lucide-react';

import CenterHospitalList from './CenterHospitalList';
import CenterDoctorList from './CenterDoctorList';
import CenterServiceList from './CenterServiceList';
import CenterSearchPanel from './CenterSearchPanel';
import CenterDetailCard from './CenterDetailCard';
import CenterMapView from './CenterMapView';

const CenterSubmissionForm = lazy(() => import('./CenterSubmissionForm'));
const CenterAdminPanel = lazy(() => import('./CenterAdminPanel'));

interface Hospital {
  id: string; name: string; shortName?: string; city: string; province: string; country: string;
  latitude: number; longitude: number; hospitalLevel: string; hospitalType: string;
  accreditedBy?: string[]; pancreaticAnnualSurgeries?: number; hasMDT: boolean;
  mdtSchedule?: string; contact?: string; website?: string; sourceUrls: string[];
  dataQuality: string; qualityScore: number; verifiedAt?: string; updatedAt: string;
}

interface Doctor {
  id: string; name: string; title: string; hospitalIds: string[]; departmentName?: string;
  specialties: string[]; academicTitle?: string; academicOrg?: string; patientVolume?: number;
  publications?: string[]; clinicalTrialIds?: string[]; sourceUrls: string[];
  dataQuality: string; qualityScore: number; verifiedAt?: string; updatedAt: string;
}

interface Service {
  id: string; name: string; description: string; category: string; hospitalId: string;
  departmentName?: string; availability: string; costRange?: string;
  insuranceCoverage?: string[]; requirements?: string[]; sourceUrls: string[];
  dataQuality: string; qualityScore: number; verifiedAt?: string; updatedAt: string;
}

interface SearchFilters {
  query: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  city?: string;
  province?: string;
  hospitalLevel?: string;
  hospitalType?: string;
  hospitalId?: string;
  specialty?: string;
  category?: string;
  availability?: string;
}

type EntityTab = 'hospitals' | 'doctors' | 'services' | 'map' | 'submit' | 'admin';

const TABS: { key: EntityTab; label: string; icon: React.ReactNode }[] = [
  { key: 'hospitals', label: '医院', icon: <Building2 className="h-4 w-4" /> },
  { key: 'doctors', label: '医生', icon: <Stethoscope className="h-4 w-4" /> },
  { key: 'services', label: '服务', icon: <HeartPulse className="h-4 w-4" /> },
  { key: 'map', label: '地图', icon: <Globe className="h-4 w-4" /> },
];

const EXTRA_TABS: { key: EntityTab; label: string }[] = [
  { key: 'submit', label: '社区提交' },
  { key: 'admin', label: '审核管理' },
];

const DEFAULT_FILTERS: SearchFilters = { query: '', sortBy: 'qualityScore', sortOrder: 'desc' };

export default function CenterInfoView() {
  const [activeTab, setActiveTab] = useState<EntityTab>('hospitals');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ type: 'hospital' | 'doctor' | 'service'; data: unknown } | null>(null);

  // Separate filter states per entity type so switching tabs remembers filters
  const [hospitalFilters, setHospitalFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [doctorFilters, setDoctorFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [serviceFilters, setServiceFilters] = useState<SearchFilters>(DEFAULT_FILTERS);

  const activeFilters = activeTab === 'hospitals' ? hospitalFilters : activeTab === 'doctors' ? doctorFilters : activeTab === 'services' ? serviceFilters : DEFAULT_FILTERS;
  const setActiveFilters = activeTab === 'hospitals' ? setHospitalFilters : activeTab === 'doctors' ? setDoctorFilters : setServiceFilters;

  // Fetch all data
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [hospRes, docRes, svcRes] = await Promise.all([
          fetch('/api/centers/hospitals?limit=200'),
          fetch('/api/centers/doctors?limit=200'),
          fetch('/api/centers/services?limit=200'),
        ]);
        const [hospJson, docJson, svcJson] = await Promise.all([hospRes.json(), docRes.json(), svcRes.json()]);
        if (hospJson.status === 'ok') setHospitals(hospJson.data);
        if (docJson.status === 'ok') setDoctors(docJson.data);
        if (svcJson.status === 'ok') setServices(svcJson.data);
      } catch {
        setError('加载数据失败，请检查网络连接');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Client-side filtering
  const filteredHospitals = useMemo(() => {
    let result = [...hospitals];
    const f = hospitalFilters;
    if (f.query) {
      const q = f.query.toLowerCase();
      result = result.filter(h => h.name.toLowerCase().includes(q) || h.city.includes(q) || h.province.includes(q));
    }
    if (f.city) result = result.filter(h => h.city === f.city);
    if (f.hospitalLevel) result = result.filter(h => h.hospitalLevel === f.hospitalLevel);
    if (f.hospitalType) result = result.filter(h => h.hospitalType === f.hospitalType);
    result.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[f.sortBy] as number || 0;
      const bVal = (b as unknown as Record<string, unknown>)[f.sortBy] as number || 0;
      return f.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return result;
  }, [hospitals, hospitalFilters]);

  const filteredDoctors = useMemo(() => {
    let result = [...doctors];
    const f = doctorFilters;
    if (f.query) {
      const q = f.query.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q) || d.specialties.some(s => s.includes(q)));
    }
    if (f.hospitalId) result = result.filter(d => d.hospitalIds.includes(f.hospitalId!));
    result.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[f.sortBy] as number || 0;
      const bVal = (b as unknown as Record<string, unknown>)[f.sortBy] as number || 0;
      return f.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return result;
  }, [doctors, doctorFilters]);

  const filteredServices = useMemo(() => {
    let result = [...services];
    const f = serviceFilters;
    if (f.query) {
      const q = f.query.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.description.includes(q));
    }
    if (f.category) result = result.filter(s => s.category === f.category);
    if (f.availability) result = result.filter(s => s.availability === f.availability);
    if (f.hospitalId) result = result.filter(s => s.hospitalId === f.hospitalId);
    result.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[f.sortBy] as number || 0;
      const bVal = (b as unknown as Record<string, unknown>)[f.sortBy] as number || 0;
      return f.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return result;
  }, [services, serviceFilters]);

  // Hospital reference list for lookup
  const hospitalRefs = useMemo(() => hospitals.map(h => ({ id: h.id, name: h.name })), [hospitals]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-12 text-center">
        <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-blue-400" />
        <p className="text-sm text-zinc-400">加载胰腺中心信息库...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
        <p className="text-sm text-rose-300">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-3 text-xs text-rose-400 hover:text-rose-300 underline">重试</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Tab Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-zinc-900/60 rounded-lg p-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {EXTRA_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-zinc-800 text-zinc-200 border border-white/10'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hospital Tab */}
      {activeTab === 'hospitals' && (
        <div className="space-y-3">
          <CenterSearchPanel
            entityType="hospital"
            filters={hospitalFilters}
            onFiltersChange={setHospitalFilters}
            hospitals={hospitalRefs}
          />
          <CenterHospitalList
            hospitals={filteredHospitals}
            onSelect={h => setDetail({ type: 'hospital', data: h })}
          />
        </div>
      )}

      {/* Doctor Tab */}
      {activeTab === 'doctors' && (
        <div className="space-y-3">
          <CenterSearchPanel
            entityType="doctor"
            filters={doctorFilters}
            onFiltersChange={setDoctorFilters}
            hospitals={hospitalRefs}
          />
          <CenterDoctorList
            doctors={filteredDoctors}
            hospitals={hospitalRefs}
            onSelect={d => setDetail({ type: 'doctor', data: d })}
          />
        </div>
      )}

      {/* Service Tab */}
      {activeTab === 'services' && (
        <div className="space-y-3">
          <CenterSearchPanel
            entityType="service"
            filters={serviceFilters}
            onFiltersChange={setServiceFilters}
            hospitals={hospitalRefs}
          />
          <CenterServiceList
            services={filteredServices}
            hospitals={hospitalRefs}
            onSelect={s => setDetail({ type: 'service', data: s })}
          />
        </div>
      )}

      {/* Map Tab */}
      {activeTab === 'map' && (
        <CenterMapView
          hospitals={hospitals}
          onSelect={h => setDetail({ type: 'hospital', data: h })}
        />
      )}

      {/* Submit Tab */}
      {activeTab === 'submit' && (
        <Suspense fallback={<div className="text-center py-8 text-zinc-400 text-sm">加载中...</div>}>
          <CenterSubmissionForm />
        </Suspense>
      )}

      {/* Admin Tab */}
      {activeTab === 'admin' && (
        <Suspense fallback={<div className="text-center py-8 text-zinc-400 text-sm">加载中...</div>}>
          <CenterAdminPanel />
        </Suspense>
      )}

      {/* Detail Drawer */}
      <CenterDetailCard
        entity={detail}
        hospitals={hospitalRefs}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}
