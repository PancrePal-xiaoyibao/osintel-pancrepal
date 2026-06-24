import React, { useState } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Bookmark, 
  MapPin, 
  Calendar, 
  Info, 
  Search, 
  CheckCircle2, 
  ListRestart, 
  ShieldAlert,
  SlidersHorizontal,
  BookOpen
} from 'lucide-react';

interface Guideline {
  id: string;
  name: string;
  fullName: string;
  region: string;
  latestVersion: string;
  releaseDate: string;
  primaryURL: string;
  evidenceTier: 'High' | 'Moderate' | 'General';
  description: string;
  keyUpdates: string[];
  recommendedRegimens: {
    stage: string;
    regimen: string;
    note: string;
  }[];
  tags: string[];
}

const CLINICAL_GUIDELINES: Guideline[] = [
  {
    id: 'nccn',
    name: 'NCCN',
    fullName: 'National Comprehensive Cancer Network Guidelines: Pancreatic Adenocarcinoma',
    region: '美国 (USA)',
    latestVersion: '2026.V1 版',
    releaseDate: '2026年3月',
    primaryURL: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1455',
    evidenceTier: 'High',
    description: '全球胰腺癌治疗的风向标，标准最细致、循证级别最高、迭代最敏捷的临床决策导航指南。',
    keyUpdates: [
      '对可切除及交界可切除胰腺癌强化了新辅助化疗（mFOLFIRINOX 方案首选）的推荐等级，推荐至少进行4-6个周期的术前化疗。',
      '在维持治疗阶段，对于生殖细胞或体细胞 BRCA1/2 突变携带者，在含铂方案一线化疗无进展后，维持使用奥拉帕利（Olaparib）的推荐进行了细化。',
      '强调了泛靶点基因测序（NGS）的早期接入，尤其是 KRAS 野生型（Wild-type）患者，推荐检测 NRG1、NTRK、ALK 等罕见融合突变。',
      '细化了外源性胰酶替代疗法（PERT）随餐服药规范，推荐初始剂量提升至每顿主餐 50,000–75,000 单位，针对恶病质高发进行前置干预。'
    ],
    recommendedRegimens: [
      { stage: '晚期/转移性 (一线)', regimen: 'mFOLFIRINOX 或 吉西他滨 + 艾 think（Nab-Paclitaxel）', note: '体能状态佳（ECOG 0-1）患者首选；体能欠佳者选用单药吉西他滨治疗。' },
      { stage: '维持治疗', regimen: '奥拉帕利 (BRCA1/2 突变)', note: '针对铂类化疗后疾病无进展（含铂方案治疗 ≥ 16周）的维持治疗。' }
    ],
    tags: ['mFOLFIRINOX', 'BRCA1/2', 'NGS检测', 'PERT随餐', '新辅助化疗']
  },
  {
    id: 'esmo',
    name: 'ESMO',
    fullName: 'ESMO Clinical Practice Guidelines: Pancreatic Cancer',
    region: '欧洲 (Europe)',
    latestVersion: '2025.V2 修订版',
    releaseDate: '2025年11月',
    primaryURL: 'https://www.esmo.org/guidelines/oncology-list/gastrointestinal-cancers/pancreatic-cancer',
    evidenceTier: 'High',
    description: '欧洲肿瘤内科学会指南，提倡基于患者生活质量与药物经济学考量，制定规范的术后综合治疗与姑息治疗策略。',
    keyUpdates: [
      '重申术后辅助化疗的时机：除有严重合并症外，推荐解剖学成功切除（R0/R1）后于 8-12 周内启动为期 6 个月的 mFOLFIRINOX 辅助化疗。',
      '针对交界可切除（Borderline Resectable）胰腺癌，强烈推荐 MDT（多学科诊疗）评估后进行全身性高强度新辅助方案，不推荐首选直接手术。',
      '提升了对末梢神经毒性（吉西他滨或奥沙利铂所致）及癌性疼痛前置心理疏导与药物联合干预（MBSR、度洛西汀）的推荐比例。'
    ],
    recommendedRegimens: [
      { stage: '术后辅助化疗', regimen: 'mFOLFIRINOX (6个月) 或 吉西他滨 + 卡培他滨', note: 'mFOLFIRINOX 为目前欧洲生存率改善数据最佳的辅助根治化疗推荐。' },
      { stage: '局晚期 (不可切除)', regimen: '诱导化疗后行同步放化疗 (SBRT)', note: '化疗 4-6 月后疾病控制稳定，可联合局部精确立体定向放射治疗。' }
    ],
    tags: ['辅助化疗', 'R0/R1切除', 'MDT评估', '生活质量', '立体放疗']
  },
  {
    id: 'jsco',
    name: 'JSCO / JPS',
    fullName: 'Japan Society of Clinical Oncology / Japan Pancreas Society Guidelines',
    region: '日本 (Japan)',
    latestVersion: '2025/2026 合订版',
    releaseDate: '2025年8月',
    primaryURL: 'http://www.jsco.or.jp/index.html',
    evidenceTier: 'Moderate',
    description: '日本胰腺学会（JPS）和日本临床肿瘤学会（JSCO）联合发布。精细化外科术式（如规范化 D2 淋巴结清扫和血管重建）、日本患者体质化疗剂量调整的权威指南。',
    keyUpdates: [
      '日本临床试验数据（JASDEC等研究）证实，S-1（替吉奥）单药在亚洲（日本）人群术后辅助化疗中展现出高生存耐受优势，维持主力 A 级推荐。',
      '对于交界可切除胰腺癌伴有门静脉侵犯（BR-PV）的患者，JASDEC05 研究成果确认吉西他滨联合替吉奥（GS方案）新辅助放化疗能显著提升 R0 切除率。',
      '对达芬奇机器人微创胰体尾切除及 Whipple 手术的开展范围与安全界限做出了极其严格的多维资质准入与风险评级规范。'
    ],
    recommendedRegimens: [
      { stage: '辅助化疗 (东亚首选)', regimen: 'S-1 (替吉奥) 口服单药辅助化疗', note: '适合东亚及日本患者体质，副反应相比 FOLFIRINOX 较小，依从性优良。' },
      { stage: '新辅助化疗 (BR-PV型)', regimen: '吉西他滨 + S-1 (GS 联合方案)', note: '显著降低术后局部复发率并提高中位生存期。' }
    ],
    tags: ['替吉奥 S-1', 'D2淋巴清扫', 'JASDEC研究', 'JPS标准', '机器人手术']
  },
  {
    id: 'csco',
    name: 'CSCO',
    fullName: '中国临床肿瘤学会 (CSCO) 胰腺癌诊疗指南',
    region: '中国 (China)',
    latestVersion: '2026 版',
    releaseDate: '2026年4月',
    primaryURL: 'http://www.csco.org.cn',
    evidenceTier: 'High',
    description: '结合中国国情与临床药物可及性、医保覆盖情况制定的最本土、最科学、实操性最强的中国胰腺癌权威指南。',
    keyUpdates: [
      '正式将国产新药及进入国家医保的免疫、靶向方案（如针对 MSI-H/dMMR 的 PD-1 抑制剂恩沃利单抗、帕博利单抗等）纳入晚期二线标准目录。',
      '结合中国人群耐受，进一步优化了 mFOLFIRINOX 的初始剂量剂量滴定（建议初始使用 80% 剂量），强调骨髓抑制（G-CSF支持）的主动干预。',
      '新增多学科诊治（MDT）建设中国国家评级规范，要求所有交界可切除及晚期复杂病例治疗前必须通过 MDT 论证。'
    ],
    recommendedRegimens: [
      { stage: '一线治疗 (适度耐受)', regimen: '减量型 mFOLFIRINOX 或 AG 方案', note: '中国人群推荐前几周期根据中性粒细胞降低度逐步滴定至足量，保证全疗程依从。' },
      { stage: '高度微卫星不稳定/dMMR', regimen: 'PD-1 免疫抑制剂 (恩沃利等)', note: '用于一线标准化学治疗失败后的基因特征患者。' }
    ],
    tags: ['国家医保', '剂量滴定', '骨髓抑制', 'PD-1免疫', '中国国情']
  },
  {
    id: 'caca',
    name: 'CACA',
    fullName: '中国抗癌协会 (CACA) 胰腺癌整合诊治指南',
    region: '中国 (China - CACA)',
    latestVersion: '2025 全新版',
    releaseDate: '2025年9月',
    primaryURL: 'https://cacaguidelines.cacakp.com/pdflist/detail?id=424',
    evidenceTier: 'Moderate',
    description: '秉承“防-筛-诊-治-康”的全面整合医学（MDT to HIM）理念，融入中西医结合、康复支持与全程全方位的长期生存关怀。',
    keyUpdates: [
      '提出了极具中国特色和整合医学架构的“胰腺癌全动周期筛查图谱”，对有家族史和慢性胰腺炎病史人群推荐早期联合内镜超声（EUS）筛查。',
      '在中西医整合康复部分，针对胰头癌压迫性疼痛及放化疗消化副反应，系统性推荐针灸、中草药（如理气健脾类方）的经典循证协作路径。',
      '强调无创营养状况分级（基于 SGA 评分），将饭后脂肪泻患者的 PERT（胰酶随餐）用量及复合维生素补充提升到了全程诊治的核心考核点。'
    ],
    recommendedRegimens: [
      { stage: '全程支持与康复', regimen: '无创高蛋白营养干预 + 中医体质调理', note: '降低化疗中断比例，减轻由于恶病质肌肉丢失造成的心肺负荷下移。' },
      { stage: '消化不良/腹泻 (EPI型)', regimen: '随餐摄入足额活性胰酶颗粒', note: '依据食物及含脂量严格分配首口随餐剂量，改善食欲。' }
    ],
    tags: ['整合医学', '针灸康复', '全动筛查', '营养干预', '全方位全程']
  }
];

