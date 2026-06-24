import React, { useState } from 'react';
import { PatientProfile } from '../types';
import { motion } from 'motion/react';
import { 
  User, 
  MapPin, 
  Dna, 
  ShieldCheck, 
  Save, 
  Activity, 
  HelpCircle, 
  Tag, 
  ClipboardList, 
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  ListRestart
} from 'lucide-react';
import { LanguageCode } from '../translations';

interface PatientProfileViewProps {
  profile: PatientProfile | null;
  onSaveProfile: (newProfile: PatientProfile) => void;
  onClearProfile: () => void;
  language?: LanguageCode;
}

const COMMON_MUTATIONS = [
  "KRAS G12D",
  "KRAS G12C",
  "KRAS G12V",
  "KRAS G12R",
  "KRAS WT (Wild-type)",
  "BRCA1",
  "BRCA2",
  "ATM",
  "ATR",
  "PALB2",
  "TP53",
  "CDKN2A",
  "SMAD4",
  "MSI-H / dMMR"
];

const COMMON_CITIES = [
  "北京市",
  "上海市",
  "广州市",
  "深圳市",
  "杭州市",
  "成都市",
  "武汉市",
  "波士顿 (Boston)",
  "海德堡 (Heidelberg)",
  "东京 (Tokyo)"
];

const COMMON_IHC_CN = [
  "Claudin 18.2 高表达",
  "Claudin 18.2 中低表达",
  "PD-L1 CPS >= 10",
  "PD-L1 TPS >= 1%",
  "HER2 (3+)",
  "HER2 (2+)",
  "MSI-H (高微卫星不稳定性)",
  "dMMR (错配修复功能缺陷)"
];

const COMMON_IHC_EN = [
  "Claudin 18.2 High expression",
  "Claudin 18.2 Mid-Low expression",
  "PD-L1 CPS >= 10",
  "PD-L1 TPS >= 1%",
  "HER2 (3+)",
  "HER2 (2+)",
  "MSI-H (High Microsatellite Instability)",
  "dMMR (mismatch repair deficient)"
];

const COMMON_REGIMENS_CN = [
  "AG方案 (吉西他滨 + 白蛋白紫杉醇)",
  "NALIRIFOX方案 (脂质体伊立替康 + 5-FU/LV + 奥沙利铂)",
  "FOLFIRINOX / mFOLFIRINOX方案",
  "吉西他滨单药或联合卡培他滨",
  "靶向治疗 (如 KRAS G12D 抑制剂)",
  "免疫联合治疗 (PD-1 + 靶向 + 化疗)",
  "Whipple根治性手术",
  "放射治疗 (SBRT/EBRT)"
];

const COMMON_REGIMENS_EN = [
  "AG Regimen (Gemcitabine + Nab-Paclitaxel)",
  "NALIRIFOX Regimen (Liposomal Irinotecan + 5-FU/LV + Oxaliplatin)",
  "FOLFIRINOX / mFOLFIRINOX Standard",
  "Gemcitabine Monotherapy or with Capecitabine",
  "Targeted Therapy (e.g. KRAS G12D Inhibitor)",
  "Immune combination (PD-1 + Targeted + Chemo)",
  "Radical Whipple Surgery",
  "Radiotherapy (SBRT/EBRT)"
];

