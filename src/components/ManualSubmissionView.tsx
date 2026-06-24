import React, { useState } from 'react';
import { 
  X, 
  Send, 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Compass, 
  Layers, 
  Database,
  Award,
  BookOpen, 
  Sparkles,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { OSINTItem, OSINTCategory, EvidenceLevel } from '../types';

interface ManualSubmissionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessIngested: (newItem: OSINTItem) => void;
  onUpdateWatchdogState: () => void;
}

const CATEGORY_LABELS: Record<OSINTCategory, string> = {
  drug: '靶点新药 (Drug Target)',
  trial: '临床试验 (Clinical Trials)',
  surgery: '外科手术 (Surgical MDT)',
  oncology: '肿瘤内科 (Oncology)',
  nutrition: '营养支持 (Nutrients)',
  psychology: '心理关怀 (Mind Relief)',
  complication: '并发症管理 (Complications)',
  policy: '政策医保 (Health Policy)',
  patient_resource: '生存陪伴资源 (Patient Resources)'
};

export default function ManualSubmissionView({ 
  isOpen, 
  onClose, 
  onSuccessIngested,
  onUpdateWatchdogState
}: ManualSubmissionProps) {
  // Input fields
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('');
  const [country, setCountry] = useState('Global');
  const [category, setCategory] = useState<OSINTCategory>('drug');
  const [entitiesInput, setEntitiesInput] = useState('');
  const [evidenceLevel, setEvidenceLevel] = useState<EvidenceLevel>('C');
  const [clinicalTrialId, setClinicalTrialId] = useState('');
  const [summary, setSummary] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<{
    accepted: boolean;
    score: number;
    checks: string[];
    message: string;
    item?: OSINTItem;
  } | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setTitle('');
    setUrl('');
    setSource('');
    setCountry('Global');
    setCategory('drug');
    setEntitiesInput('');
    setEvidenceLevel('C');
    setClinicalTrialId('');
    setSummary('');
    setErrorText(null);
    setEvaluationResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (!title.trim() || !url.trim() || !source.trim() || !summary.trim()) {
      setErrorText('请完整填写带有星号 (*) 的核心必填字段。');
      return;
    }

    // Split entities by comma and clean up duplicates/blanks
    const entities = entitiesInput
      .split(/[,，]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/osint/manual-ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim(),
          source: source.trim(),
          country: country.trim() || 'Global',
          category,
          entities,
          summary: summary.trim(),
          evidenceLevel,
          clinicalTrialId: clinicalTrialId.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.message || '网络连接异常，无法提报信源。');
      }

      const resObj = await response.json();
      setEvaluationResult({
        accepted: resObj.accepted,
        score: resObj.score,
        checks: resObj.checks || [],
        message: resObj.message,
        item: resObj.item
      });

      if (resObj.accepted && resObj.item) {
        // Automatically inject client side update
        onSuccessIngested(resObj.item);
        onUpdateWatchdogState();
      }

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || '网络连接错误，请检查服务器就绪状态。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex justify-center items-center p-4">
      
      {/* Container Box */}
      <div className="w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] glass animate-fade-in">
        
        {/* Subtle top decoration light lines */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500"></div>

        {/* Header section with X button */}
        <div className="flex justify-between items-center border-b border-white/5 p-5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded border border-blue-500/20">
              <Sparkles className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-semibold text-white">投递开源医学信源 & 自动循证质检</h3>
              <p className="text-[10px] text-zinc-400">本系统将结合临床级词频、URL权威度与循证权重指标进行自动化评分 (SCORE ≥ 60 采纳入库)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Outer scrolling area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {errorText && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg flex items-start gap-2 animate-fade-in">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}

          {!evaluationResult ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Core warning */}
              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg text-xs leading-normal text-zinc-300">
                <span className="font-semibold text-blue-300">💡 提示</span>：投递的信源应包含如 <b>KRAS, Whipple, PERT, Clinical S-1, 胰腺腺癌</b> 等靶点或者疗法，且优先推荐提供来自 <b>PubMed, NCBI, ClinicalTrials, FDA</b> 等公开权威指南或注册库等规范URL域名以获得更高的质量评估得分。
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex justify-between">
                  <span>学术/研判文献标题 *</span>
                  <span className="text-[10px] text-zinc-500 font-mono">建议使用英文原版学术标题</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="例如: Phase III Trial of Gemcitabine and S-1 combination..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500/60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Source Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">原始信源/学术期刊 *</label>
                  <input 
                    type="text"
                    required
                    placeholder="例如: PubMed, ASCO Abstract, The Lancet"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500/60"
                  />
                </div>

                {/* Country Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-350">研究源发起地/国家</label>
                  <input 
                    type="text"
                    placeholder="例如: USA, China, Global"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500/60"
                  />
                </div>

              </div>

              {/* URL Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">循证文献/源网站网页地址 (URL) *</label>
                <input 
                  type="url"
                  required
                  placeholder="例如: https://pubmed.ncbi.nlm.nih.gov/3029140..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500/60 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Category selectors */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-305">情报归属门类</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as OSINTCategory)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-xs sm:text-sm text-zinc-300 focus:outline-none focus:border-blue-500/60"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Evidence Levels */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-305">声明循证推荐等级</label>
                  <select
                    value={evidenceLevel}
                    onChange={(e) => setEvidenceLevel(e.target.value as EvidenceLevel)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-xs sm:text-sm text-zinc-303 focus:outline-none focus:border-blue-500/60"
                  >
                    <option value="A">A级 (金标准RCT指南)</option>
                    <option value="B">B级 (临床II/III期前瞻试验)</option>
                    <option value="C">C级 (前瞻队列/回顾分析/学界专家)</option>
                    <option value="D">D级 (患者病友网络特异康复数据)</option>
                  </select>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Targets Entities */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-305">临床涉及标靶实体 / 关键词</label>
                  <input 
                    type="text"
                    placeholder="如: KRAS G12D, PERT, Whipple (逗号隔开)"
                    value={entitiesInput}
                    onChange={(e) => setEntitiesInput(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500/60"
                  />
                </div>

                {/* Trial ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-305">临床试验唯一注册号 (如有)</label>
                  <input 
                    type="text"
                    placeholder="如: NCT04620165, jRCT1052..."
                    value={clinicalTrialId}
                    onChange={(e) => setClinicalTrialId(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500/60 font-mono"
                  />
                </div>

              </div>

              {/* Summary translation / medical abstraction */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex justify-between">
                  <span>科学前沿中文翻译及摘要 (3-4句临床解读) *</span>
                  <span className={`${summary.length < 50 ? 'text-zinc-500' : 'text-emerald-500'} text-[10px] font-mono`}>
                    已录入 {summary.length} 字 (推荐≥50字)
                  </span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="此处填写中文严谨译文或多学科提要。需概括突变特征、临床试用疗效及病理减毒方案..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg py-2.5 px-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500/60 leading-relaxed font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-2 px-4 bg-zinc-900 border border-white/5 hover:bg-zinc-850 hover:text-white text-xs font-semibold text-zinc-400 rounded-xl cursor-pointer transition"
                >
                  清空重置
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-xs font-semibold text-white rounded-xl cursor-pointer transition flex items-center gap-1.5 active-glow"
                >
                  <Send className="h-3.5 w-3.5 text-blue-200" />
                  {isSubmitting ? '正在调用质检探针评估...' : '递交 AI 质检研判'}
                </button>
              </div>

            </form>
          ) : (
            /* Quality Evaluation Score Card view */
            <div className="space-y-6 animate-fade-in py-2">
              
              <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5 md:p-6 text-center space-y-4 relative">
                
                {/* Acceptance Icon shield decoration */}
                <div className="mx-auto flex justify-center">
                  {evaluationResult.accepted ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full animate-bounce">
                      <ShieldCheck className="h-10 w-10" />
                    </div>
                  ) : (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full animate-pulse">
                      <ShieldAlert className="h-10 w-10" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block">自动多学科循证评判结果</span>
                  <h4 className={`text-lg sm:text-xl font-serif font-light ${
                    evaluationResult.accepted ? 'text-emerald-400' : 'text-amber-300'
                  }`}>
                    {evaluationResult.accepted ? '信源被采纳：通过 A-D 级别质检标准' : '暂缓采纳：需要补充或对齐信源证据链'}
                  </h4>
                </div>

                {/* SVG Progress Arc or big Score display */}
                <div className="inline-flex flex-col items-center justify-center bg-black/60 border border-white/5 px-6 py-3 rounded-2xl">
                  <span className="text-3xl font-mono font-bold text-blue-400">
                    {evaluationResult.score} <span className="text-xs text-zinc-650">/100分</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-sans mt-1">临床级信源质量安全分值</span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans max-w-lg mx-auto bg-black p-4 rounded-xl border border-white/5">
                  {evaluationResult.message}
                </p>

              </div>

              {/* Detailed checks breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-303 uppercase tracking-wider block font-serif">
                  🔍 系统核对规则与评分轨道轨迹 (Verification Rail Checks)
                </span>
                <div className="grid grid-cols-1 gap-2.5 font-sans">
                  {evaluationResult.checks.map((check, i) => {
                    const isPass = check.includes('通过') || check.includes('PASS');
                    return (
                      <div key={i} className="p-3 bg-black/40 border border-white/5 rounded-lg flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">
                          {check}
                        </span>
                        <span>
                          {isPass ? (
                            <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">PASSED</span>
                          ) : (
                            <span className="text-amber-400 font-mono text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">WARNING / COMPLIANCE</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons on evaluation results screen */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5 shrink-0">
                <button
                  onClick={handleReset}
                  className="py-1.5 px-3.5 bg-zinc-900 border border-white/5 hover:bg-zinc-850 text-xs text-zinc-300 font-medium rounded-lg cursor-pointer transition"
                >
                  继续录入新信源
                </button>
                <button
                  onClick={onClose}
                  className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold rounded-lg cursor-pointer transition active-glow"
                >
                  完成退出 
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