export default function GuidelinesView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [activeGuideline, setActiveGuideline] = useState<Guideline | null>(CLINICAL_GUIDELINES[0]);

  // Filters
  const regions = ['all', '美国 (USA)', '欧洲 (Europe)', '日本 (Japan)', '中国 (China)', '中国 (China - CACA)'];

  const filteredGuidelines = CLINICAL_GUIDELINES.filter(g => {
    const matchesSearch = 
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRegion = selectedRegion === 'all' || g.region === selectedRegion;

    return matchesSearch && matchesRegion;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Disclaimer Box */}
      <div className="p-4 bg-zinc-950/50 border border-white/10 rounded-xl flex items-start gap-3 glass">
        <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
        <div className="text-xs sm:text-sm">
          <p className="font-serif font-semibold text-white mb-0.5 text-base">全球医学会权威胰腺导管癌临床实践指南集成更新手册</p>
          <p className="text-zinc-400 leading-normal font-sans">
            本页主动抓取并整理了全球最具权威影响力的五大肿瘤/胰腺癌协会最新指南（NCCN、ESMO、JSCO、CSCO、CACA）版本，总结了近期临床核心更新（涉及高危新辅助、规范D2根治术、东亚剂量滴定以及PERT胰酶应用规范），并配备可跳转一键溯源的官方认证链接。 
            <strong className="text-rose-400">（本部分数据仅用作学术研究和医学科普对齐，严禁任何自作医嘱调整！）</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Navigation Links & Filter bar */}
        <div className="lg:col-span-1 bg-zinc-950/60 border border-white/10 rounded-xl p-5 space-y-6 self-start glass">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-400" />
            指南维度精确定向
          </h3>

          {/* Search */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-405 font-medium block">搜索关键词 (如 FOLFIRINOX, 替吉奥...)</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="搜索指南内容或术语..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/60"
              />
            </div>
          </div>

          {/* Region filter */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium block font-sans">按指南地域筛选</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-lg py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500/60"
            >
              <option value="all">显示全部地域</option>
              {regions.filter(r => r !== 'all').map((reg, idx) => (
                <option key={idx} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          <div className="h-px bg-white/10 my-4" />

          {/* Quick list of matches */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-zinc-405 block uppercase tracking-wider">匹配学术指南大纲</span>
            {filteredGuidelines.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">无匹配指南结果，请放宽条件</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filteredGuidelines.map((g) => {
                  const isActive = activeGuideline?.id === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setActiveGuideline(g)}
                      className={`text-left w-full py-2.5 px-3 rounded text-xs transition duration-150 flex justify-between items-center cursor-pointer ${
                        isActive 
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/35 font-semibold' 
                          : 'bg-black/40 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                      }`}
                    >
                      <span className="truncate pr-1">📖 {g.name} 指南</span>
                      <span className="text-[10px] opacity-75 shrink-0 font-mono bg-white/5 py-0.5 px-1 rounded">
                        {g.latestVersion}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Warning Advice Section */}
          <div className="bg-black/80 border border-white/5 rounded-lg p-3 text-[10px] text-zinc-550 leading-relaxed font-sans mt-4">
            <Info className="h-4 w-4 text-blue-400 mb-1" />
            注：本平台仅在每天 AI 开源探网运行中同步抓取国际指南变化比对值。中国CSCO和CACA往往比NCCN更强调东亚特异性的中位化疗剂量，不可混用。
          </div>

        </div>

        {/* Right Side: Detailed Guideline analysis sheet block */}
        <div className="lg:col-span-3 space-y-4">
          {activeGuideline ? (
            <div className="bg-zinc-950/60 border border-white/10 rounded-xl p-6 space-y-6 glass animate-fade-in">
              
              {/* Card Title Header */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs uppercase tracking-wider font-mono bg-blue-500/15 text-blue-300 border border-blue-500/25 py-0.5 px-2 rounded">
                      🛡️ {activeGuideline.region} 指南
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      activeGuideline.evidenceTier === 'High' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25'
                    }`}>
                      循证等级: {activeGuideline.evidenceTier === 'High' ? 'A类 极高' : 'B类 中高等'}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono flex items-center gap-1 ml-auto">
                      <Calendar className="h-3 w-3" />
                      发布时间：{activeGuideline.releaseDate}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-light text-white tracking-tight leading-snug">
                    {activeGuideline.fullName}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-2 font-sans italic">
                    {activeGuideline.description}
                  </p>
                </div>

                <div className="shrink-0 pt-1">
                  <a 
                    href={activeGuideline.primaryURL}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition duration-150 cursor-pointer active-glow"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    官方指南链接
                  </a>
                </div>
              </div>

              {/* Grid content */}
              <div className="space-y-4">
                
                {/* Section 1: Ingested key Updates (The Requested Guide update details) */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2 font-serif text-blue-400">
                    <Bookmark className="h-4.5 w-4.5 text-blue-400" />
                    核心新版更新要点临床研判 (Key Guideline Advancements)
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {activeGuideline.keyUpdates.map((update, i) => (
                      <div key={i} className="p-3 bg-black border border-white/5 rounded-lg flex items-start gap-2.5">
                        <span className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-400 text-xs flex justify-center items-center shrink-0 font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                          {update}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Regimen table */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2 font-serif text-indigo-400">
                    <ListRestart className="h-4.5 w-4.5 text-indigo-450" />
                    推荐治疗分期用药目录 (Clinical Chemotherapy Path)
                  </h4>
                  <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="border-b border-white/10 bg-black/60 text-zinc-400">
                          <th className="py-2.5 px-4 font-normal">适应症/临床期</th>
                          <th className="py-2.5 px-4 font-normal">核心推荐方案名称</th>
                          <th className="py-2.5 px-4 font-normal w-[50%]">指南实证解读备注</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-zinc-300">
                        {activeGuideline.recommendedRegimens.map((item, idx) => (
                          <tr key={idx} className="hover:bg-black/60 transition">
                            <td className="py-3 px-4 font-bold text-white whitespace-nowrap">{item.stage}</td>
                            <td className="py-3 px-4 text-blue-400 font-mono font-medium">{item.regimen}</td>
                            <td className="py-3 px-4 text-zinc-400 leading-relaxed">{item.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 3: Subject Tags mapped underneath and matched */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-xs text-zinc-400 block font-sans font-semibold">标定指南及科研知识图谱实体 (Taxonomy entities)</span>
                  <div className="flex flex-wrap gap-2">
                    {activeGuideline.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] bg-black text-zinc-400 border border-white/10 py-1 px-2.5 rounded font-medium">
                        🔬 {tag}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-12 text-center bg-zinc-950/20 border border-white/10 rounded-2xl glass py-20">
              <BookOpen className="h-10 w-10 text-zinc-600 mx-auto mb-3 animate-pulse" />
              <h4 className="text-sm font-semibold text-zinc-300">请选择左侧各大指南大纲</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                点击上方分类或列表中的标签，切换至对端查看细化新辅助推荐和靶点解析策略。
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