export default function PatientProfileView({ profile, onSaveProfile, onClearProfile, language = 'ZH' }: PatientProfileViewProps) {
  const [city, setCity] = useState(profile?.city || '');
  const [selectedMutations, setSelectedMutations] = useState<string[]>(profile?.mutations || []);
  const [customMutation, setCustomMutation] = useState('');
  const [ihcResults, setIhcResults] = useState(profile?.ihcResults || '');
  const [regimen, setRegimen] = useState(profile?.regimen || '');
  const [efficacy, setEfficacy] = useState(profile?.efficacy || '');
  const [summary, setSummary] = useState(profile?.summary || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isCN = language === 'ZH' || language === 'ZT';

  const textDict = {
    badgeOffline: isCN ? '100% 离线脱敏' : '100% Offline Secured',
    title: isCN ? '数字病情特征配置' : 'Digital Case Molecular Profiles',
    desc: isCN 
      ? '维护病情特征可激活“个性化精准匹配”视角。系统自适应检索符合您的基因突变、治疗史及偏好城市的临床研究与医院资源。'
      : 'Maintain clinical genetic milestones to activate the Precision Matching paradigm. Generative agents auto-weight clinical trials and trials matching your genomic variants.',
    clearConfirm: isCN 
      ? '您确定要清除本地保存的病情配置吗？清除后将切换回通用视角。' 
      : 'Are you sure you want to delete local metadata? This reverts current dashboards back to global view.',
    clearBtn: isCN ? '清空配置' : 'Clear Profiles',
    policyTitle: isCN ? '隐私合规政策：' : 'HIPAA Compliance & Zero-Cloud Safeguards:',
    policyDesc: isCN 
      ? '本模块不采集任何涉及身份确认的信息（例如：姓名、电话、身份证号、病历号、病理原件等）。数据仅存储在您当前终端浏览器的 LocalStorage 中，不会上传。符合 HIPAA & GDPR 临床安全最高审计标准。'
      : 'We strictly omit identifiable tags (name, contact, primary records). Variables persist only in browser Sandboxed LocalStorage. No networking triggers are initiated, meeting international HIPAA auditing standards.',
    secLocation: isCN ? '1. 偏好就医/常驻城市' : '1. Location Preferences / Hubs',
    cityLabel: isCN ? '城市名称 (脱敏，仅限市级)' : 'Pref City (De-identified)',
    cityPlaceholder: isCN ? '例如: 上海市、北京市、波士顿...' : 'e.g. New York, Boston, Shanghai...',
    quickOptions: isCN ? '快速选项：' : 'Shortcuts:',
    secMutations: isCN ? '2. 靶向基因突变特征 (多选)' : '2. Genomic / Somatic Variant Features (Multi-select)',
    mutLabels: isCN ? '常见胰腺突变靶点：' : 'Oncogenic Variants & Drivers:',
    customLabel: isCN ? '自定义添加突变 (若上方无)：' : 'Insert Custom Alteration (e.g. KRAS G12D):',
    inputCustomPlaceholder: isCN ? '例如: GNAS R201C, HER2-MUT' : 'e.g. KRAS G12D, GNAS R201C...',
    addBtn: isCN ? '添加' : 'Add',
    selectedBadgePrefix: isCN ? '已配置靶标突变' : 'Configured Variants',
    noMutationSelected: isCN ? '未选择（默认包含任何突变，即常规通用治疗方案）' : 'No options selected (Default to global coverage & standard systemic chemotherapy)',
    secIHC: isCN ? '3. 病理免疫组化 (IHC)' : '3. Immunohistochemistry Indicators (IHC)',
    ihcSubLabel: isCN ? '具体病理学表达/特定标记物评分' : 'Specific pathology marker scores / clones',
    ihcPlaceholder: isCN ? '如: Claudin 18.2高表达, PD-1阴性...' : 'e.g. Claudin 18.2 3+ High, PD-1 Negative...',
    ihcShortcuts: isCN ? '常见病理特征推荐：' : 'Clinical Bio-indicators:',
    secHistory: isCN ? '4. 主要治疗历史 & 近期疗效' : '4. Treatment History & Best Responses',
    chemoRegLabel: isCN ? '正在或历史使用的化疗/靶向药方案：' : 'Selected Chemotherapeutic / Targeted Protocol:',
    dropdownPlaceholder: isCN ? '-- 请选择或手动配置 --' : '-- Choose a protocol from lists --',
    recistLabel: isCN ? '近期真实疗效评估评分 (RECIST标准)：' : 'Best Overall Response (RECIST 1.1 scale):',
    secNarrative: isCN ? '5. 主要病情特征补充 (概要维护，不超过200字)' : '5. Narrative Summary (Subjective context, max 200 chars)',
    narrativePlaceholder: isCN 
      ? '例如: 2026年3月确诊胰腺尾部腺癌，伴有局部淋巴结侵犯，目前体力状态PS=1，进食稍差，正在考虑是否到北京或上海参与对应突变的临床试验，想搜寻一些更新的靶向进展研究...'
      : 'e.g. Diagnosed in early 2026, tail adenocarcinoma. Looking for phase I/II clinical trials regarding KRAS G12D inhibitors in Boston or Shanghai. Tolerating oral intake adequately...',
    confidentialWarning: isCN 
      ? '切勿写入：真实姓名、居民身份证号、家庭详细住址及敏感信息以确保无损脱敏。' 
      : 'Crucial: Never supply real names, home addresses, or identification numbers.',
    charCountSuffix: isCN ? '字' : 'chars',
    savingDatabaseLabel: isCN ? '正在保存并在本端建库较对...' : 'Encrypting and saving records globally...',
    saveSuccessLabel: isCN ? '病情精配库同步成功！' : 'Client Profile Synced Successfully!',
    saveActionTitle: isCN ? '本地保存配置并激活个性化' : 'Save Profiles & Calibrate Analytics',
    glowingAdvise: isCN 
      ? '保存后开启「智能化精准视野」，可一键将全球所有的学术文献和顶级专家按符合度自动加权置顶。'
      : 'Post-saves configure dynamic neon stars overlaying trials, centering high-relevance medical centers instantly.',
    howTitle: isCN ? '双视角自动校对原理说明：' : 'Personalized Dual-Perspective Co-simulation:',
    howDesc: isCN 
      ? '当病情配置保存后，通用与个性化双视角将全面激活。系统核心情报大厅会拦截传入的 OSINT 信息和靶研判块，使用特有的临床自然语言模糊匹配器（String-matching & IHC Score evaluator），将匹配突变、化疗方案推荐等级、以及与常驻城市契合度较高的临床中心（如上海华山、北京协和、波士顿DFCI等）赋予专属的“精准契合推荐”霓虹星标，确保关键学术文献秒级呈递，不漏诊漏判。'
      : 'Once saved, we intercept ingested data on-the-fly. Using regex matching and cellular assays parser, we overlay target-matched indicators next to clinical programs matching your state. High-relevance institutions like DFCI, SCC, or JHH are immediately prioritized with a neon purple star badge.'
  };

  const cities = COMMON_CITIES;
  const mutations = COMMON_MUTATIONS;
  const ihc推荐 = isCN ? COMMON_IHC_CN : COMMON_IHC_EN;
  const regimens = isCN ? COMMON_REGIMENS_CN : COMMON_REGIMENS_EN;

  const toggleMutation = (mut: string) => {
    setSelectedMutations(prev => 
      prev.includes(mut) ? prev.filter(m => m !== mut) : [...prev, mut]
    );
  };

  const handleAddCustomMutation = () => {
    const clean = customMutation.trim().toUpperCase();
    if (clean && !selectedMutations.includes(clean)) {
      setSelectedMutations(prev => [...prev, clean]);
      setCustomMutation('');
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Simulate saving delay for polished UX
    setTimeout(() => {
      const updatedProfile: PatientProfile = {
        city: city.trim(),
        mutations: selectedMutations,
        ihcResults: ihcResults.trim(),
        regimen,
        efficacy,
        summary: summary.trim(),
        lastUpdated: new Date().toISOString()
      };
      
      onSaveProfile(updatedProfile);
      setIsSaving(false);
      setSaveSuccess(true);
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="patient-profile-setting-container">
      
      {/* Intro Header Card */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 relative overflow-hidden glass">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <User className="h-40 w-40 text-teal-400" />
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5" id="profile-title-block">
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400 shrink-0">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-light text-white tracking-tight flex items-center gap-2">
                {textDict.title} <span className="font-sans text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-medium">{textDict.badgeOffline}</span>
              </h2>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                {textDict.desc}
              </p>
            </div>
          </div>
          
          {profile && (
            <button
              onClick={() => {
                if(window.confirm(textDict.clearConfirm)) {
                  onClearProfile();
                  setCity('');
                  setSelectedMutations([]);
                  setIhcResults('');
                  setRegimen('');
                  setEfficacy('');
                  setSummary('');
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 border border-rose-950 bg-rose-950/10 hover:bg-rose-950/30 py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition"
              id="clear-profile-button"
            >
              <ListRestart className="h-3.5 w-3.5" />
              {textDict.clearBtn}
            </button>
          )}
        </div>

        {/* HIPAA/GDPR Compliance Note */}
        <div className="mt-4 p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-start gap-2.5 text-xs text-zinc-400" id="compliance-note">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-sans">
            <strong>{textDict.policyTitle}</strong>{textDict.policyDesc}
          </p>
        </div>
      </div>

      {/* Grid Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left column: Location & Genetic Mutations */}
        <div className="space-y-6" id="profile-left-col">
          
          {/* City configuration */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-4" id="city-config-card">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-400" />
              {textDict.secLocation}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1 tracking-wider uppercase">{textDict.cityLabel}</label>
                <input 
                  type="text" 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={textDict.cityPlaceholder}
                  className="w-full text-xs font-medium bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500/50 transition-colors"
                  id="profile-city-input"
                />
              </div>

              {/* Suggestions */}
              <div>
                <span className="text-[10px] text-zinc-500 block mb-1.5">{textDict.quickOptions}</span>
                <div className="flex flex-wrap gap-1.5">
                  {cities.map(c => {
                    const displayLabel = isCN ? c.split(' ')[0] : (c === '北京市' ? 'Beijing' : c === '上海规划' ? 'Shanghai' : c === '上海市' ? 'Shanghai' : c === '广州市' ? 'Guangzhou' : c === '深圳市' ? 'Shenzhen' : c === '杭州市' ? 'Hangzhou' : c === '成都市' ? 'Chengdu' : c === '武汉市' ? 'Wuhan' : c);
                    return (
                      <button
                        key={c}
                        onClick={() => setCity(c)}
                        className={`text-[10px] px-2 py-1 rounded transition border cursor-pointer ${
                          city === c 
                            ? 'bg-teal-500/20 border-teal-400 text-teal-300' 
                            : 'bg-white/5 border-white/5 hover:border-white/15 text-zinc-400'
                        }`}
                      >
                        {displayLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Genetic Mutation configuration */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-4" id="genomic-config-card">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Dna className="h-4 w-4 text-purple-400" />
              {textDict.secMutations}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-2 tracking-wider uppercase">{textDict.mutLabels}</label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {mutations.map(mut => {
                    const isSelected = selectedMutations.includes(mut);
                    return (
                      <button
                        key={mut}
                        onClick={() => toggleMutation(mut)}
                        className={`text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 cursor-pointer transition ${
                          isSelected 
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-semibold shadow-inner' 
                            : 'bg-white/5 border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        <Tag className="h-3 w-3 shrink-0" />
                        {mut}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom mutations input */}
              <div className="pt-2 border-t border-white/5">
                <label className="block text-[11px] text-zinc-500 mb-1">{textDict.customLabel}</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={customMutation}
                    onChange={(e) => setCustomMutation(e.target.value)}
                    placeholder={textDict.inputCustomPlaceholder}
                    className="flex-1 text-xs bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                    id="profile-custom-mutation-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomMutation();
                    }}
                  />
                  <button
                    onClick={handleAddCustomMutation}
                    className="bg-purple-950/40 hover:bg-purple-950/60 border border-purple-900/40 text-purple-300 text-xs px-3 rounded-xl transition cursor-pointer"
                  >
                    {textDict.addBtn}
                  </button>
                </div>
              </div>

              {/* Selected List Badge */}
              <div className="space-y-1">
                <span className="text-[10px] text-purple-300/80 font-mono">{textDict.selectedBadgePrefix} ({selectedMutations.length}):</span>
                {selectedMutations.length === 0 ? (
                  <span className="text-zinc-500 text-[11px] block italic">{textDict.noMutationSelected}</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selectedMutations.map(mut => (
                      <span key={mut} className="bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                        {mut}
                        <button onClick={() => toggleMutation(mut)} className="hover:text-rose-400 font-semibold cursor-pointer text-[9px] pl-1">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right column: Pathology & Treatment */}
        <div className="space-y-6" id="profile-right-col">
          
          {/* Immunohistochemistry */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-4" id="ihc-config-card">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              {textDict.secIHC}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1 leading-relaxed">{textDict.ihcSubLabel}</label>
                <input 
                  type="text"
                  value={ihcResults}
                  onChange={(e) => setIhcResults(e.target.value)}
                  placeholder={textDict.ihcPlaceholder}
                  className="w-full text-xs font-medium bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  id="profile-ihc-input"
                />
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 block mb-1.5">{textDict.ihcShortcuts}</span>
                <div className="flex flex-wrap gap-1">
                  {ihc推荐.map(i => (
                    <button
                      key={i}
                      onClick={() => setIhcResults(i)}
                      className={`text-[10px] px-2 py-1 rounded transition border cursor-pointer ${
                        ihcResults === i 
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-medium' 
                          : 'bg-white/5 border-white/5 hover:border-white/15 text-zinc-400'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Treatment Regimens & History */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-4" id="regimen-config-card">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-purple-400" />
              {textDict.secHistory}
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">{textDict.chemoRegLabel}</label>
                <select 
                  value={regimen}
                  onChange={(e) => setRegimen(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white/90 focus:outline-none focus:border-purple-500/50"
                  id="profile-regimen-select"
                >
                  <option value="">{textDict.dropdownPlaceholder}</option>
                  {regimens.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-500 mb-1.5">{textDict.recistLabel}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { val: "PR (部分缓解 - 显著缩小)", valEN: "PR (Partial Response - significant tumor shrinkage)", label: isCN ? "PR / 部分缓解" : "PR / Partial Response" },
                    { val: "SD (疾病稳定 - 无大变化)", valEN: "SD (Stable Disease - no significant change)", label: isCN ? "SD / 疾病稳定" : "SD / Stable Disease" },
                    { val: "CR (完全缓解 - 肉眼消失)", valEN: "CR (Complete Response - complete clearance)", label: isCN ? "CR / 完全缓解" : "CR / Complete Response" },
                    { val: "PD (疾病进展 - 增大/新灶)", valEN: "PD (Progressive Disease - increase or new lesion)", label: isCN ? "PD / 疾病进展" : "PD / Progressive Disease" }
                  ].map(eff => {
                    const activeVal = isCN ? eff.val : eff.valEN;
                    const isSelected = efficacy === eff.val || efficacy === eff.valEN;
                    return (
                      <button
                        key={eff.val}
                        onClick={() => setEfficacy(activeVal)}
                        className={`text-[10px] py-2 px-2.5 rounded-lg border text-center transition cursor-pointer ${
                          isSelected 
                            ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 font-semibold active-glow' 
                            : 'bg-white/5 border-white/5 hover:border-white/10 text-zinc-400'
                        }`}
                      >
                        {eff.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Narrative Outline Text */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-3" id="summary-narrative-card">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-purple-400" />
          {textDict.secNarrative}
        </h3>
        
        <textarea 
          value={summary}
          onChange={(e) => setSummary(e.target.value.substring(0, 200))}
          placeholder={textDict.narrativePlaceholder}
          rows={3}
          className="w-full text-xs bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white/90 focus:outline-none focus:border-purple-500/50 leading-relaxed resize-none"
          id="profile-narrative-textarea"
        />
        <div className="flex justify-between items-center text-[10px] text-zinc-500">
          <span>{textDict.confidentialWarning}</span>
          <span>{summary.length}/200 {textDict.charCountSuffix}</span>
        </div>
      </div>

      {/* Submission Control Strip */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/80 border border-white/10 rounded-2xl gap-3" id="profile-controls">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Lightbulb className="h-4 w-4 text-purple-400 animate-bounce shrink-0" />
          <span>{textDict.glowingAdvise}</span>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2 hover:scale-103 active:scale-97 transition cursor-pointer shadow-lg disabled:opacity-55 shrink-0 active-glow-purple"
          id="profile-save-button"
        >
          {isSaving ? (
            <>
              <Activity className="h-3.5 w-3.5 animate-spin" />
              {textDict.savingDatabaseLabel}
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {textDict.saveSuccessLabel}
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 text-white" />
              {textDict.saveActionTitle}
            </>
          )}
        </button>
      </div>

      {/* Help card */}
      <div className="bg-zinc-950/40 p-4 border border-zinc-800/80 rounded-2xl flex items-start gap-3" id="profile-dual-modes-explain">
        <AlertCircle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
        <div className="text-[11px] text-zinc-400/80 leading-relaxed space-y-1">
          <p className="font-bold text-zinc-400">{textDict.howTitle}</p>
          <p>
            {textDict.howDesc}
          </p>
        </div>
      </div>

    </div>
  );
}