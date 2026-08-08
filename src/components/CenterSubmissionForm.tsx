import React, { useState } from 'react';
import { Send, CheckCircle, AlertTriangle, Hospital, Stethoscope, HeartPulse } from 'lucide-react';

interface CenterSubmissionFormProps {
  userId?: string;
  userName?: string;
}

type EntityTab = 'hospital' | 'doctor' | 'service';

const ENTITY_TABS: { key: EntityTab; label: string; icon: React.ReactNode }[] = [
  { key: 'hospital', label: '医院', icon: <Hospital className="h-4 w-4" /> },
  { key: 'doctor', label: '医生', icon: <Stethoscope className="h-4 w-4" /> },
  { key: 'service', label: '服务', icon: <HeartPulse className="h-4 w-4" /> },
];

interface FormResult {
  success: boolean;
  message: string;
}

export default function CenterSubmissionForm({ userId, userName }: CenterSubmissionFormProps) {
  const [activeTab, setActiveTab] = useState<EntityTab>('hospital');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<FormResult | null>(null);

  // Hospital fields
  const [hospName, setHospName] = useState('');
  const [hospId, setHospId] = useState('');
  const [hospCity, setHospCity] = useState('');
  const [hospProvince, setHospProvince] = useState('');
  const [hospCountry, setHospCountry] = useState('中国');
  const [hospLevel, setHospLevel] = useState('3A');
  const [hospType, setHospType] = useState('general');
  const [hospHasMDT, setHospHasMDT] = useState(true);
  const [hospDescription, setHospDescription] = useState('');
  const [hospContact, setHospContact] = useState('');

  // Doctor fields
  const [docName, setDocName] = useState('');
  const [docId, setDocId] = useState('');
  const [docTitle, setDocTitle] = useState('主任医师');
  const [docHospId, setDocHospId] = useState('');
  const [docDept, setDocDept] = useState('');
  const [docSpecialties, setDocSpecialties] = useState('');

  // Service fields
  const [svcName, setSvcName] = useState('');
  const [svcId, setSvcId] = useState('');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcCategory, setSvcCategory] = useState('surgery');
  const [svcHospId, setSvcHospId] = useState('');
  const [svcAvailability, setSvcAvailability] = useState('unknown');

  // Common
  const [submitterName, setSubmitterName] = useState(userName || '');
  const [sourceUrlInput, setSourceUrlInput] = useState('');

  const inputClass = 'w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500/60';
  const labelClass = 'text-xs font-semibold text-zinc-300 mb-1 block';
  const selectClass = 'w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500/60';

  function buildPayload(): Record<string, unknown> {
    switch (activeTab) {
      case 'hospital':
        return {
          id: hospId || `hosp-${Date.now()}`,
          name: hospName,
          city: hospCity,
          province: hospProvince,
          country: hospCountry,
          latitude: 0,
          longitude: 0,
          hospitalLevel: hospLevel,
          hospitalType: hospType,
          hasMDT: hospHasMDT,
          description: hospDescription,
          contact: hospContact,
          sourceUrls: sourceUrlInput ? sourceUrlInput.split('\n').filter(Boolean) : [],
          dataQuality: 'unverified',
          qualityScore: 0,
        };
      case 'doctor':
        return {
          id: docId || `doc-${Date.now()}`,
          name: docName,
          title: docTitle,
          hospitalIds: docHospId ? [docHospId] : [],
          departmentName: docDept,
          specialties: docSpecialties.split(',').map(s => s.trim()).filter(Boolean),
          sourceUrls: sourceUrlInput ? sourceUrlInput.split('\n').filter(Boolean) : [],
          dataQuality: 'unverified',
          qualityScore: 0,
        };
      case 'service':
        return {
          id: svcId || `svc-${Date.now()}`,
          name: svcName,
          description: svcDesc,
          category: svcCategory,
          hospitalId: svcHospId,
          availability: svcAvailability,
          sourceUrls: sourceUrlInput ? sourceUrlInput.split('\n').filter(Boolean) : [],
          dataQuality: 'unverified',
          qualityScore: 0,
        };
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const payload = buildPayload();
    const sourceUrls = sourceUrlInput ? sourceUrlInput.split('\n').map(s => s.trim()).filter(Boolean) : [];

    try {
      const res = await fetch('/api/centers/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: activeTab,
          action: 'create',
          payload,
          submitterId: userId,
          submitterName: submitterName || userName,
          sourceUrls,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: `提交成功！审核通过后将收录到胰腺中心信息库。提交 ID: ${data.data.id}` });
        resetForm();
      } else {
        setResult({ success: false, message: data.message || '提交失败，请重试' });
      }
    } catch {
      setResult({ success: false, message: '网络错误，请检查连接后重试' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setHospName(''); setHospId(''); setHospCity(''); setHospProvince(''); setHospCountry('中国');
    setHospLevel('3A'); setHospType('general'); setHospHasMDT(true); setHospDescription(''); setHospContact('');
    setDocName(''); setDocId(''); setDocTitle('主任医师'); setDocHospId(''); setDocDept(''); setDocSpecialties('');
    setSvcName(''); setSvcId(''); setSvcDesc(''); setSvcCategory('surgery'); setSvcHospId(''); setSvcAvailability('unknown');
    setSourceUrlInput('');
  }

  const isFormValid = () => {
    switch (activeTab) {
      case 'hospital': return hospName.trim().length > 0 && hospCity.trim().length > 0;
      case 'doctor': return docName.trim().length > 0;
      case 'service': return svcName.trim().length > 0 && svcDesc.trim().length > 0;
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur p-6">
      <div className="flex items-center gap-2 mb-6">
        <Send className="h-5 w-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">社区贡献 — 提交胰腺中心信息</h2>
      </div>

      <p className="text-xs text-zinc-400 mb-6">
        您提供的信息将经过管理员审核，审核通过后将收录到公共胰腺中心信息库，帮助更多患者找到合适的医院、医生和服务。
      </p>

      {/* Entity Type Tabs */}
      <div className="flex gap-1 mb-5 bg-zinc-900/60 rounded-lg p-1">
        {ENTITY_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setResult(null); }}
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hospital Fields */}
        {activeTab === 'hospital' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>医院名称 *</label>
                <input className={inputClass} value={hospName} onChange={e => setHospName(e.target.value)} placeholder="例: 北京协和医院" required />
              </div>
              <div>
                <label className={labelClass}>医院 ID</label>
                <input className={inputClass} value={hospId} onChange={e => setHospId(e.target.value)} placeholder="自动生成，也可自定义如 hosp-bj-xxx" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>城市 *</label>
                <input className={inputClass} value={hospCity} onChange={e => setHospCity(e.target.value)} placeholder="例: 北京" required />
              </div>
              <div>
                <label className={labelClass}>省份</label>
                <input className={inputClass} value={hospProvince} onChange={e => setHospProvince(e.target.value)} placeholder="例: 北京" />
              </div>
              <div>
                <label className={labelClass}>国家</label>
                <input className={inputClass} value={hospCountry} onChange={e => setHospCountry(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>医院等级</label>
                <select className={selectClass} value={hospLevel} onChange={e => setHospLevel(e.target.value)}>
                  <option value="3A">三甲 (3A)</option>
                  <option value="3B">三乙 (3B)</option>
                  <option value="2A">二甲 (2A)</option>
                  <option value="international">国际</option>
                  <option value="unknown">未知</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>医院类型</label>
                <select className={selectClass} value={hospType} onChange={e => setHospType(e.target.value)}>
                  <option value="general">综合医院</option>
                  <option value="cancer_center">肿瘤专科</option>
                  <option value="specialized">专科医院</option>
                  <option value="university">大学附属</option>
                </select>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={hospHasMDT} onChange={e => setHospHasMDT(e.target.checked)} className="rounded border-white/20 bg-black/60" />
                提供多学科会诊 (MDT)
              </label>
            </div>
            <div>
              <label className={labelClass}>简介/特色</label>
              <textarea className={inputClass} rows={2} value={hospDescription} onChange={e => setHospDescription(e.target.value)} placeholder="描述医院的胰腺癌诊疗特色..." />
            </div>
            <div>
              <label className={labelClass}>联系方式</label>
              <input className={inputClass} value={hospContact} onChange={e => setHospContact(e.target.value)} placeholder="电话/公众号/官网" />
            </div>
          </div>
        )}

        {/* Doctor Fields */}
        {activeTab === 'doctor' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>医生姓名 *</label>
                <input className={inputClass} value={docName} onChange={e => setDocName(e.target.value)} placeholder="例: 赵玉沛" required />
              </div>
              <div>
                <label className={labelClass}>医生 ID</label>
                <input className={inputClass} value={docId} onChange={e => setDocId(e.target.value)} placeholder="自动生成，也可自定义" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>职称</label>
                <select className={selectClass} value={docTitle} onChange={e => setDocTitle(e.target.value)}>
                  <option value="主任医师">主任医师</option>
                  <option value="副主任医师">副主任医师</option>
                  <option value="主治医师">主治医师</option>
                  <option value="教授/主任医师">教授/主任医师</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>科室</label>
                <input className={inputClass} value={docDept} onChange={e => setDocDept(e.target.value)} placeholder="例: 胰腺外科" />
              </div>
            </div>
            <div>
              <label className={labelClass}>所属医院 ID</label>
              <input className={inputClass} value={docHospId} onChange={e => setDocHospId(e.target.value)} placeholder="例: hosp-bj-xiehe" />
              <p className="text-xs text-zinc-500 mt-1">填写医院 ID，支持关联已有医院</p>
            </div>
            <div>
              <label className={labelClass}>专长</label>
              <input className={inputClass} value={docSpecialties} onChange={e => setDocSpecialties(e.target.value)} placeholder="多选，用逗号分隔。例: 胰腺癌手术, 达芬奇机器人" />
            </div>
          </div>
        )}

        {/* Service Fields */}
        {activeTab === 'service' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>服务名称 *</label>
                <input className={inputClass} value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="例: 达芬奇机器人微创切除术" required />
              </div>
              <div>
                <label className={labelClass}>服务 ID</label>
                <input className={inputClass} value={svcId} onChange={e => setSvcId(e.target.value)} placeholder="自动生成" />
              </div>
            </div>
            <div>
              <label className={labelClass}>服务描述 *</label>
              <textarea className={inputClass} rows={2} value={svcDesc} onChange={e => setSvcDesc(e.target.value)} placeholder="详细描述服务内容..." required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>类别</label>
                <select className={selectClass} value={svcCategory} onChange={e => setSvcCategory(e.target.value)}>
                  <option value="surgery">外科手术</option>
                  <option value="chemotherapy">化疗</option>
                  <option value="radiotherapy">放疗</option>
                  <option value="intervention">介入治疗</option>
                  <option value="nutrition">营养支持</option>
                  <option value="psychology">心理支持</option>
                  <option value="rehabilitation">康复</option>
                  <option value="palliative">姑息治疗</option>
                  <option value="clinical_trial">临床试验</option>
                  <option value="genetic_testing">基因检测</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>可及性</label>
                <select className={selectClass} value={svcAvailability} onChange={e => setSvcAvailability(e.target.value)}>
                  <option value="immediate">即时</option>
                  <option value="within_week">一周内</option>
                  <option value="within_month">一月内</option>
                  <option value="queue_long">排队较长</option>
                  <option value="unknown">未知</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>所属医院 ID</label>
                <input className={inputClass} value={svcHospId} onChange={e => setSvcHospId(e.target.value)} placeholder="例: hosp-bj-xiehe" />
              </div>
            </div>
          </div>
        )}

        {/* Common Fields */}
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>您的称呼</label>
              <input className={inputClass} value={submitterName} onChange={e => setSubmitterName(e.target.value)} placeholder="可选，用于审核联系" />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelClass}>信息来源 URL (每行一个)</label>
            <textarea className={inputClass} rows={3} value={sourceUrlInput} onChange={e => setSourceUrlInput(e.target.value)} placeholder="https://example.com/hospital-info&#10;https://example.com/doctor-profile" />
            <p className="text-xs text-zinc-500 mt-1">请提供信息来源链接，帮助审核员验证信息准确性</p>
          </div>
        </div>

        {/* Result Message */}
        {result && (
          <div className={`rounded-lg p-4 text-sm ${
            result.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}>
            <div className="flex items-start gap-2">
              {result.success ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span>{result.message}</span>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? '提交中...' : '提交信息'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2.5 rounded-lg bg-zinc-900 border border-white/5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            重置表单
          </button>
        </div>
      </form>
    </div>
  );
}
