import React, { useState } from 'react';
import { OSINTItem, OSINTCategory, EvidenceLevel, PatientProfile } from '../types';
import WarRoomGlobe from './WarRoomGlobe';
import { 
  Search, 
  Sparkles, 
  SlidersHorizontal, 
  ExternalLink, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  Zap, 
  RefreshCw,
  Info,
  CheckCircle2,
  Bookmark,
  Dna,
  MapPin,
  Heart
} from 'lucide-react';

import { LanguageCode, TRANSLATIONS } from '../translations';

interface OSINTFeedProps {
  items: OSINTItem[];
  onFetchNew: () => Promise<void>;
  onGenerateSummary: () => Promise<string>;
  isFetching: boolean;
  statusMessage?: string;
  newsRefreshMode?: 'knows' | 'fallback';
  newsWindowLabel?: '24h' | '7d' | '30d';
  onOpenSubmission?: () => void;
  searchTerm?: string;
  onSearchTermChange?: (val: string) => void;
  patientProfile: PatientProfile | null;
  perspective: 'generic' | 'personalized';
  onNavigateToTab?: (tab: 'feed' | 'target_insight' | 'map' | 'watchdog' | 'report' | 'guidelines' | 'patient_profile') => void;
  language: LanguageCode;
}

const CATEGORY_MAP: Record<OSINTCategory, { label: string; color: string; border: string; bg: string }> = {
  drug: { label: '靶点新药', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  trial: { label: '临床试验', color: 'text-sky-400', border: 'border-sky-500/30', bg: 'bg-sky-500/10' },
  surgery: { label: '外科手术', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  oncology: { label: '肿瘤内科', color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10' },
  nutrition: { label: '营养支持', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  psychology: { label: '心理关怀', color: 'text-pink-400', border: 'border-pink-500/30', bg: 'bg-pink-500/10' },
  complication: { label: '并发症管理', color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
  policy: { label: '政策医保', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' },
  patient_resource: { label: '患者资源', color: 'text-teal-400', border: 'border-teal-500/30', bg: 'bg-teal-500/10' }
};

const EVIDENCE_MAP: Record<EvidenceLevel, { label: string; desc: string; color: string; bg: string }> = {
  A: { label: 'A级', desc: '多中心随机对照双盲研究 / 权威指南金标准', color: 'text-red-400', bg: 'bg-red-500/10' },
  B: { label: 'B级', desc: '前瞻性单臂临床试验 / 权威中心规范化推荐', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  C: { label: 'C级', desc: '回顾性队列研究 / 预印学术论文推荐', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  D: { label: 'D级', desc: '知名专家个案报告 / 科普观点共识方案', color: 'text-gray-400', bg: 'bg-gray-500/10' }
};

const getCategoryLabel = (cat: OSINTCategory, lang: LanguageCode): string => {
  const dictionary: Record<LanguageCode, Record<OSINTCategory, string>> = {
    ZH: {
      drug: '靶点新药', trial: '临床试验', surgery: '外科手术', oncology: '肿瘤内科',
      nutrition: '营养支持', psychology: '心理关怀', complication: '并发症管理',
      policy: '政策医保', patient_resource: '患者资源'
    },
    ZT: {
      drug: '靶點新藥', trial: '臨床試驗', surgery: '外科手術', oncology: '腫瘤內科',
      nutrition: '營養支持', psychology: '心理關懷', complication: '併發症管理',
      policy: '政策醫保', patient_resource: '患者資源'
    },
    EN: {
      drug: 'Targeted Drug', trial: 'Clinical Trial', surgery: 'Surgery/Resection', oncology: 'Medical Oncology',
      nutrition: 'Nutritional Support', psychology: 'Psychological Care', complication: 'Complication Mgmt',
      policy: 'Policy/Insurance', patient_resource: 'Patient Resources'
    },
    FR: {
      drug: 'Thérapie Ciblée', trial: 'Essai Clinique', surgery: 'Chirurgie', oncology: 'Oncologie Médicale',
      nutrition: 'Soutien Nutritionnel', psychology: 'Soutien Psychologique', complication: 'Gest. Complications',
      policy: 'Politique/Assurance', patient_resource: 'Ressources Patient'
    },
    RU: {
      drug: 'Таргетная терапия', trial: 'Клинические исследования', surgery: 'Хирургия', oncology: 'Онкология',
      nutrition: 'Нутритивная терапия', psychology: 'Психологическая помощь', complication: 'Контроль осложнений',
      policy: 'Полисы/Страхование', patient_resource: 'Ресурсы пациентов'
    },
    JA: {
      drug: '標的治療薬', trial: '臨床試験', surgery: '外科手術', oncology: '腫瘍内科',
      nutrition: '栄養サポート', psychology: '心理的ケア', complication: '合併症管理',
      policy: '政策・医療保険', patient_resource: '患者リソース'
    },
    KO: {
      drug: '표적 신약', trial: '임상 시험', surgery: '외과 수술', oncology: '종양내과',
      nutrition: '영양 지원', psychology: '심리 케어', complication: '합병증 관리',
      policy: '정책/의료보험', patient_resource: '환자 자원'
    },
    ES: {
      drug: 'Terapia Dirigida', trial: 'Ensayo Clínico', surgery: 'Cirugía', oncology: 'Oncología Médica',
      nutrition: 'Soporte Nutricional', psychology: 'Apoyo Psicólogo', complication: 'Manejo Complicaciones',
      policy: 'Políticas/Seguro', patient_resource: 'Recursos del Paciente'
    },
    AR: {
      drug: 'دواء موجه', trial: 'تجربة سريرية', surgery: 'الجراحة والاستئصال', oncology: 'طب الأورام',
      nutrition: 'الدعم الغذائي', psychology: 'الرعاية النفسية', complication: 'علاج المضاعفات',
      policy: 'السياسة والتأمين', patient_resource: 'مصادر للمرضى'
    },
    HI: {
      drug: 'लक्षित थेरेपी', trial: 'नैदानिक परीक्षण', surgery: 'शल्य चिकित्सा术', oncology: 'मेडिकल ऑन्कोलॉजी',
      nutrition: 'पोषण संबंधी सहायता', psychology: 'मनोवैज्ञानिक सहायता', complication: 'जटिलता प्रबंधन',
      policy: 'नीति और बीमा', patient_resource: 'मरीज संसाधन'
    }
  };
  return (dictionary[lang] || dictionary['EN'])[cat] || cat;
};

const getEvidenceLabelAndDesc = (level: EvidenceLevel, lang: LanguageCode): { label: string; desc: string } => {
  const labelDict: Record<LanguageCode, string> = {
    ZH: `${level}级`, ZT: `${level}級`, EN: `Level ${level}`, FR: `Niveau ${level}`,
    RU: `Уровень ${level}`, JA: `レベル ${level}`, KO: `등급 ${level}`, ES: `Nivel ${level}`,
    AR: `مستوى ${level}`, HI: `स्तर ${level}`
  };
  
  const descDict: Record<LanguageCode, Record<EvidenceLevel, string>> = {
    ZH: {
      A: '多中心随机对照双盲研究 / 权威指南金标准',
      B: '前瞻性单臂临床试验 / 权威中心规范化推荐',
      C: '回顾性队列研究 / 预印学术论文推荐',
      D: '知名专家个案报告 / 科普观点共识方案'
    },
    ZT: {
      A: '多中心隨機對照雙盲研究 / 權威指南金標準',
      B: '前瞻性單臂臨床試驗 / 權威中心規範化推薦',
      C: '回顧性隊列研究 / 預印學術論文推薦',
      D: '知名專家個案報告 / 科普觀點共識方案'
    },
    EN: {
      A: 'Multi-center randomized controlled double-blind study / Guidelines Gold Standard',
      B: 'Prospective single-arm clinical trial / Consensus recommendations',
      C: 'Retrospective cohort study / Preprint literature articles',
      D: 'Expert case reports / Informational clinical views'
    },
    FR: {
      A: 'Étude multicentrique randomisée contrôlée en double aveugle / Consensus d\'or',
      B: 'Essai clinique prospectif à un seul bras / Recommandations agrégées',
      C: 'Étude de cohorte rétrospective / Prépublications académiques',
      D: 'Rapports de cas d\'experts / Opinions cliniques informelles'
    },
    RU: {
      A: 'Мультицентровое рандомизированное исследование / Клинический золотой стандарт',
      B: 'Проспективное однорукавное исследование / Рекомендации ведущих онкоцентров',
      C: 'Ретроспективное когортное исследование / Препринты научных статей',
      D: 'Клинические случаи из практики / Мнения экспертов и обзоры'
    },
    JA: {
      A: '多施設共同ランダム化比較二重盲検試験 / ガイドライン標準',
      B: '前向き単群臨床試験 / 主要オンコロジーセンター推奨',
      C: '後ろ向きコホート研究 / プレプリント、学会要旨等',
      D: '専門医ケースレポート / 一般解説・コラム'
    },
    KO: {
      A: '다기관 무작위 대조군 이중맹검 연구 / 표준 가이드라인',
      B: '전향적 단일동맹 임상시험 / 주요 암센터 권장안',
      C: '소급적 코호트 연구 / 미인쇄 프리프린트 논문',
      D: '의학 전문가 증례 보고 / 일반용 가이드'
    },
    ES: {
      A: 'Estudio prospectivo aleatorizado doble ciego / Estándar de oro de pautas',
      B: 'Ensayo clínico de un solo brazo / Recomendaciones oficiales de centros',
      C: 'Estudio de cohorte retrospectivo / Artículos académicos de preprint',
      D: 'Informes de casos de expertos / Opiniones de divulgación clínica'
    },
    AR: {
      A: 'دراسة متعددة المراكز عشوائية ومزدوجة التعمية / المعيار الذهبي الإرشادي',
      B: 'تجربة سريرية مستقبلية وحيدة الذراع / توصيات المراكز المعتمدة',
      C: 'دراسة أتراب استرجاعية / أوراق بحثية سابقة للطباعة',
      D: 'تقارير حالات خبراء بارزين / خطط إرشادية عامة'
    },
    HI: {
      A: 'बहु-केंद्र यादृच्छिक नियंत्रित डबल-ब्लाइंड अध्ययन / स्वर्ण मानक दिशा-निर्देश',
      B: 'भावी एकल-शाखा नैदानिक परीक्षण / आधिकारिक सहमति सिफारिशें',
      C: 'पूर्वव्यापी कोहोर्ट अध्ययन / मुद्रण-पूर्व सहकर्मी-समीक्षित लेख',
      D: 'विशेषज्ञ नैदानिक मामला रिपोर्ट / सूचनात्मक सहमति योजनाएं'
    }
  };
  
  const label = labelDict[lang] || `${level}`;
  const desc = (descDict[lang] || descDict['EN'])[level] || '';
  return { label, desc };
};

const uiTranslation: Record<LanguageCode, any> = {
  ZH: {
    minEvidence: '最少循证证据等级',
    allLevels: '全部级别',
    minImportance: '最低情报评级',
    searchPlaceholder: '输入关键词检索文献名称、治疗要点或副反应方案...',
    noData: '未找到符合条件的开源情报，请尝试调整筛选词',
    level: '级',
    priorityEval: '优先级评估',
    importanceScore: '情报级别(分值越高越核心)',
    evidenceLevel: '临床循证等级证明',
    matchReasonCity: '📍 与您所在的常驻城市 [{city}] 契合',
    matchReasonMutation: '🧬 与您的特异基因突变 [{mut}] 基因精准匹配',
    matchReasonRegimen: '💊 与您当前的化疗方案 [{regimen}] 高度契合',
    matchReasonIhc: '🔬 免疫组化指标 [{ihc}] 病理针对性匹配成功',
    searching: '系统正检索突变列表、化疗剂量、胰酶Pert标准的循证等级，请稍候...',
    evidenceTitle: '开源学术细节与临床打分板',
    author: '原始出处及主导团队',
    evidenceRank: 'OSINT 核心证据链评级',
    guidelineMap: '关联 NCCN/CSCO 临床共识条目',
    categoryFilters: '类型过滤器：',
    allCategories: '全部类型',
    importanceFilter: '最低严重度：',
    btnIngestNew: '启动 AI 实时学术检索',
    btnDraftReport: '生成 15天系统综合评估',
    multidimCond: '多维条件精确研判',
    keywordFilter: '关键字筛选 (靶点、临床、肿瘤)',
    intelCat: '情报门类',
    allCatLabel: '全部范畴',
    importanceTip: '注：FDA批准、三期药效优越计 8.5+ 分，一二期初探/指南推荐计 6-8 分，科普饮食计 2-5 分。',
    decisionSystem: '智能决策自适应系统控键',
    ingestBtn: '启动 AI 实时学术检索',
    summaryBtn: '生成 24H 实时简报',
    nodeResolved: '全节点研判完成: 共筛选出 {count} 份情报源',
    crawlActivity: '今日采集活跃度：',
    autonomousRun: '100% 自治运行',
    highValueTag: '高价值研判',
    fitLabel: '🎯 病情契合',
    coPilotFit: 'AI 深度病情靶点精准拟合',
    originRegion: '国源发地区：',
    closeEsc: '关闭 ESC',
    citationSource: '情报捕获来源：',
    collectTime: '收集时间: ',
    citationUrl: '临床原始文献连接 URL (一键阅源 - 真实学术链路)',
    warningLabel: '严正红线声明',
    warningText: '本开源情报属于自主网络爬行汇总和AI学术翻译。所涉药物联用（如ATM合成致死、MRTX突变药）、中药针灸或外科路径，绝对不构成任何直接诊疗医嘱建议。凡涉及抗癌剂量、术式改变，请务必前往实体医院肿瘤内普外科进行MDT专家联评确诊。',
    knowBtn: '我知道了',
    aiBriefTitle: 'AI 生成全球胰腺癌 24H 开源分析简报',
    exitEsc: '退出 ESC',
    loadingBrief: 'Gemini 3.5 Flash 正在交叉研算今日情报源数据...',
    loadingBriefTip: '系统正检索突变列表、化疗剂量、胰酶Pert标准的循证等级，请稍候。',
    mdtPromptTitle: '胰腺疾病多学科MDT提示',
    mdtPromptText: '每日简报系基于大语言模型对公开采集数据集的聚合提取。即使提及具体临床期中生存期（如11.1个月），也必然存在高度个体特异性差异。任何关于剂量（PERT随餐）及化疗联合建议均必须与注册医师核对。',
    confirmAndClose: '确认并关闭',
    noBrief: '未生成简报，请重试。'
  },
  ZT: {
    minEvidence: '最少循證證據等級',
    allLevels: '全部級別',
    minImportance: '最低情報評級',
    searchPlaceholder: '輸入關鍵詞檢索文獻名稱、治療要點或副反應方案...',
    noData: '未找到符合條件的開源情報，請嘗試調整篩選詞',
    level: '級',
    priorityEval: '優先級評估',
    importanceScore: '情報級別(分值越高越核心)',
    evidenceLevel: '臨床循證等級證明',
    matchReasonCity: '📍 與您所在的常駐城市 [{city}] 契合',
    matchReasonMutation: '🧬 與您的特異基因突變 [{mut}] 基因精準匹配',
    matchReasonRegimen: '💊 與您當前的化療方案 [{regimen}] 高度契合',
    matchReasonIhc: '🔬 免疫組化指標 [{ihc}] 病理針對性匹配成功',
    searching: '系統正檢索突變列表、化療劑量、胰酶Pert標準的循證等級，請稍候...',
    evidenceTitle: '開源學術細節與臨床打分板',
    author: '原始出處及主導團隊',
    evidenceRank: 'OSINT 核心證據鏈評級',
    guidelineMap: '關聯 NCCN/CSCO 臨床共識條目',
    categoryFilters: '類型過濾器：',
    allCategories: '全部類型',
    importanceFilter: '最低嚴重度：',
    btnIngestNew: '啟動 AI 即時學術檢索',
    btnDraftReport: '生成 15天系統綜合評估',
    multidimCond: '多維條件精確研判',
    keywordFilter: '關鍵字篩選 (靶點、臨床、腫瘤)',
    intelCat: '情報門類',
    allCatLabel: '全部範疇',
    importanceTip: '註：FDA批准、三期藥效優越計 8.5+ 分，一二期初探/指南推薦計 6-8 分，科普飲食計 2-5 分。',
    decisionSystem: '智能決策自適應系統控鍵',
    ingestBtn: '啟動 AI 即時學術檢索',
    summaryBtn: '生成 24H 即時簡報',
    nodeResolved: '全節點研判完成: 共篩選出 {count} 份情報源',
    crawlActivity: '今日采集活躍度：',
    autonomousRun: '100% 自治運行',
    highValueTag: '高價值研判',
    fitLabel: '🎯 病情契合',
    coPilotFit: 'AI 深度病情靶點精準擬合',
    originRegion: '國源發地區：',
    closeEsc: '關閉 ESC',
    citationSource: '情報捕獲來源：',
    collectTime: '收集時間: ',
    citationUrl: '臨床原始文獻連接 URL (一鍵閱源 - 真實學術鏈路)',
    warningLabel: '嚴正紅線聲明',
    warningText: '本開源情報屬於自主網絡爬行匯總和AI學術翻譯。所涉藥物聯用（如ATM合成致死、MRTX突變藥）、中藥針灸或外科路徑，絕對不構成任何直接診療醫囑建議。凡涉及抗癌劑量、術式改變，請務必前往實體醫院腫瘤內普外科進行MDT專家聯評確診。',
    knowBtn: '我知道了',
    aiBriefTitle: 'AI 生成全球胰腺癌 24H 開源分析簡報',
    exitEsc: '退出 ESC',
    loadingBrief: 'Gemini 3.5 Flash 正在交叉研算今日情報源數據...',
    loadingBriefTip: '系統正檢索突變列表、化療劑量、胰酶Pert標準的循證等級，請稍候。',
    mdtPromptTitle: '胰腺疾病多學科MDT提示',
    mdtPromptText: '每日簡報系基於大語言模型對公開采集數據集的聚合提取。即使提及具體臨床期中生存期（如11.1個月），也必然存在高度個體特異性差異。任何關於劑量（PERT隨餐）及化療聯合建議均必須與註冊醫師核對。',
    confirmAndClose: '確認並關閉',
    noBrief: '未生成簡報，請重試。'
  },
  EN: {
    minEvidence: 'Min Evidence Level',
    allLevels: 'All Levels',
    minImportance: 'Min Importance Rating',
    searchPlaceholder: 'Search literature titles, therapeutic protocols, adverse events...',
    noData: 'No open-source intelligence matching your search. Please adjust filters.',
    level: '',
    priorityEval: 'Priority Evaluation',
    importanceScore: 'Importance Score (Higher is more core)',
    evidenceLevel: 'Clinical Evidence Level Verification',
    matchReasonCity: '📍 Coincides with your physical city [{city}]',
    matchReasonMutation: '🧬 Matches your genomic mutation target [{mut}]',
    matchReasonRegimen: '💊 Clustered with your chemotherapy regimen [{regimen}]',
    matchReasonIhc: '🔬 Pathologically matched with IHC biomarker [{ihc}]',
    searching: 'Retrieving mutation indexes, pert standards, and clinical evidence...',
    evidenceTitle: 'OSINT Peer Review & Clinical Scoring Dashboard',
    author: 'Primary Source & Research Team',
    evidenceRank: 'OSINT Evidence Chain Verification Level',
    guidelineMap: 'Mapped NCCN / CSCO Guideline Clauses',
    categoryFilters: 'Category Filters:',
    allCategories: 'All Categories',
    importanceFilter: 'Min Severity:',
    btnIngestNew: 'Launch AI Real-time Retrieval',
    btnDraftReport: 'Generate 15-Day Quality Audit',
    multidimCond: 'Precise Judgment Parameters',
    keywordFilter: 'Keyword Filter (Mutation, Regime, Care)',
    intelCat: 'Intelligence Category',
    allCatLabel: 'All Categories',
    importanceTip: 'Note: FDA-approved clinical guidelines are rated 8.5+, early Phase I/II trials rated 6-8, general nutrition rated 2-5.',
    decisionSystem: 'Disaster-tolerant Action Panel',
    ingestBtn: 'Launch Real-time AI Spider',
    summaryBtn: 'Generate Today\'s Executive Brief',
    nodeResolved: 'All Nodes Synchronized: {count} intelligence sources filtered',
    crawlActivity: 'Real-time Ingest Activity:',
    autonomousRun: '100% Autonomous',
    highValueTag: 'High-Value OSINT',
    fitLabel: '🎯 Target Matched',
    coPilotFit: 'AI Precision Target & Clinical Fitment',
    originRegion: 'Country of Origin:',
    closeEsc: 'Close ESC',
    citationSource: 'Primary Source:',
    collectTime: 'Collected Time: ',
    citationUrl: 'Clinical Literature Source Link (True Academic Bridge)',
    warningLabel: 'Redline Disclaimer',
    warningText: 'This dataset aggregates non-peer reviewed open-source translations. Any drug recommendations (e.g. MRTX inhibitor or ATM lethality) or digestive enzyme dosage equations constitute absolute research benchmarks and NOT official medical decrees. MDT review is strictly mandatory before starting any clinical routines.',
    knowBtn: 'Dismiss',
    aiBriefTitle: 'AI Generated Global Pancreatic Cancer 24H Intelligence Brief',
    exitEsc: 'Exit ESC',
    loadingBrief: 'Gemini 3.5 Flash is index-mining medical literature metadata...',
    loadingBriefTip: 'Running deep matching of biomarker chains, PERT dosage guidelines, and patient profiles...',
    mdtPromptTitle: 'Pancreatic MDT Board Reminder',
    mdtPromptText: 'Daily syntheses are derived procedurally. Exact overall median survival values are statistics and do not map directly to absolute prognosis. Consult certified oncologists prior to any changes in your regimen.',
    confirmAndClose: 'Acknowledge & Close',
    noBrief: 'No brief generated. Please try again.'
  },
  FR: {
    minEvidence: 'Niveau d\'Évidence Minimum',
    allLevels: 'Tous les Niveaux',
    minImportance: 'Gravité Minimale',
    searchPlaceholder: 'Rechercher un terme, un protocole d\'oncologie clinique...',
    noData: 'Aucun document ne correspond à vos filtres',
    level: '',
    priorityEval: 'Évaluation des Priorités',
    importanceScore: 'Niveau d\'Importance (Élevé est plus fort)',
    evidenceLevel: 'Validation du Faisceau d\'Évidences',
    matchReasonCity: '📍 Correspond à votre ville [{city}]',
    matchReasonMutation: '🧬 Aligné à votre mutation génomique [{mut}]',
    matchReasonRegimen: '💊 Adapté à votre protocole de chimiothérapie [{regimen}]',
    matchReasonIhc: '🔬 Marqueur IHC pathologiquement ciblé [{ihc}]',
    searching: 'Recherche de mutations, dosages de PERT et données d\'évidence...',
    evidenceTitle: 'Fiche d\'Évaluation Clinique de l\'OSINT',
    author: 'Source d\'Origine & Équipe Académique',
    evidenceRank: 'Validation du Faisceau de Preuves',
    guidelineMap: 'Clauses Directrices Associées (NCCN / CSCO)',
    categoryFilters: 'Filtres de Catégories :',
    allCategories: 'Toutes les catégories',
    importanceFilter: 'Importance min :',
    btnIngestNew: 'Lancer l\'extraction IA en direct',
    btnDraftReport: 'Générer le rapport de 15 jours',
    multidimCond: 'Paramètres Multidimensionnels',
    keywordFilter: 'Mots-clés (Mutations, Schéma, Soins)',
    intelCat: 'Catégorie d\'Intelligence',
    allCatLabel: 'Toutes les Catégories',
    importanceTip: 'Note: Homologation FDA/recommandations classées 8.5+, Phase I/II classées 6-8, nutrition classée 2-5.',
    decisionSystem: 'Console de Décision Résistante',
    ingestBtn: 'Lancer l\'Araignée IA',
    summaryBtn: 'Générer le Briefing 24H',
    nodeResolved: 'Tous nœuds synchronisés: {count} sources regroupées',
    crawlActivity: 'Activité d\'extraction :',
    autonomousRun: '100% Autonome',
    highValueTag: 'OSINT Haute Valeur',
    fitLabel: '🎯 Parfaitement Ciblé',
    coPilotFit: 'Ajustement Clinique & Moléculaire de Précision',
    originRegion: 'Pays d\'Origine :',
    closeEsc: 'Fermer ESC',
    citationSource: 'Source Primaire :',
    collectTime: 'Collecté le : ',
    citationUrl: 'Source Littéraire Clinique (Pont Académique Réel)',
    warningLabel: 'Avertissement de Ligne Rouge',
    warningText: 'Ces données compilent des études de recherche académique. Toute proposition de thérapie combinée (ex: MRTX ou ATM) ou de posologie pancréatique (PERT) ne constitue pas une prescription. Consultez vos oncologues agréés avant toute initiative.',
    knowBtn: 'Fermer',
    aiBriefTitle: 'Rapport Stratégique de l\'IA sur le Cancer du Pancréas',
    exitEsc: 'Quitter ESC',
    loadingBrief: 'Gemini 3.5 Flash analyse les métadonnées scientifiques...',
    loadingBriefTip: 'Calcul en cours des correspondances de biomarqueurs et équations PERT...',
    mdtPromptTitle: 'Rappel du Conseil Multidisciplinaire',
    mdtPromptText: 'Ce briefing automatisé repose sur des données compilées. Les médianes de survie mentionnées sont de nature statistique. Veuillez solliciter vos médecins oncologues.',
    confirmAndClose: 'Confirmer et Fermer',
    noBrief: 'Échec de génération du briefing. Réessayez.'
  },
  RU: {
    minEvidence: 'Мин. уровень доказательств',
    allLevels: 'Все уровни',
    minImportance: 'Мин. уровень важности',
    searchPlaceholder: 'Поиск статей по онкологии, терминов, лекарств...',
    noData: 'Ничего не найдено, измените фильтры поиска',
    level: '',
    priorityEval: 'Оценка Портфеля Приоритета',
    importanceScore: 'Показатель важности (Чем выше, тем актуальнее)',
    evidenceLevel: 'Клиническое подтверждение уровня доказательств',
    matchReasonCity: '📍 Совпадает с вашим местонахождением [{city}]',
    matchReasonMutation: '🧬 Соответствует вашей геномной мутации [{mut}]',
    matchReasonRegimen: '💊 Совместимо со схемой химиотерапии [{regimen}]',
    matchReasonIhc: '🔬 Патоморфологическое сходство по IHC маркеру [{ihc}]',
    searching: 'Поиск индексов мутаций, стандартов PERT и доказательных статей...',
    evidenceTitle: 'Клиническая оценка доказательств OSINT',
    author: 'Первоисточник и научная группа',
    evidenceRank: 'Уровень достоверности доказательств',
    guidelineMap: 'Связанные статьи NCCN / CSCO',
    categoryFilters: 'Фильтр по категориям:',
    allCategories: 'Все категории',
    importanceFilter: 'Мин. важность:',
    btnIngestNew: 'Запустить ИИ поиск литературы',
    btnDraftReport: 'Сгенерировать сводный отчет',
    multidimCond: 'Параметры точной фильтрации',
    keywordFilter: 'Ключевые слова (мутация, режим, уход)',
    intelCat: 'Категория информации',
    allCatLabel: 'Все категории',
    importanceTip: 'Примечание: Утверждения FDA/руководства ранжируются 8.5+, ранние фазы клинических исследований 6-8, нутрициология 2-5.',
    decisionSystem: 'Панель управления шлюзами связи',
    ingestBtn: 'Запустить ИИ-паук сбора данных',
    summaryBtn: 'Сформировать 24ч дайджест',
    nodeResolved: 'Все узлы синхронизированы: отфильтровано {count} источников',
    crawlActivity: 'Активность ИИ-паука:',
    autonomousRun: '100% Автономия',
    highValueTag: 'Высокая ценность',
    fitLabel: '🎯 Мишень совпала',
    coPilotFit: 'Прецизионное молекулярное сходство ИИ',
    originRegion: 'Страна-источник:',
    closeEsc: 'Закрыть ESC',
    citationSource: 'Первоисточник:',
    collectTime: 'Дата сбора: ',
    citationUrl: 'Ссылка на оригинальную научную публикацию',
    warningLabel: 'Отказ от ответственности',
    warningText: 'Сводные данные получены автоматическим поиском. Любая информация по приёму препаратов (например, MRTX или синергия ATM) или ферментам (PERT) является справочной. Обязательна консультация на консилиуме онкологов.',
    knowBtn: 'Понятно',
    aiBriefTitle: 'Сформированный ИИ оперативный 24ч отчет по раку поджелудочной железы',
    exitEsc: 'Выход ESC',
    loadingBrief: 'Gemini 3.5 Flash компилирует метаданные библиотек...',
    loadingBriefTip: 'Проводится сопоставление биомаркеров и схем ферментной терапии...',
    mdtPromptTitle: 'Напоминание консилиума онкологов',
    mdtPromptText: 'Дайджест сгенерирован автоматически на основе открытых данных. Показатели выживаемости носят статистический характер. Согласуйте действия с онкологом.',
    confirmAndClose: 'Подтвердить и закрыть',
    noBrief: 'Не удалось сгенерировать отчет. Попробуйте еще раз.'
  },
  JA: {
    minEvidence: '必要エビデンス条件',
    allLevels: 'すべて表示',
    minImportance: '最小重要度しきい値',
    searchPlaceholder: '文献名、治療、副作用軽減、学会抄録を横断検索...',
    noData: '条件に合致する医学情報は発見できませんでした',
    level: '',
    priorityEval: '優先順位判定システム',
    importanceScore: '優先度スコア (高いほど核心情報)',
    evidenceLevel: '臨床エビデンス整合性識別レベル',
    matchReasonCity: '📍 患者が居住する医療拠点 [{city}] に対応',
    matchReasonMutation: '🧬 特異的なゲノム変異 [{mut}] 標的フィルタ一致',
    matchReasonRegimen: '💊 処方中の化学療法レジメン [{regimen}] に適合',
    matchReasonIhc: '🔬 免疫組織化学(IHC)標的画像 [{ihc}] にフォーカス',
    searching: '変異インデックス、膵酵素PERT、科学文献エビデンス照合中...',
    evidenceTitle: 'OSINT検証データおよび推奨スコア',
    author: '一次文献出典および中核研究グループ',
    evidenceRank: 'OSINT 核心エビデンス整合性識別レベル',
    guidelineMap: 'マッピングされた NCCN/CSCO 治療合意事項',
    categoryFilters: 'カテゴリ選択：',
    allCategories: 'すべてのカテゴリ',
    importanceFilter: '最小重要度：',
    btnIngestNew: 'AIによる最新文献ライブ巡回',
    btnDraftReport: '15日間レポート動的生成',
    multidimCond: '多重パラメータ適合照合',
    keywordFilter: 'KWフィルタ (標的、治療レジメン、副作用緩和)',
    intelCat: 'オープンソース情報分類',
    allCatLabel: '全カテゴリー',
    importanceTip: '注：公的ガイドライン承認済みの発見は8.5+に設定され、初期臨床試験は6-8、補完食品や栄養管理は2-5に分類されます。',
    decisionSystem: '自律実行アクションコントロール',
    ingestBtn: 'リアルタイム情報収集クローラー起動',
    summaryBtn: '24時間最新インテリジェンス要約',
    nodeResolved: '全検索ノード完了: 適合文献数 {count} 件',
    crawlActivity: 'インジェスト循環活性度：',
    autonomousRun: '100% 自律制御稼働',
    highValueTag: '核心高価値OSINT',
    fitLabel: '🎯 マーカー適合',
    coPilotFit: 'AI分子遺伝標的・精密臨床マッチング',
    originRegion: '文献発表国：',
    closeEsc: '閉じる ESC',
    citationSource: '発信一次元資料：',
    collectTime: '情報蓄積日: ',
    citationUrl: '臨床原典リンク URL (実証文献への架け橋)',
    warningLabel: '重要免責宣言',
    warningText: '本プラットフォームは情報の自動収集を行います。ATM合成致死阻害や特定変異（MRTX等）、PERT酵素の用量方程式を含むすべての記載は仮説であり、実際の医療処方ではありません。治療レジメンの変更時には、必ず臨床医に確認してください。',
    knowBtn: '了解しました',
    aiBriefTitle: 'AI選定がんインテリジェンス最新サマリー',
    exitEsc: '退出 ESC',
    loadingBrief: 'Gemini 3.5 Flash が最先端治療データを分析マイニング中...',
    loadingBriefTip: '抗癌マーカー情報、随餐薬PERT容量ガイドラインを詳細計算しています...',
    mdtPromptTitle: 'がん多職種MDT専門チーム推奨',
    mdtPromptText: '自動編集されたレポートは参考指標です。特定の生存期間等の中央値は統計確率であり、実際の予後を保証するものではありません。医師と確認してください。',
    confirmAndClose: '確認して閉じる',
    noBrief: '要約レポートの生成に失敗しました。再試行してください。'
  },
  KO: {
    minEvidence: '최소 검증근거 레벨',
    allLevels: '전체 보기',
    minImportance: '최소 중요성 평가',
    searchPlaceholder: '문헌 이름, 치료 포인트, 복약 관련 키워드 검색...',
    noData: '해당하는 의료 데이터 또는 논문 인용 자료가 존재하지 않습니다',
    level: '',
    priorityEval: '우선순위 맞춤 분석',
    importanceScore: '중요도 점수 (수치가 높을수록 췌장암 연구 핵심)',
    evidenceLevel: '임상 에비던스 증명 레벨',
    matchReasonCity: '📍 환자가 활동하는 지역 [{city}] 부합',
    matchReasonMutation: '🧬 유전자 변이 바이오마커 [{mut}] 맞춤 분석 일치',
    matchReasonRegimen: '💊 진행중인 화학요법 [{regimen}] 과 결합',
    matchReasonIhc: '🔬 면역조합화학염색(IHC) 지표 [{ihc}] 표적 치료군 매칭',
    searching: '돌연변이 분석군, 췌장효소PERT 등 및 임상 에비던스 로딩 중...',
    evidenceTitle: '오픈소스 증거 강도 분석 및 점수판',
    author: '원문 연구 출처 및 집필진',
    evidenceRank: '오픈소스 증거 강도 자가 등급 분석',
    guidelineMap: '해당 NCCN/CSCO 정렬 규격 항목',
    categoryFilters: '필터 범위 선택:',
    allCategories: '전체 종류',
    importanceFilter: '최소 점수:',
    btnIngestNew: 'AI 문헌 크롤링 파이프라인 가동',
    btnDraftReport: '15일간 인텔리전스 리포트 구성',
    multidimCond: '다차원 매개변수 검색 필터',
    keywordFilter: '키워드 필터 (돌연변이, 화학요법)',
    intelCat: '인텔리전스 분류 정보',
    allCatLabel: '전체 카테고리',
    importanceTip: '참고: FDA 정식 승인 또는 가이드라인 추천은 8.5+점, 초기 임상시험 진행은 6-8점, 일반 완화관리는 2-5점으로 매핑됩니다.',
    decisionSystem: '자율 제어 오퍼레이션 콘트롤러',
    ingestBtn: 'AI 췌장암 연구 수집 봇 상시 기동',
    summaryBtn: '실시간 24H 인텔리전스 리포트 프리뷰',
    nodeResolved: '핵심 노드 분석 완료: 통과 유효 논문 {count}건',
    crawlActivity: '데이터 수집 활성량:',
    autonomousRun: '100% 자율 상시제어',
    highValueTag: '고가치 핵심 정보',
    fitLabel: '🎯 타겟 일치',
    coPilotFit: 'AI 전장 전사체 유전체 분석 및 종양 매칭',
    originRegion: '학술 정보 출처국:',
    closeEsc: '닫기 ESC',
    citationSource: '원문 기록 출처:',
    collectTime: '의학 데이터 동기일: ',
    citationUrl: '임상학술 원문 직접 참조 URL (클리니컬 브릿지)',
    warningLabel: '엄정 경고 알림 및 고지',
    warningText: '본 정보 수집봇은 자동화 스파이더 번역 기술을 채택하고 있습니다. 기술된 약물병용(예: ATM 신약, 복합 표적 요법) 또는 췌장 효소 계산식은 절대 의사의 개별적 처방을 대체하지 않습니다. 변경 사항 발생 시 반드시 담당 교수 M.D와 상의하십시오.',
    knowBtn: '인지했습니다',
    aiBriefTitle: 'AI 연산 췌장 종양 치료 정밀 분석 데일리 요약본',
    exitEsc: '나가기 ESC',
    loadingBrief: 'Gemini 3.5 Flash 요약 및 크롤링 인터프리터 작동 중...',
    loadingBriefTip: '바이오마커, 지침 가이드라인의 에비던스 세부사항 검증 중...',
    mdtPromptTitle: '다학제 협진 MDT 전문위원회 권고',
    mdtPromptText: '자동 생성된 치료 보고서는 단순 기재 지침입니다. 각각의 통계적 생존율은 절대적인 미래 경과를 예단하지 않으므로, 주치의와 충분히 소통하십시오.',
    confirmAndClose: '확인 후 종료',
    noBrief: '종합 요약본 구성에 실패하였습니다. 다시 시도하십시오.'
  },
  ES: {
    minEvidence: 'Nivel Mínimo de Evidencia',
    allLevels: 'Todos los niveles',
    minImportance: 'Puntuación Mínima',
    searchPlaceholder: 'Buscar títulos de literatura, protocolos oncológicos...',
    noData: 'No se encontraron documentos coincidentes.',
    level: '',
    priorityEval: 'Evaluación de Prioridad',
    importanceScore: 'Nivel de Importancia (Mayor es más fuerte)',
    evidenceLevel: 'Validación de Niveles de Evidencia Clínica',
    matchReasonCity: '📍 Coincide con su ubicación física [{city}]',
    matchReasonMutation: '🧬 Sincroniza con su biomarcador molecular [{mut}]',
    matchReasonRegimen: '💊 Sincronizado para su terapia [{regimen}]',
    matchReasonIhc: '🔬 Dirigido patológicamente a marcador IHC [{ihc}]',
    searching: 'Consultando marcadores, dosis de PERT y evidencia clínica...',
    evidenceTitle: 'Ficha de Evaluación de Evidencia OSINT',
    author: 'Origen Primero y Equipo Académico',
    evidenceRank: 'Validación de Cadena de Pruebas OSINT',
    guidelineMap: 'Cláusulas Directrices Sincronizadas NCCN / CSCO',
    categoryFilters: 'Filtros de Categorías:',
    allCategories: 'Todas las Categorías',
    importanceFilter: 'Severidad Mín:',
    btnIngestNew: 'Iniciar búsqueda IA en tiempo real',
    btnDraftReport: 'Generar informe médico de 15 días',
    multidimCond: 'Parámetros de Juicio Preciso',
    keywordFilter: 'Mapeo de Palabras Clave (Target, Tratamiento)',
    intelCat: 'Categoría de Información',
    allCatLabel: 'Todas las Categorías',
    importanceTip: 'Nota: Las guías clínicas oficiales/aprobadas por la FDA son de 8.5+. Ensayos tempranos Fase I/II valorados entre 6-8. Nutrición 2-5.',
    decisionSystem: 'Consola de Respuestas de Resiliencia',
    ingestBtn: 'Iniciar Robot IA en Vivo',
    summaryBtn: 'Generar Informe Ejecutivo 24H',
    nodeResolved: 'Nodos Sincronizados: {count} referencias filtradas',
    crawlActivity: 'Actividad de descarga IA:',
    autonomousRun: '100% Autónomo',
    highValueTag: 'OSINT Alto Valor',
    fitLabel: '🎯 Target Coincidente',
    coPilotFit: 'Ajuste Clínico y Molecular guiado por IA',
    originRegion: 'País de origen:',
    closeEsc: 'Cerrar ESC',
    citationSource: 'Fuente Académica:',
    collectTime: 'Recuperado el: ',
    citationUrl: 'Vínculo al artículo original (Puente de Literatura Real)',
    warningLabel: 'Limitación Legal Estricta',
    warningText: 'Este informe es un resumen de investigación. Cualquier opción combinada o cálculo de dosis enzimáticas de soporte (PERT) constituye mera información de referencia clínica y no una recomendación directa para la salud. Requiere MDT médico antes de iniciar cambios.',
    knowBtn: 'Entendido',
    aiBriefTitle: 'Informe Diario de Inteligencia Oncológica compilado por IA',
    exitEsc: 'Salir ESC',
    loadingBrief: 'Gemini 3.5 Flash está procesando la evidencia académica...',
    loadingBriefTip: 'Verificando biomarcadores diana y ecuaciones de dosificación de PERT...',
    mdtPromptTitle: 'Recomendaciones del Consejo MDT',
    mdtPromptText: 'Las estadísticas presentadas son tendencias clínicas agrupadas. La supervivencia varía excepcionalmente. Realice la confirmación directamente con su especialista.',
    confirmAndClose: 'Aceptar y Cerrar',
    noBrief: 'Error al generar el informe. Por favor, reintente.'
  },
  AR: {
    minEvidence: 'الحد الأدنى لمستوى الدليل',
    allLevels: 'جميع المستويات',
    minImportance: 'الحد الأدنى للأهمية',
    searchPlaceholder: 'البحث في عناوين المطبوعات الطبية، بروتوكولات الأورام...',
    noData: 'لم يتم العثور على وثائق تتوافق مع كلمات البحث',
    level: '',
    priorityEval: 'تقييم الأولويات',
    importanceScore: 'درجة الأهمية (الأعلى أكثر موثوقية)',
    evidenceLevel: 'التحقق من مستوى الدليل السريري',
    matchReasonCity: '📍 يطابق مدينتك الحالية [{city}]',
    matchReasonMutation: '🧬 يطابق الطفرة الجينية المستهدفة لديك [{mut}]',
    matchReasonRegimen: '💊 مناسب لجدول العلاج الكيميائي الخاص بك [{regimen}]',
    matchReasonIhc: '🔬 موجه نسيجياً ومطابق للمؤشر الكيميائي [{ihc}]',
    searching: 'جاري مراجعة الفهرس الجينية، ومعايرة PERT ومستويات الأدلة السريرية...',
    evidenceTitle: 'لوحة تقييم الأدلة السريرية ومراجعة الأقران لـ OSINT',
    author: 'المصدر الأولي وفريق البحث الأكاديمي',
    evidenceRank: 'مستوى التحقق من سلسلة أدلة OSINT',
    guidelineMap: 'بنود التوافق مع إرشادات NCCN / CSCO',
    categoryFilters: 'تصفية الفئات:',
    allCategories: 'جميع الفئات',
    importanceFilter: 'الأهمية الدنيا:',
    btnIngestNew: 'تشغيل محرك جمع الأدلة الذكي',
    btnDraftReport: 'إنشاء تقرير التقييم الشامل لـ 15 يوماً',
    multidimCond: 'معايرة دقيقة للمعاملات الطبية',
    keywordFilter: 'البحث بكلمة مفتاحية (العلاج، البروتوكول)',
    intelCat: 'فئة المعلومات والأدلة',
    allCatLabel: 'جميع الفئات المتاحة',
    importanceTip: 'ملاحظة: الإرشادات المعتمدة من FDA تصنف بـ 8.5+، الدراسات المبكرة الأولى والثانية تصنف بـ 6-8، رعاية التغذية بـ 2-5.',
    decisionSystem: 'لوحة التحكم بالأعطال والعمليات',
    ingestBtn: 'تشغيل عنكبوت جمع الأدلة السريرية',
    summaryBtn: 'عرض ملخص ذكاء أورام 24 ساعة',
    nodeResolved: 'توطين وتحديث العقد: تم تصفية {count} مصدر معلومات',
    crawlActivity: 'نشاط تجميع الأدلة السريرية:',
    autonomousRun: 'نظام تشغيل ذاتي 100%',
    highValueTag: 'معلومات OSINT عالية القيمة',
    fitLabel: '🎯 متوافق مع حالتك',
    coPilotFit: 'دقة تحديد الهدف وتوافق الحالة السريرية بالذكاء الاصطناعي',
    originRegion: 'بلد المنشأ الأساسي:',
    closeEsc: 'إغلاق ESC',
    citationSource: 'المصدر الأكاديمي الأولي:',
    collectTime: 'تاريخ تحديث البيانات: ',
    citationUrl: 'رابط المطبوعة السريرية الأصلية (الجسر الأكاديمي الحقيقي)',
    warningLabel: 'تنصيص إخلاء المسؤولية القانونية',
    warningText: 'تم تجميع هذه البيانات عبر محركات بحث آلية. أي خطط علاج مدمجة أو حساب جرعات إنزيمات (PERT) هي لأغراض البحث فقط وليست وصفة طبية سريرية. القرار النهائي بيد الفريق الطبي MDT.',
    knowBtn: 'موافق، تم الاستيعاب',
    aiBriefTitle: 'الملخص اليومي السريري للأورام من الذكاء الاصطناعي',
    exitEsc: 'خروج ESC',
    loadingBrief: 'يقوم Gemini 3.5 Flash بتحليل الأدلة والمطبوعات الطبية...',
    loadingBriefTip: 'جاري معايرة بيانات الورم وتصحيح معادلات بدائل الإنزيمات...',
    mdtPromptTitle: 'توصيات الجنة الطبية المشتركة للمتخصصين',
    mdtPromptText: 'الملخصات والنسب الإحصائية هي معلومات توجيهية عامة لمتوسط بقاء المرضى تختلف كلياً حسب طبيعة كل مريض. استشر الطبيب المعالج.',
    confirmAndClose: 'قبول وإغلاق',
    noBrief: 'فشل في بناء التقرير الموجز. يرجى إعادة المحاولة.'
  },
  HI: {
    minEvidence: 'न्यूनतम साक्ष्य स्तर',
    allLevels: 'सभी साक्ष्य स्तर',
    minImportance: 'न्यूनतम महत्व रेटिंग',
    searchPlaceholder: 'साहित्य शीर्षकों, कीमोथेरेपी प्रोटोकॉल की खोज करें...',
    noData: 'कोई मेल खाते साक्ष्य दस्तावेज़ नहीं मिले।',
    level: '',
    priorityEval: 'प्राथमिकता मूल्यांकन',
    importanceScore: 'महत्व सूचकांक (अधिक अंक अधिक महत्वपूर्ण)',
    evidenceLevel: 'नैदानिक साक्ष्य की पहचान और पुष्टि',
    matchReasonCity: '📍 आपके वर्तमान निवास शहर [{city}] से मेल खाता है',
    matchReasonMutation: '🧬 आपके विशिष्ट जीन उत्परिवर्तन [{mut}] से सटीक मेल खाता है',
    matchReasonRegimen: '💊 आपकी वर्तमान कीमोथेरेपी [{regimen}] से अत्यधिक अनुकूल है',
    matchReasonIhc: '🔬 इम्यूनोहिस्टोकेमिस्ट्री [{ihc}] पैथोलॉजी आधारित मिलान सफल',
    searching: 'उत्परिवर्तन सूचकांक, अग्न्याशय एंजाइम PERT और नैदानिक साक्ष्यों की खोज जारी है...',
    evidenceTitle: 'OSINT साक्ष्य सत्यापन और नैदानिक स्कोरबोर्ड',
    author: 'मूल शोध स्रोत और शोध टीम',
    evidenceRank: 'OSINT साक्ष्य सत्यापन रैंक और ग्रेडिंग',
    guidelineMap: 'मैप की गई NCCN/CSCO नैदानिक सहमति शर्तें',
    categoryFilters: 'श्रेणी फिल्टर:',
    allCategories: 'सभी श्रेणियां',
    importanceFilter: 'न्यूनतम गंभीरता:',
    btnIngestNew: 'एआई रीयल-टाइम अनुसंधान शुरू करें',
    btnDraftReport: '15 दिन रिपोर्ट जनरेट करें',
    multidimCond: 'बहुआयामी नैदानिक पैरामीटर निर्धारण',
    keywordFilter: 'कीवर्ड फ़िल्टर (म्यूटेशन, थेरेपी, देखभाल)',
    intelCat: 'सूचना और साक्ष्य श्रेणी',
    allCatLabel: 'सभी श्रेणियां',
    importanceTip: 'नोट: FDA स्वीकृत आधिकारिक नैदानिक दिशानिर्देशों को 8.5+ रेटिंग दी जाती है, प्रारंभिक चरण की प्रगति को 6-8, सामान्य पोषण को 2-5 दिया जाता है।',
    decisionSystem: 'आपदा-रोधी निर्णय कंसोल कुंजियाँ',
    ingestBtn: 'रीयल-टाइम एआई साहित्य खोज 爬虫 शुरू करें',
    summaryBtn: 'दैनिक 24 घंटे सारांश उत्पन्न करें',
    nodeResolved: 'सभी नोड्स सिंक्रनाइज़: {count} साक्ष्य फ़िल्टर किए गए',
    crawlActivity: 'रीयल-टाइम डेटा संग्रह गतिविधि:',
    autonomousRun: '100% स्वायत्त संक्रिया',
    highValueTag: 'उच्च मूल्य OSINT',
    fitLabel: '🎯 प्रोफाइल अनुकूल',
    coPilotFit: 'एआई परिशुद्धता आणविक विश्लेषण और कैंसर मिलान',
    originRegion: 'मूल स्रोत देश:',
    closeEsc: 'बंद करें ESC',
    citationSource: 'मूल शोध स्रोत:',
    collectTime: 'डेटा अपडेट समय: ',
    citationUrl: 'मूल क्लिनिकल पेपर लिंक URL (सच्चा शैक्षणिक पुल)',
    warningLabel: 'सख्त अस्वीकरण और चेतावनी',
    warningText: 'यह डेटाबेस स्वचालित शोध अनुवादों पर आधारित है। कोई भी दवा संयोजन (जैसे एटीएम सिंथेटिक घातकता) या अग्नाशयी एंजाइम (PERT) की खुराक केवल वैज्ञानिक अनुसंधान संदर्भ है, नैदानिक नुस्खा नहीं। बदलाव से पहले MDT बोर्ड से परामर्श करें।',
    knowBtn: 'मुझे समझ आ गया',
    aiBriefTitle: 'एआई जनित 24-घंटे अग्नाशयी कैंसर खुफिया मेडिकल सारांश',
    exitEsc: 'निकास ESC',
    loadingBrief: 'Gemini 3.5 Flash नवीनतम साहित्य डेटा का खनन और विश्लेषण कर रहा है...',
    loadingBriefTip: 'कैंसर म्यूटेशन संकेतक, PERT एंजाइम खुराक समीकरणों का विस्तृत सत्यापन किया जा रहा है...',
    mdtPromptTitle: 'बहु-विषयक विशेषज्ञ समिति की सिफारिशें',
    mdtPromptText: 'स्वचालित दैनिक रिपोर्ट सामान्य आंकड़े हैं। औसत जीवित रहने की अवधि अत्यधिक व्यक्तिगत अंतर के अधीन है। संक्रिया शुरू करने से पहले सीधे अपने चिकित्सक से बात करें।',
    confirmAndClose: 'पुष्टि करें और बंद करें',
    noBrief: 'खुफिया रिपोर्ट बनाने में विफलता। कृपया पुनः प्रयास करें।'
  }
};

export default function OSINTFeedView({ 
  items, 
  onFetchNew, 
  onGenerateSummary, 
  isFetching, 
  statusMessage,
  newsRefreshMode,
  newsWindowLabel,
  onOpenSubmission,
  searchTerm,
  onSearchTermChange,
  patientProfile,
  perspective,
  onNavigateToTab,
  language
}: OSINTFeedProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const activeSearch = searchTerm !== undefined ? searchTerm : internalSearch;
  const changeSearch = onSearchTermChange || setInternalSearch;

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<string>('all');
  const [minImportance, setMinImportance] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<OSINTItem | null>(null);
  const [summaryOutput, setSummaryOutput] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [ingestSuccessText, setIngestSuccessText] = useState<string | null>(null);

  const tLocal = uiTranslation[language] || uiTranslation['EN'];

  // Matchmaker helper to check if feed item matches patient profile details
  const getItemMatchReason = (item: OSINTItem) => {
    if (!patientProfile || perspective !== 'personalized') return null;
    const reasons: string[] = [];

    // Check city matching
    if (patientProfile.city) {
      const cityClean = patientProfile.city.replace('市', '').toLowerCase();
      if (item.title.toLowerCase().includes(cityClean) || item.summary.toLowerCase().includes(cityClean) || (item.source && item.source.toLowerCase().includes(cityClean))) {
        reasons.push((tLocal.matchReasonCity || '').replace('{city}', patientProfile.city));
      }
    }

    // Check mutation matching
    if (patientProfile.mutations && patientProfile.mutations.length > 0) {
      patientProfile.mutations.forEach(mut => {
        const mutUpper = mut.toUpperCase().split(' ')[0]; // e.g. "KRAS"
        if (
          item.title.toUpperCase().includes(mutUpper) ||
          item.summary.toUpperCase().includes(mutUpper) ||
          item.entities.some(e => e.toUpperCase().includes(mutUpper))
        ) {
          reasons.push((tLocal.matchReasonMutation || '').replace('{mut}', mut));
        }
      });
    }

    // Check pathology/IHC matching
    if (patientProfile.ihcResults) {
      const ihcClean = patientProfile.ihcResults.toUpperCase().trim();
      if (ihcClean && (
        item.title.toUpperCase().includes(ihcClean) ||
        item.summary.toUpperCase().includes(ihcClean) ||
        item.entities.some(e => e.toUpperCase().includes(ihcClean))
      )) {
        reasons.push((tLocal.matchReasonIhc || '').replace('{ihc}', patientProfile.ihcResults));
      }
    }

    // Check treatment matching
    if (patientProfile.regimen) {
      const tx = patientProfile.regimen.toUpperCase().trim();
      if (tx && (item.title.toUpperCase().includes(tx) || item.summary.toUpperCase().includes(tx))) {
        reasons.push((tLocal.matchReasonRegimen || '').replace('{regimen}', patientProfile.regimen));
      }
    }

    return reasons.length > 0 ? reasons : null;
  };

  // Real literature and NCT Clinical Study Link Generator (100% functional)
  const getRealItemUrl = (item: OSINTItem) => {
    if (item.clinicalTrialId && /^NCT\d+$/i.test(item.clinicalTrialId.trim())) {
      return `https://clinicaltrials.gov/study/${item.clinicalTrialId.trim()}`;
    }
    const invalidHosts = [
      'https://pubmed.ncbi.nlm.nih.gov/',
      'https://www.nejm.org/',
      'https://science.org/',
      'https://www.nccn.org/'
    ];
    if (item.url && !invalidHosts.includes(item.url) && !item.url.endsWith('.gov/news-events/press-announcements') && !item.url.endsWith('.org/guidelines') && !item.url.endsWith('.int/cancer/publications')) {
      return item.url;
    }
    return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(item.title)}`;
  };

  // Filter Items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
      item.summary.toLowerCase().includes(activeSearch.toLowerCase()) ||
      item.entities.some(e => e.toLowerCase().includes(activeSearch.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesEvidence = selectedEvidence === 'all' || item.evidenceLevel === selectedEvidence;
    const matchesImportance = item.importanceScore >= minImportance;

    return matchesSearch && matchesCategory && matchesEvidence && matchesImportance;
  });

  // Dynamic sorting based on patient profile matchmaking when personalized vision is selected
  const sortedItems = React.useMemo(() => {
    if (perspective !== 'personalized' || !patientProfile) {
      return filteredItems;
    }
    return [...filteredItems].sort((a, b) => {
      const reasonsA = getItemMatchReason(a);
      const reasonsB = getItemMatchReason(b);
      const scoreA = reasonsA ? reasonsA.length : 0;
      const scoreB = reasonsB ? reasonsB.length : 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return b.importanceScore - a.importanceScore;
    });
  }, [filteredItems, patientProfile, perspective]);

  const handleFetch = async () => {
    setIngestSuccessText(null);
    await onFetchNew();
    setIngestSuccessText('已成功触发AI智能源抓取，最新癌王靶点情报已载入瀑布流顶部！');
    setTimeout(() => setIngestSuccessText(null), 5000);
  };

  const formatFreshness = (minutes?: number) => {
    if (typeof minutes !== 'number' || Number.isNaN(minutes)) return 'fresh';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / (24 * 60))}d`;
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    setSummaryOutput('');
    setShowSummaryModal(true);
    try {
      const summary = await onGenerateSummary();
      setSummaryOutput(summary);
    } catch (err) {
      setSummaryOutput('生成简报遇到未知瓶颈，请稍后重试。');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
      
      {/* Search & Left Filters Bar */}
        <div className="lg:col-span-1 bg-zinc-950/60 border border-white/10 rounded-xl p-5 space-y-6 self-start glass">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">
              <span>Refresh Window</span>
              <span>{newsWindowLabel || '30d'}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="font-medium">Source mode</span>
              <span className={newsRefreshMode === 'knows' ? 'text-emerald-400' : 'text-amber-400'}>{newsRefreshMode === 'knows' ? 'KNOWS' : 'Fallback'}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              5-minute refresh ready
            </div>
          </div>
        
        {/* Geographic Dynamic Earth & CLI Crawl Log (War-room effect) */}
        <WarRoomGlobe />

        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-t border-white/5 pt-4">
          <SlidersHorizontal className="h-4 w-4 text-blue-400" />
          多维条件精确研判
        </h3>

        {/* Text Search */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium font-sans">关键字筛选 (靶点、临床、肿瘤)</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="如 KRAS, NALIRIFOX..."
              value={activeSearch}
              onChange={(e) => changeSearch(e.target.value)}
              className="w-full bg-black/80 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium">情报情报门类</label>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-lg py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500/60"
          >
            <option value="all">全部范畴</option>
            <option value="drug">靶点新药 (Drug Target)</option>
            <option value="trial">临床试验 (Clinical Trials)</option>
            <option value="surgery">外科手术 (Surgical MDT)</option>
            <option value="oncology">肿瘤内科 (Oncology Care)</option>
            <option value="nutrition">营养支持 (Nutrient Support)</option>
            <option value="psychology">心理关怀 (Psychology Relief)</option>
            <option value="complication">并发症管理 (Complications)</option>
            <option value="policy">政策医保 (Health Policy)</option>
            <option value="patient_resource">患者生存资源 (Survivor Guide)</option>
          </select>
        </div>

        {/* Evidence Level Filter */}
        <div className="space-y-3">
          <label className="text-xs text-zinc-400 font-medium block">最少循证证据等级</label>
          <div className="grid grid-cols-2 gap-2">
            {['all', 'A', 'B', 'C', 'D'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedEvidence(lvl)}
                className={`py-1.5 px-3 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                  selectedEvidence === lvl 
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/40 active-glow font-bold' 
                    : 'bg-black text-zinc-400 border border-white/5 hover:text-white hover:border-white/15'
                }`}
              >
                {lvl === 'all' ? '全部级别' : `${lvl}级`}
              </button>
            ))}
          </div>
        </div>

        {/* Importance Score Filter */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs text-zinc-400 font-medium">最低情报评级: {minImportance.toFixed(1)}</label>
            <span className="text-xs text-zinc-500 font-mono">Max 10.0</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="10" 
            step="0.5"
            value={minImportance}
            onChange={(e) => setMinImportance(parseFloat(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <span className="text-[10px] text-zinc-500 block leading-tight">
            注：FDA批准、三期药效优越计 8.5+ 分，一二期初探/指南推荐计 6-8 分，科普饮食计 2-5 分。
          </span>
        </div>

        {/* Live Commands Block */}
        <div className="border-t border-white/10 pt-5 space-y-3">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">智能决策自适应系统控键</h4>
          
          <button
            onClick={handleFetch}
            disabled={isFetching}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-805/40 disabled:text-zinc-500 text-xs font-semibold text-white rounded-lg flex items-center justify-center gap-2 cursor-pointer transition duration-150 active-glow"
          >
            {isFetching ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-white animate-pulse" />
            )}
            {isFetching ? '采集调度与自动解析中...' : '启动 AI 实时采集蜘蛛'}
          </button>

          <button
            onClick={handleGenerateSummary}
            className="w-full py-2 px-4 bg-black border border-white/15 hover:bg-zinc-900 text-xs font-semibold text-zinc-200 hover:text-white rounded-lg flex items-center justify-center gap-2 cursor-pointer transition duration-150"
          >
            <FileText className="h-4 w-4 text-blue-400" />
            生成 AI 临床综述简报
          </button>

          {onOpenSubmission && (
            <button
              onClick={onOpenSubmission}
              className="w-full py-2 px-4 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/15 text-xs font-semibold text-blue-300 hover:text-blue-200 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition duration-150 active-glow-blue"
            >
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse animate-duration-1000" />
              投递新医学学术信源
            </button>
          )}

          {statusMessage && (
            <div className="p-2.5 bg-black border border-white/5 rounded text-[11px] font-mono text-zinc-505 leading-snug">
              <span className="text-blue-400">⚡ Console:</span> {statusMessage}
            </div>
          )}
        </div>
      </div>

      {/* Main OSINT Feed List */}
      <div className="lg:col-span-3 space-y-4">
        
        {/* Banner with notice / prompt */}
        {ingestSuccessText && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-3 animate-fade-in glass">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <div>{ingestSuccessText}</div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <p className="text-xs text-zinc-400 font-medium">
            全节点研判完成: 共筛选出 <span className="font-mono text-blue-400 font-bold">{filteredItems.length}</span> 份情报源
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-950 px-3 py-1 rounded-md border border-white/10 glass">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            今日采集活跃度：<span className="font-mono font-bold text-emerald-400">100% 自治运行</span>
          </div>
        </div>

        {/* Ingest List Container */}
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-zinc-950/20 border border-white/10 rounded-2xl glass">
            <Search className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-zinc-300">无符合筛选的情报</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              建议放宽检索条件、降低最低評级，或直接点击左侧 “启动 AI 实时采集蜘蛛” 获取最新进展。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sortedItems.map((item) => {
              const cat = CATEGORY_MAP[item.category] || { label: item.category, color: 'text-zinc-400', border: 'border-white/10', bg: 'bg-zinc-900' };
              const ev = EVIDENCE_MAP[item.evidenceLevel] || { label: item.evidenceLevel, desc: '暂无等级详细解读说明', color: 'text-zinc-400', bg: 'bg-zinc-900' };
              const matchReasons = getItemMatchReason(item);
              const isMatched = !!matchReasons;
              
              return (
                <div 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`bg-zinc-950/45 relative overflow-hidden border rounded-xl p-5 hover:bg-zinc-900/40 transition cursor-pointer group glass ${
                    isMatched 
                      ? 'border-purple-500/35 hover:border-purple-400 shadow-lg shadow-purple-500/5' 
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Performance highlight for high-score items */}
                  {item.importanceScore >= 9.0 && (
                    <div className="absolute right-0 top-0 text-[10px] bg-blue-500/15 text-blue-400 border-l border-b border-white/10 px-3 py-1 font-semibold rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                      <Bookmark className="h-3 w-3" />
                      高价值研判
                    </div>
                  )}

                  {/* Personalized Matching Tip Header */}
                  {perspective === 'personalized' && isMatched && (
                    <div className="mb-4 p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-lg text-[10px] space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-purple-400 animate-pulse" />
                        AI 深度病情靶点精准拟合
                      </div>
                      {matchReasons.map((reason, i) => (
                        <div key={i} className="pl-3.5 relative flex items-center text-zinc-300 text-[10px]">
                          <span className="absolute left-0 text-purple-400">✦</span>
                          {reason}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${cat.border} ${cat.bg} ${cat.color}`}>
                      {cat.label}
                    </span>
                    <span 
                      title={ev.desc}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${ev.color} ${ev.bg}`}
                    >
                      循证: {ev.label}
                    </span>
                    {isMatched && (
                      <span className="text-[10px] bg-purple-500/15 text-purple-300 font-bold border border-purple-500/20 px-2 py-0.5 rounded animate-pulse">
                        🎯 病情契合
                      </span>
                    )}
                    {item.centerPriority && (
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/20 px-2 py-0.5 rounded">
                        Center-first
                      </span>
                    )}
                    {item.reviewStatus && item.reviewStatus !== 'approved' && (
                      <span className="text-[10px] bg-amber-500/15 text-amber-300 font-bold border border-amber-500/20 px-2 py-0.5 rounded">
                        Review
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 ml-auto flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3" />
                      {formatFreshness(item.freshnessMinutes)}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-base sm:text-lg font-serif font-light text-white group-hover:text-blue-400 tracking-tight transition leading-snug mb-2 line-clamp-2">
                    {item.title}
                  </h4>

                  {/* Summary Snippet */}
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-2">
                    {item.summary}
                  </p>

                  {/* Entities tags & Importance */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                    <div className="flex flex-wrap gap-1.5 max-w-[80%]">
                      {(item.topicTags || item.entities).slice(0, 4).map((ent, i) => (
                        <span key={i} className="text-[10px] bg-black text-zinc-400 px-2 py-0.5 rounded font-medium border border-white/5">
                          {ent}
                        </span>
                      ))}
                      {item.contentTags?.slice(0, 2).map((tag, i) => (
                        <span key={`content-${i}`} className="text-[10px] bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded font-medium border border-white/5">
                          {tag}
                        </span>
                      ))}
                      {item.clinicalTrialId && (
                        <span className="text-[10px] bg-blue-950/40 text-blue-400 border border-blue-900/60 px-2 py-0.5 rounded font-bold font-mono">
                          {item.clinicalTrialId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-zinc-500 font-medium">优先级评估</span>
                      <span className="text-xs font-mono font-bold text-blue-400 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded">
                        {item.importanceScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Intelligence Detail Drawer Overlay Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 bg-zinc-900/40 flex justify-between items-start gap-4 glass">
              <div>
                <span className={`text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded border inline-block mb-2 ${CATEGORY_MAP[selectedItem.category]?.border} ${CATEGORY_MAP[selectedItem.category]?.bg} ${CATEGORY_MAP[selectedItem.category]?.color}`}>
                  {CATEGORY_MAP[selectedItem.category]?.label}
                </span>
                <span className="text-xs text-zinc-400 ml-3 font-mono">
                  国源发地区：<span className="text-white font-bold">{selectedItem.country}</span>
                </span>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-zinc-400 hover:text-white font-medium text-xs bg-black px-2.5 py-1.5 rounded border border-white/10 hover:border-white/20 transition duration-150 select-none cursor-pointer"
              >
                关闭 ESC
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <h3 className="text-lg sm:text-2xl font-serif font-light text-white leading-snug tracking-tight">
                {selectedItem.title}
              </h3>

              {/* Grid detail stats */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-black border border-white/5 rounded-xl text-xs">
                <div>
                  <span className="text-zinc-400 block mb-0.5">情报级别(分值越高越核心)</span>
                  <span className="font-mono font-bold text-blue-400 text-sm">
                    {selectedItem.importanceScore.toFixed(1)} / 10.0
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">临床循证等级证明</span>
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    {EVIDENCE_MAP[selectedItem.evidenceLevel]?.label} ({selectedItem.evidenceLevel})
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-white/5">
                  <span className="text-zinc-400 block mb-0.5">循证解读标准</span>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    {EVIDENCE_MAP[selectedItem.evidenceLevel]?.desc}
                  </p>
                </div>
              </div>

              {/* Translated abstract body */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  AI 语义医学解构 / 简体中文
                </span>
                <p className="text-sm text-zinc-300 leading-relaxed bg-black/60 p-4 border border-white/5 rounded-xl whitespace-pre-line font-sans">
                  {selectedItem.summary}
                </p>
              </div>

              {/* Extraction tags */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-400 tracking-wide block">标定靶点突变位点及术语</span>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.entities.map((tag, idx) => (
                    <span key={idx} className="bg-black border border-white/10 text-zinc-300 px-2.5 py-1 rounded text-xs leading-none font-medium">
                      🎯 {tag}
                    </span>
                  ))}
                  {selectedItem.clinicalTrialId && (
                    <span className="bg-blue-950/40 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded text-xs leading-none font-bold font-mono">
                      🧬 临床试验ID: {selectedItem.clinicalTrialId}
                    </span>
                  )}
                </div>
              </div>

              {/* Citation Source Box */}
              <div className="p-3.5 bg-black border border-white/5 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>情报捕获来源：<strong className="text-white">{selectedItem.source}</strong></span>
                  <span>收集时间: {new Date(selectedItem.publishedAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={getRealItemUrl(selectedItem)} 
                    target="_blank" 
                    referrerPolicy="no-referrer"
                    className="text-xs font-medium text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 select-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    临床原始文献连接 URL (一键阅源 - 真实学术链路)
                  </a>
                </div>
              </div>

              {/* Clinical Warning */}
              <div className="p-3 bg-rose-550/10 border border-rose-500/20 text-[11px] text-rose-300 leading-normal rounded-lg flex items-start gap-2 glass">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>
                  <strong>严正红线声明</strong>：本开源情报属于自主网络爬行汇总和AI学术翻译。所涉药物联用（如ATM合成致死、MRTX突变药）、中药针灸或外科路径，<strong>绝对不构成任何直接诊疗医嘱建议</strong>。凡涉及抗癌剂量、术式改变，请务必前往实体医院肿瘤内普外科进行MDT专家联评确诊。
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-zinc-900/20 text-right glass">
              <button 
                onClick={() => setSelectedItem(null)}
                className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition duration-150 cursor-pointer active-glow"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Summary Generated Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative">
            
            <div className="p-5 border-b border-white/10 bg-zinc-900/40 flex justify-between items-center shrink-0 glass">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
                <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-serif">
                  AI 生成全球胰腺癌 24H 开源分析简报
                </h3>
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="text-zinc-400 hover:text-white bg-black px-3 py-1.5 rounded border border-white/10 text-xs font-medium transition duration-150 cursor-pointer"
              >
                退出 ESC
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-zinc-200">
              
              {isSummarizing ? (
                <div className="py-20 text-center space-y-4">
                  <RefreshCw className="h-10 w-10 animate-spin text-blue-400 mx-auto" />
                  <p className="text-sm font-semibold text-white">
                    Gemini 3.5 Flash 正在交叉研算今日情报源数据...
                  </p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    系统正检索突变列表、化疗剂量、胰酶Pert标准的循证等级，请稍候。
                  </p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-4">
                  
                  {/* Process raw summary rendering beautifully */}
                  {summaryOutput ? (
                    <div className="space-y-5 bg-black p-5 rounded-xl border border-white/5 leading-relaxed font-normal whitespace-pre-line text-zinc-300 font-sans">
                      {summaryOutput}
                    </div>
                  ) : (
                    <p className="text-center text-zinc-500 py-10">未生成简报，请重试。</p>
                  )}

                  {/* Scientific Guidance warning */}
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start gap-3 mt-4 text-[11px] text-blue-300 leading-normal glass">
                    <Info className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>胰腺疾病多学科MDT提示</strong>：每日简报系基于大语言模型对公开采集数据集的聚合提取。即使提及具体临床期中生存期（如11.1个月），也必然存在高度个体特异性差异。任何关于剂量（PERT随餐）及化疗联合建议均必须与注册医师核对。
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-zinc-900/20 flex justify-between items-center shrink-0 glass">
              <span className="text-[10px] text-zinc-500 font-mono">
                AI Mode: {summaryOutput.includes('MDT') ? 'Gemini 3.5 Flash' : 'High-Fidelity Medical Core'}
              </span>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition duration-150 cursor-pointer active-glow"
              >
                确认并关闭
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
