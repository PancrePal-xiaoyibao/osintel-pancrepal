import React, { useState, useEffect } from 'react';
import { SystemReport15Day, OSINTCategory } from '../types';
import { 
  FileText, 
  TrendingUp, 
  Compass, 
  BookOpen, 
  BarChart,
  CheckCircle,
  Lightbulb,
  Download,
  Share2,
  Bookmark,
  History,
  Trash2,
  Copy,
  Mail,
  Zap,
  Info,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface ReportsViewProps {
  report: SystemReport15Day;
}

interface SavedDoc {
  id: string;
  title: string;
  type: 'audit' | 'prd';
  savedAt: string;
  score: number;
  successRate: number;
}

const CATEGORY_NAMES: Record<OSINTCategory, string> = {
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

export default function ReportsView({ report }: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'prd'>('audit');
  const [savedDocs, setSavedDocs] = useState<SavedDoc[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null);
  const [showAutoSavedToast, setShowAutoSavedToast] = useState(false);

  // Load and auto-save on component mount
  useEffect(() => {
    const localKey = 'pancreas_saved_reports_history';
    const existing = localStorage.getItem(localKey);
    let docs: SavedDoc[] = [];
    if (existing) {
      try {
        docs = JSON.parse(existing);
      } catch (e) {
        docs = [];
      }
    }

    // Prepare current documents for auto-save
    const defaultAuditDoc: SavedDoc = {
      id: `audit-${report.generatedAt}`,
      title: report.title,
      type: 'audit',
      savedAt: new Date(report.generatedAt).toISOString(),
      score: report.dataQualityScore,
      successRate: report.crawlerSuccessRate
    };

    const defaultPrdDoc: SavedDoc = {
      id: `prd-v1`,
      title: '胰腺癌开源情报中心需求书与自治生命体特征图 (PRD)',
      type: 'prd',
      savedAt: new Date().toISOString(),
      score: 100,
      successRate: 100
    };

    let updated = [...docs];
    let newlySaved = false;

    // Check and save audit report
    if (!docs.some(d => d.id === defaultAuditDoc.id)) {
      updated.unshift(defaultAuditDoc);
      newlySaved = true;
    }

    // Check and save prd report
    if (!docs.some(d => d.id === defaultPrdDoc.id)) {
      updated.push(defaultPrdDoc);
      newlySaved = true;
    }

    if (newlySaved) {
      localStorage.setItem(localKey, JSON.stringify(updated));
      setShowAutoSavedToast(true);
      setTimeout(() => setShowAutoSavedToast(false), 4000);
    }
    setSavedDocs(updated);
  }, [report]);

  // Handle document deletion
  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedDocs.filter(d => d.id !== id);
    localStorage.setItem('pancreas_saved_reports_history', JSON.stringify(updated));
    setSavedDocs(updated);
  };

  // Handle active document manual download
  const handleDownloadReport = () => {
    let content = '';
    let fileName = '';

    if (activeTab === 'audit') {
      content = `=====================================================
胰腺开源情报中心 15天独立运行审计评估报告
=====================================================
报告名称: ${report.title}
生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}
综合评分: ${report.dataQualityScore} / 100
爬行源更新稳健度: ${report.crawlerSuccessRate}%

一、 报告概述
${report.executiveSummary}

二、 关键活跃数据源 (Top Active Sources)
${report.topActiveSources.map((s, i) => `${i + 1}. [${s.name}]: 统计入库 ${s.count} 条`).join('\n')}

三、 各情报门类分布 (Density Map)
${report.categoryDistribution.map((d) => `* [${CATEGORY_NAMES[d.category] || d.category}]: ${d.count} 条`).join('\n')}

四、 AI 审计代理自修正升级提案 (Decentralized Action Items)
${report.recommendations.map((rec, i) => `提案 #${i + 1}: ${rec} [沙箱预编译中]`).join('\n')}

=====================================================
声明：医疗情报严肃性重于一切。系统强力过滤缺乏循证的数据。严禁替代实体诊断。
`;
      fileName = `Pancreas_15Day_Audit_Report_${new Date(report.generatedAt).toLocaleDateString()}.txt`;
    } else {
      content = `=====================================================
胰腺开源情报中心需求书与自治生命体特征图 (PRD)
=====================================================
规格说明：1至15天持续系统自升级需求书

一、 独立生命体之定义与设计指标
本项目根本原则在于：不依赖任何常驻维护者实现业务长期自转。系统通过内部AI守护进程在底层实现对采集源头 HTML CSS、数据流向、API额度消耗的自我评估。如果发生结构变更，通过大语言模型提取关键字段对齐XPath并自动生成Patch保持高可用性。

二、 核心情报采集门类设计明细
1. 靶点新药 (Category: drug)
针对 KRAS WT/G12D、ATM基因吸收与合成致死（如 Berzosertib 等ATM/ATR靶点选药）、GNAS突变的临床疗效和药监局(FDA)批准情报追踪。

2. 外科综合 (Category: surgery)
追踪交界可切除胰腺癌术前新辅助化疗、精密 Whipple 手术血管重建方法、达芬奇机器人切除术等临床一线术式成果。

3. EPI吸收不全与营养 (Category: nutrition)
针对高达80%患者常见的癌性消瘦，追踪 PERT胰酶替代疗法（剂量推荐、随餐服药规范），降低吸收恶病质几率。

4. 疼痛心理 (Category: complication)
吉西他滨等化疗后的末梢神经疼痛针灸辅助手段、NCCN 痛苦筛查标准 MBSR 居家缓解技术。

三、 循证分级决策原理 (Evidence-based Hierarchy)
* A级 (Gold Quality)：大型多中心随机对照双盲临床试验结果、ESMO/NCCN 等知名指南更新。
* B级 (High Quality)：前瞻性单臂II期/III期临床试验、知名胰腺中心规范化推荐。
* C级 (Medium Quality)：回顾性研究、大型注册中心多样本库整理。
* D级 (Low Quality)：大型患者联盟生存技巧包、临床专家发表个案报告。

=====================================================
声明：本系统由 AI 自治体系全自动升级维护。严禁替代实体诊断。
`;
      fileName = `Pancreas_OSINT_Specification_PRD.txt`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy text helper
  const handleCopyToClipboard = (text: string, channel: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedChannel(channel);
      setTimeout(() => setCopiedChannel(null), 2500);
    });
  };

  // Generate sharing details
  const shareTitle = activeTab === 'audit' ? report.title : '胰腺癌开源情报中心需求书与自升级规格书 (PRD)';
  const shareSummary = activeTab === 'audit' ? report.executiveSummary.slice(0, 80) + '...' : '打造无需常驻网络维护者、24x7自动化追踪并解密突变及靶新药的数据自治生命体规范。';
  const shareLink = window.location.href;

  const sharePreviewWeChatText = `【胰腺癌开源情报研判报告已归档】\n📄 报告：${shareTitle}\n🎯 综合研判评分：${activeTab === 'audit' ? report.dataQualityScore : 100}/100\n💡 概要：${shareSummary}\n🔗 安全接入链接配合离线画像载入：${shareLink}`;
  const sharePreviewFeishuText = `{\n  "title": "📊 胰腺癌开源情报中心 - 文档归档分享",\n  "content": "${shareTitle}",\n  "score": "${activeTab === 'audit' ? report.dataQualityScore : 100}",\n  "summary": "${shareSummary}",\n  "url": "${shareLink}"\n}`;

  return (
    <div className="space-y-6 font-sans select-none" id="reports-view-panel">
      
      {/* Auto-Saved Notification Toast */}
      {showAutoSavedToast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-[#0a0a0d] border border-blue-500/30 rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up max-w-sm glass">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-ping"></div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1">
              <Bookmark className="h-3 w-3 text-blue-400" />
              已自动保存至文档库 List
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">报告摘要及版本号已自动完成归档存档 (Local Archive)。</p>
          </div>
        </div>
      )}

      {/* Primary Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/40 border border-white/5 rounded-2xl p-4 glass">
        {/* Tab Selection Row */}
        <div className="flex border-b border-white/5 sm:border-none p-1 bg-black/40 rounded-xl">
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2 px-4 text-xs font-semibold transition flex items-center gap-2 rounded-lg cursor-pointer ${
              activeTab === 'audit' 
                ? 'bg-blue-600/15 border border-blue-500/30 text-blue-300 font-bold active-glow' 
                : 'border border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            15天独立运行审计评估报告
          </button>
          <button
            onClick={() => setActiveTab('prd')}
            className={`py-2 px-4 text-xs font-semibold transition flex items-center gap-2 rounded-lg cursor-pointer ${
              activeTab === 'prd' 
                ? 'bg-blue-600/15 border border-blue-500/30 text-blue-300 font-bold active-glow' 
                : 'border border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            PRD 需求与系统自升级规格书
          </button>
        </div>

        {/* Action Buttons: Removed as requested */}
      </div>

      {/* Main Structural Grid - 2 Column Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Column: Core content (Takes 3 columns) */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'audit' ? (
            <div className="space-y-6 animate-fade-in">
              
              {/* Executive Section */}
              <div className="bg-zinc-950/45 border border-white/10 rounded-xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 glass">
                
                <div className="md:col-span-2 space-y-3">
                  <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold font-mono">
                    自治系统运行评估
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-light text-white leading-tight">
                    {report.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pr-4 font-sans">
                    {report.executiveSummary}
                  </p>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    评估报告生成时间：{new Date(report.generatedAt).toLocaleString('zh-CN')}
                  </div>
                </div>

                {/* Dials stats */}
                <div className="bg-black p-5 rounded-xl border border-white/5 flex flex-col justify-center items-center space-y-3 text-center animate-fade-in">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">综合自治合规评分</span>
                  <div className="relative flex items-center justify-center">
                    {/* SVG Radial Progress */}
                    <svg className="h-24 w-24">
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="40" 
                        stroke="rgba(255,255,255,0.05)" 
                        strokeWidth="6" 
                        fill="transparent" 
                      />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="40" 
                        stroke="#1e40af" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * report.dataQualityScore) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-xl font-bold font-mono text-blue-400">
                      {report.dataQualityScore}<span className="text-xs text-zinc-500">/100</span>
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 font-semibold block leading-none font-mono">Scrapper Success: {report.crawlerSuccessRate}%</span>
                  <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">系统稳健自转中</span>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Source statistics */}
                <div className="bg-zinc-950/50 border border-white/10 rounded-xl p-5 space-y-4 glass">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2 font-serif">
                    <BarChart className="h-4.5 w-4.5 text-blue-400" />
                    各数据源累计入库热度 (Top Active Sources)
                  </h4>
                  <div className="space-y-3 pt-1">
                    {report.topActiveSources.map((source, i) => {
                      const maxCount = Math.max(...report.topActiveSources.map(s => s.count));
                      const percent = (source.count / maxCount) * 100;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-zinc-200">{source.name}</span>
                            <span className="font-mono text-zinc-400">{source.count} 条</span>
                          </div>
                          <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/5">
                            <div 
                              style={{ width: `${percent}%` }}
                              className="h-full bg-blue-500 rounded-full transition"
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Category distributions */}
                <div className="bg-zinc-950/50 border border-white/10 rounded-xl p-5 space-y-4 glass">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2 font-serif">
                    <Compass className="h-4.5 w-4.5 text-indigo-400" />
                    情报分类覆盖比率 (Category Density Map)
                  </h4>
                  <div className="space-y-3 pt-1">
                    {report.categoryDistribution.map((dist, i) => {
                      const label = CATEGORY_NAMES[dist.category] || dist.category;
                      const maxCount = Math.max(...report.categoryDistribution.map(d => d.count));
                      const pct = (dist.count / maxCount) * 100;

                      return (
                        <div key={i} className="space-y-1 flex flex-col">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-zinc-300">{label}</span>
                            <span className="font-mono text-zinc-400">{dist.count} 条</span>
                          </div>
                          <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5">
                            <div 
                              style={{ width: `${pct}%` }}
                              className="h-full bg-indigo-500 rounded-full transition"
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Autonomic Report Recommendations */}
              <div className="bg-zinc-950/50 border border-white/10 rounded-xl p-5 space-y-4 glass">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2 font-serif">
                  <Lightbulb className="h-4.5 w-4.5 text-blue-400 animate-pulse" />
                  AI 审计代理自修正升级提案 (Decentralized Action Items)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                  {report.recommendations.map((rec, i) => (
                    <div key={i} className="p-4 bg-black border border-white/5 rounded-lg space-y-2">
                      <span className="text-xs font-bold text-blue-400 font-mono block">提案标定 #{i + 1}</span>
                      <p className="text-xs text-zinc-300 leading-normal font-sans">
                        {rec}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                        <CheckCircle className="h-3 w-3" />
                         已进入沙箱预编译调度
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-zinc-950/45 border border-white/10 rounded-xl p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto leading-relaxed animate-fade-in glass">
              
              <div className="space-y-2 border-b border-white/10 pb-5">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider font-mono">PANCREAS OSINT PRD INTERACTIVE GUIDE</span>
                <h3 className="text-xl sm:text-2xl font-serif font-light text-white flex items-center gap-2">
                  <FileText className="h-5.5 w-5.5 text-blue-400" />
                  胰腺癌开源情报中心需求书与自治生命体特征图
                </h3>
                <p className="text-zinc-400 text-xs font-sans">本文档为第1至第15天功能规格书。自修及容灾规则在生产容器内自动激活。</p>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <h4 className="text-base font-serif font-semibold text-white border-l-2 border-blue-500 pl-2">一、 独立生命体之定义与设计指标</h4>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  本项目的最根本原则在于：<b>不依赖任何常驻维护者实现业务长期自转</b>。
                  系统通过内部 AI 守护进程（Watchdog）在底层实现对采集源头 HTML CSS、数据流向、API额度消耗的自我评估。如果某数据源发生结构变更，系统应该能通过大语言模型提取关键字段对齐 XPath 并自动生成 Patch 保持高可用性。
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-2.5">
                <h4 className="text-base font-serif font-semibold text-white border-l-2 border-blue-500 pl-2">二、 核心情报采集门类设计明细</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
                  <div className="p-3 bg-black rounded-lg border border-white/5">
                    <span className="text-blue-400 font-bold block mb-1">1. 靶向药物 (Category: drug)</span>
                    针对 KRAS WT/G12D、ATM基因吸收与合成致死（如 Berzosertib 等ATM/ATR靶点选药）、GNAS突变的临床疗效和药监局(FDA)批准情报追踪。
                  </div>
                  <div className="p-3 bg-black rounded-lg border border-white/5">
                    <span className="text-purple-400 font-semibold block mb-1">2. 外科综合 (Category: surgery)</span>
                    追踪交界可切除胰腺癌术前新辅助化疗、精密 Whipple 手术血管重建方法、达芬奇机器人切除术等临床一线术式成果。
                  </div>
                  <div className="p-3 bg-black rounded-lg border border-white/5">
                    <span className="text-amber-400 font-semibold block mb-1">3. EPI吸收不全与营养 (Category: nutrition)</span>
                    针对高达80%患者常见的癌性消瘦，追踪 PERT胰酶替代疗法（剂量推荐、随餐服药规范），降低吸收恶病质几率。
                  </div>
                  <div className="p-3 bg-black rounded-lg border border-white/5">
                    <span className="text-rose-400 font-semibold block mb-1">4. 疼痛心理 (Category: complication)</span>
                    吉西他滨等化疗后的末梢神经疼痛针灸辅助手段、NCCN 痛苦筛查标准 MBSR 居家缓解技术。
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <h4 className="text-base font-serif font-semibold text-white border-l-2 border-blue-500 pl-2">三、 循证分级决策原理 (Evidence-based Hierarchy)</h4>
                <p className="text-xs text-zinc-300 font-sans">
                  医疗情报严肃性重于一切。系统强力过滤缺乏循证的数据：
                </p>
                <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1 pl-2 font-sans">
                  <li><strong className="text-red-400 font-bold">A 级 (Gold Quality)</strong>：大型多中心随机对照双盲临床试验结果、ESMO/NCCN 等知名指南更新。</li>
                  <li><strong className="text-orange-400 font-semibold">B 级 (High Quality)</strong>：前瞻性单臂II期/III期临床试验、知名胰腺中心（如海德堡大学普外科）规范化推荐。</li>
                  <li><strong className="text-blue-405">C 级 (Medium Quality)</strong>：回顾性研究、大型注册中心多样本库整理、各大医学预印本学者归纳。</li>
                  <li><strong className="text-zinc-500 font-mono">D 级 (Low Quality)</strong>：大型患者联盟（如PanCan）生存技巧包、临床专家发表个案报告。</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div className="space-y-2">
                <h4 className="text-base font-serif font-semibold text-white border-l-2 border-blue-500 pl-2">四、 医疗红线声示原则</h4>
                <p className="text-xs text-rose-300 bg-rose-950/15 p-4 border border-rose-900/40 rounded-xl leading-relaxed font-sans glass">
                  <b>严禁替代诊断</b>：本情报中心之唯一宗旨是追踪全球最新的公开医学文献，以减轻胰腺导管癌由于高难度性、罕见突变造成的诊疗信息不对称。<b>任何患者均被禁止擅自根据本系统AI摘要进行药物加合、剂量裁剪。</b>必须定期至肿瘤中心实体首诊，由专家多学科MDT根据基因检测面板作最终处方判定。
                </p>
              </div>

            </div>
          )}
        </div>

        {/* Right Column: Persistent Saved Document History Drawer (Auto Saved List) ---- takes 1 column */}
        <div className="bg-zinc-950/40 border border-white/10 rounded-2xl p-4.5 space-y-4 glass">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2 tracking-wide uppercase font-sans">
              <History className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
              已自动备份文档库 ({savedDocs.length})
            </h4>
            <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20 rounded font-semibold uppercase">
              Auto Saved
            </span>
          </div>

          {savedDocs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[11px] text-zinc-500">
                暂无归档。打开本面板会自动缓存评估与自升级记录至此。
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {savedDocs.map((doc, idx) => (
                <div 
                  key={doc.id}
                  onClick={() => {
                    setActiveTab(doc.type);
                  }}
                  className={`p-3 bg-black/60 hover:bg-black/80 border rounded-xl cursor-pointer transition flex flex-col justify-between text-left group ${
                    activeTab === doc.type 
                      ? 'border-blue-500/50 bg-blue-950/10' 
                      : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex gap-1.5 items-start">
                      <FileText className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${doc.type === 'audit' ? 'text-blue-400' : 'text-purple-400'}`} />
                      <div className="text-[11px] font-medium text-zinc-200 line-clamp-2 leading-tight">
                        {doc.title}
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                      className="p-1 text-zinc-600 hover:text-rose-400 rounded transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="从本地库删除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono mt-2.5 pt-2.5 border-t border-white/5">
                    <span>{new Date(doc.savedAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      {doc.type === 'audit' ? (
                        <span className="text-blue-400 font-bold">Score {doc.score}</span>
                      ) : (
                        <span className="text-purple-400 font-semibold font-mono">SPEC PRD</span>
                      )}
                      <ChevronRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-blue-950/10 border border-blue-500/10 p-3 rounded-lg text-[10px] text-zinc-400 leading-normal font-sans">
            <Info className="h-3.5 w-3.5 text-blue-400 inline-block mr-1.5 -mt-0.5" />
            任何对系统状态的审计及自重构都会触发此处的<b>冷自动备份记录</b>，支持本地永久离线保存和一键秒级调阅。
          </div>
        </div>

      </div>

      {/* Share Dialog Overlay (Designed mimicking a gorgeous interactive element widget) */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0b0b0e] border border-zinc-800 rounded-3xl p-6.5 shadow-2xl relative overflow-hidden flex flex-col font-sans text-left">
            
            {/* Ambient visual backing */}
            <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-blue-500/[0.04] rounded-full blur-[80px] pointer-events-none"></div>
            
            {/* Close */}
            <button 
              onClick={() => setIsShareModalOpen(false)}
              className="absolute right-5 top-5 p-1 px-1.5 bg-zinc-900 hover:bg-zinc-850 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer text-xs font-mono"
            >
              Close
            </button>

            {/* Title */}
            <div className="space-y-1 mb-5">
              <span className="text-[9px] uppercase tracking-widest text-blue-400 font-bold font-mono">SOCIAL SHARE COMPONENT</span>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="h-4 w-4 text-blue-400 animate-pulse" />
                情报文档及运行报告快速分享通道
              </h3>
              <p className="text-[10px] text-zinc-400">
                本组件支持自动生成贴文卡片与剪贴板极速打包。请选择主流社交网络分发：
              </p>
            </div>

            {/* Section 1: Chinese Social Network Matrix */}
            <div className="space-y-3 mb-5">
              <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                🇨🇳 中国主流办公与学术协同网络
              </div>

              {/* WeChat Share channel */}
              <div className="p-3.5 bg-black/50 border border-emerald-500/10 rounded-2xl space-y-3.5 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-semibold text-xs shrink-0 border border-emerald-500/20">
                      We
                    </div>
                    <div>
                      <h4 className="text-[11.5px] font-bold text-zinc-100 flex items-center gap-1.5">
                        微信及朋友圈 (WeChat & Momments)
                      </h4>
                      <p className="text-[10px] text-zinc-400 leading-normal">
                        生成契合中国社交习惯的「报告分享口令描述」及配合二维码。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0e1712]/50 border border-emerald-500/5 p-3 rounded-xl text-[10px] text-emerald-300 font-mono whitespace-pre-wrap leading-relaxed select-all">
                  {sharePreviewWeChatText}
                </div>

                <div className="flex items-center gap-2.5 justify-between">
                  {/* Small graphic qr helper */}
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-white flex items-center justify-center p-0.5 shadow-sm">
                      {/* Fake mini QR Code */}
                      <div className="h-full w-full bg-indigo-950 border border-[#0d0d11] rounded flex flex-wrap p-0.5 shrink-0">
                        <div className="w-1.5 h-1.5 bg-zinc-900 m-0.5 rounded-xs"></div>
                        <div className="w-1.5 h-1.5 bg-zinc-900 m-0.5 rounded-xs"></div>
                        <div className="w-1.5 h-1.5 bg-zinc-900 m-0.5 rounded-xs"></div>
                        <div className="w-1.5 h-1.5 bg-zinc-900 m-0.5 rounded-xs"></div>
                      </div>
                    </div>
                    <span className="text-[9px] text-zinc-500 leading-none">扫描本二维码秒级接入个性化画像</span>
                  </div>

                  <button
                    onClick={() => handleCopyToClipboard(sharePreviewWeChatText, 'wechat')}
                    className="py-1 px-3 bg-emerald-700 hover:bg-emerald-650 text-white text-[10px] font-bold rounded-lg transition active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    {copiedChannel === 'wechat' ? '✓ 已复制朋友圈文案' : '一键复制口令文案'}
                  </button>
                </div>
              </div>

              {/* Feishu Share Card */}
              <div className="p-3.5 bg-black/50 border border-blue-500/15 rounded-2xl space-y-3 relative overflow-hidden">
                <div className="flex gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-semibold text-xs shrink-0 border border-blue-500/20">
                    FS
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[11.5px] font-bold text-zinc-100">飞书 / 钉钉机器人富文本卡片 (Lark / Feishu Widget)</h4>
                    <p className="text-[10px] text-zinc-400 mt-1">适用于在学术协作群中以 Markdown JSON 交互卡片发送审计成果。</p>
                  </div>
                </div>

                <div className="bg-[#111622]/40 border border-blue-500/5 p-2.5 rounded-xl text-[10px] text-zinc-400 font-mono whitespace-pre overflow-x-auto max-h-[80px]">
                  {sharePreviewFeishuText}
                </div>

                <div className="text-right">
                  <button
                    onClick={() => handleCopyToClipboard(sharePreviewFeishuText, 'feishu')}
                    className="py-1 px-3 bg-blue-800 hover:bg-blue-750 text-white text-[10px] font-bold rounded-lg transition active:scale-95 inline-flex items-center gap-1"
                  >
                    {copiedChannel === 'feishu' ? '✓ 已复制 Markdown 消息卡片' : '复制 Feishu 卡片 JSON'}
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: Global Tech Platforms */}
            <div className="space-y-3.5">
              <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                🌐 全球前沿主流医学社交分发 (Overseas Channels)
              </div>

              <div className="flex gap-2">
                {/* Twitter / X */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(sharePreviewWeChatText)}`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-white/5 hover:border-white/10 text-zinc-300 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                >
                  <span className="font-bold">𝕏</span> Twitter (X)
                </a>

                {/* LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-white/5 hover:border-white/10 text-zinc-300 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                >
                  LinkedIn
                </a>

                {/* Email Direct */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(sharePreviewWeChatText)}`}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl cursor-pointer transition active:scale-95"
                  title="通过电子邮件直接转发给医学专家"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
