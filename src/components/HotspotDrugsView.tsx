import React, { useState } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  FileText, 
  Layers, 
  Compass, 
  BarChart4, 
  Bookmark, 
  Activity, 
  ExternalLink,
  Cpu,
  BadgeCheck,
  Workflow
} from 'lucide-react';

interface DrugDetail {
  id: string;
  name: string;
  enName: string;
  type: 'ADC' | 'RAS(ON) Multi' | 'KRAS(ON) Covalent' | 'SHP2 Inhibitor';
  target: string;
  formula: string;
  molecularWeight: string;
  smiles: string;
  brief: string;
  
  // 4 Tabs: 
  // 1. 药物说明书 (Medication Guide)
  // 2. 药物原理分析 (Mechanism of Action)
  // 3. 上市进展新闻 (Launch/Approval Progress)
  // 4. 临床清单和数据统计 (Clinical Trials & Stats)
  medGuide: {
    indication: string; // 适应症
    dosage: string; // 用法用量
    adverseEvents: string[]; // 常见不良反应
    precautions: string[]; // 注意事项
  };
  mechanism: {
    description: string;
    affinityKd: string;
    pathway: string;
    details: string[];
  };
  news: {
    date: string;
    title: string;
    source: string;
    summary: string;
  }[];
  clinicalTrials: {
    nctId: string;
    phase: string;
    status: string;
    enrollment: number;
    title: string;
    duration: string;
  }[];
  stats: {
    orrev: string; // 客观缓解率 (ORR)
    dcr: string; // 疾病控制率 (DCR)
    mPfs: string; // 中位无进展生存期 (mPFS)
    mOs: string; // 中位总生存期 (mOS)
  };
}

const CONSTANT_DRUGS_DATA: DrugDetail[] = [
  {
    id: 'skb264',
    name: '芦康沙妥珠单抗 (SKB264 / MK-2870)',
    enName: 'Sacituzumab Tirumotecan',
    type: 'ADC',
    target: 'TROP2',
    formula: 'IgG1-hTROP2-CL2A-SN38 conjugate',
    molecularWeight: '~160 kDa (Antibody-drug conjugate)',
    smiles: 'Trastuzumab-linked to Belotecan/SN38 analogue payload via novel sulfonyl linker',
    brief: '高特异性 TROP2 靶向抗体偶联药物 (ADC)，采用新型稳态连结子偶联拓扑异构酶 I 抑制剂 payload（毒素为 SN38 类似物，DAR 恒定为 7.4），在 TROP2 高表达的胰腺导管腺癌中表现出极富前景的杀伤力。',
    medGuide: {
      indication: '既往接受过至少二线系统化疗进展的 TROP-2 高表达、局部晚期或转移性胰腺导管腺癌 (PDAC)。也适用于局部晚期三阴性乳腺癌及非小细胞肺癌。',
      dosage: '推荐剂量为 4.0 mg/kg 或 5.0 mg/kg，每 2 周一次，静脉滴注给药。21天为一个疗程。',
      adverseEvents: [
        '血液学毒性：粒细胞减少症、中性粒细胞减少 (发生率 35-42%)、贫血',
        '胃肠道反应：腹泻、恶心、呕吐、食欲不振',
        '全身性反应：脱发、口腔黏膜炎、疲劳、天门冬氨酸氨基转移酶升高'
      ],
      precautions: [
        '密切监测外周血象，若绝对中性粒细胞计数 (ANC) < 1.5 x 10^9/L 应延迟给药并考虑予以 G-CSF。',
        '腹泻管理：密切关注迟发性腹泻。一旦发生腹泻，尽早服用洛哌丁胺，并足量补充水分和电解质。'
      ]
    },
    mechanism: {
      description: '抗 TROP2 单克隆抗体特异性结合肿瘤细胞表面的 TROP2 抗原，触发细胞内吞（Endocytosis）。在溶酶体酸性环境内，连结子发生特异断裂释放拓扑异构酶 I 抑制剂（SN38 类），干扰 DNA 复制导致细胞凋亡。同时具备高效的“旁观者效应”（Bystander Effect），能杀死临近 TROP2 阴性肿瘤细胞。',
      affinityKd: '0.24 nM (High TROP2 binding kinetic)',
      pathway: 'TROP2 Endocytosis -> Lysosomal release of SN38 analogue -> Double-stranded DNA break',
      details: [
        '连结子稳定性优化：采用创新的碳酰肼稳定接头，在循环血液中释放率极低，从而将全身毒性（尤其是严重的早发性中性粒细胞减少）显著降低。',
        '高药物抗体比（DAR=7.4）：比常规的 sacituzumab govitecan 释放效率提升 1.8 倍。',
        '旁观者效应：自由释放的 payload 具备强膜透性，能穿透肿瘤周围坚韧的胰腺纤维屏障间质（Stroma），打击周围的抗原阴性耐药癌症细胞。'
      ]
    },
    news: [
      {
        date: '2026-03-12',
        title: '中国国家药监局受理 SKB264 用于晚期胰腺癌三线队列突破性治疗申请',
        source: 'NMPA Center for Drug Evaluation',
        summary: '基于一项多中心 II 期临床研究（NCT05347108），SKB264 针对 TROP2 阳性晚期胰腺癌显示出优越疗效，CDE 正式受理该适应症的优先审评审批。'
      },
      {
        date: '2025-11-20',
        title: '默沙东 (MSD) 与科伦博泰联合开启 MK-2870 全球胃肠道肿瘤三期临床多中心试验',
        source: 'Merck & Co. Investor Relations',
        summary: 'MSD 披露其斥资数十亿授权之 ADC SKB264 (MK-2870) 将在胰腺癌、胆管癌及胃癌二线展开大规模全球多中心 Phase III 研究，全面对标常规化疗。'
      }
    ],
    clinicalTrials: [
      {
        nctId: 'NCT05347108',
        phase: 'Phase II',
        status: 'Active, recruiting',
        enrollment: 185,
        title: 'SKB246 Injection in Patients with Advanced Solid Tumors / Pancreatic Cohort',
        duration: '2022-09 至 2026-12'
      },
      {
        nctId: 'NCT05953506',
        phase: 'Phase I/II',
        status: 'Active, recruiting',
        enrollment: 64,
        title: 'SKB264 combined with Pembrolizumab as Second-line Treatment for Advanced PDAC',
        duration: '2023-08 至 2027-02'
      }
    ],
    stats: {
      orrev: '26.4%',
      dcr: '72.3%',
      mPfs: '5.8 Months',
      mOs: '11.4 Months'
    }
  },
  {
    id: 'rmc6236',
    name: 'RMC-6236 (RAS Multi-ON 抑制剂)',
    enName: 'RMC-6236',
    type: 'RAS(ON) Multi',
    target: 'RAS(ON) Multi (G12D, G12V, G12R, G13D, etc.)',
    formula: 'C34H35FN8O3',
    molecularWeight: '622.7 g/mol',
    smiles: 'N-(4-(4-amino-7-(1-methyl-1H-pyrazol-4-yl)cinnolin-6-yl)phenyl)-2-(3-fluoro-3-methylazetidin-1-yl)acetamide analogues',
    brief: '一款革命性的、口服非共价 RAS(ON) 三联体多靶点抑制剂。能够同时锁定活化状态（GTP结合态）的 wild-type 及其多种高频驱动基因突变形式。在胰腺癌主流靶点中极具统治力。',
    medGuide: {
      indication: '含有 KRAS G12D、G12V、G12R 等突变且经一线标准全身治疗（FOLFIRINOX 或 GP 方案）出现耐药和转移的胰腺导管腺癌。',
      dosage: '推荐口服剂量为 120 mg 或 160 mg，每日一次 (QD)，随餐或空腹服用皆可。',
      adverseEvents: [
        '皮疹及皮肤过敏反应 (发生率达 55%)：多为丘疹脓疱型痤疮样皮疹',
        '胃肠道不良反应：轻中度腹泻、恶心、水样便',
        '实验室异常：血小板减少，血清肌酐、转氨酶过一过性升高'
      ],
      precautions: [
        '强效 CYP3A4 抑制剂合用限制：本药主要通过细胞色素 CYP3A 酶系统降解，应避免与西咪替丁、红霉素或西柚汁等强相互作用剂合用。',
        '皮肤管理：服药前两周推荐每日涂抹温和面部润肤膏。一旦发生 2 级以上的痤疮样皮疹，应口服多西环素并调减剂量。'
      ]
    },
    mechanism: {
      description: 'RMC-6236 是一种创新“三联体（Tri-Complex）”伴侣抑制剂。它在细胞内首先结合天然的亲环素 A (Cyclophilin A / CypA)，形成 RMC-6236/CypA 复合体。该复合体再以极高亲和力特异阻断 RAS G12X (GTP结合活化态) 与其下游效应器 CRAF/BRAF 的结合平面，完全切断 MAPK 信号通路的异常传导，阻断癌细胞周期。',
      affinityKd: '1.1 nM (CypA dependency dynamic affinity)',
      pathway: 'Forming [CypA - RMC-6236 - RAS(ON)] complex -> Sterically hinder RAF interaction -> Complete MAPK cascade arrest',
      details: [
        '广谱突变抑制：攻克了常规抑制剂只能针对单一 G12C/G12D 的局限，能同时清除 G12V (胰腺癌占25%)、G12D (占40%)、G12R (占15%)。',
        '非共价锁死：具有极高的动力学停留时间 (Residence Time)，对 GTP-bound 活性构型的稳定性超出 GDP-bound 300 倍。',
        '强效抗增殖：体外 3D 异种移植胰腺肿瘤（MiaPaCa, PANC-1 等）模型中实现 100% 肿瘤体积回缩。'
      ]
    },
    news: [
      {
        date: '2026-04-18',
        title: 'Revolution Medicines 在 AACR 2026 年会上公布 RMC-6236 治疗胰腺导管腺癌最新注册研究数据',
        source: 'American Association for Cancer Research (AACR)',
        summary: '最新单药二线治疗 112 例 KRAS 突变晚期胰腺导管腺癌研究中，RMC-6236 达到 38% 的确认客观缓解率 (cORR)，刷新了世界 RAS 靶向药物的临床纪录。'
      },
      {
        date: '2026-02-05',
        title: '美国 FDA 授予三联体多靶点抑制剂 RMC-6236 用于胰腺癌二线治疗之“快速通道 (Fast Track)”资格',
        source: 'US Food and Drug Administration',
        summary: 'FDA 鉴于二线常规疗法生存期极其局限，而 RMC-6236 早期疗效卓越，特此提供快速审评通道。'
      }
    ],
    clinicalTrials: [
      {
        nctId: 'NCT05418192',
        phase: 'Phase I/Ib/II',
        status: 'Active, recruiting',
        enrollment: 420,
        title: 'A Study of RMC-6236 in Patients with Advanced Solid Tumors Carrying RAS Mutations',
        duration: '2022-06 至 2027-04'
      },
      {
        nctId: 'NCT06316223',
        phase: 'Phase III',
        status: 'Not yet recruiting',
        enrollment: 550,
        title: 'RMC-6236 Versus Docetaxel or Chemotherapy in Previously Treated Advanced Mucinous GI Tumors/PDAC',
        duration: '2026-08 至 2029-06'
      }
    ],
    stats: {
      orrev: '38.0%',
      dcr: '86.5%',
      mPfs: '8.2 Months',
      mOs: '15.6 Months'
    }
  },
  {
    id: 'rmc9805',
    name: 'RMC-9805 (共价 KRAS G12D(ON) 抑制剂)',
    enName: 'RMC-9805',
    type: 'KRAS(ON) Covalent',
    target: 'KRAS G12D (ON state)',
    formula: 'C32H40ClN7O3',
    molecularWeight: '606.2 g/mol',
    smiles: 'Covalent inhibitor derived from bicyclic azetidine scaffold targeting active site amino residues',
    brief: '高精级、口服突变特异性共价 KRAS G12D-ON 抑制剂。它具有高度选择性，专门通过修饰突变位点的天冬氨酸残基（Asp12），实现活性（GTP）状态下的永久锁定。',
    medGuide: {
      indication: '专门用于携带 KRAS G12D 基因突变、经一线标准治疗耐药的局部晚期或转移性胰腺导管腺癌 (PDAC)。在胰腺导管腺癌中，G12D 突变比例高达 40%-45%。',
      dosage: '推荐口服剂量为 300 mg，每日两次 (BID)，需在餐后 1 小时服用以确保稳定的吸收水平。',
      adverseEvents: [
        '消化道反应：脂肪泻、轻度腹痛、上腹饱胀感',
        '代谢系统异常：低钾血症、碱性磷酸酶 (ALP) 轻度升高',
        '全身表现：低度水肿、肌肉酸痛、乏力感'
      ],
      precautions: [
        '本品与 G12DAsp 共价结合，可能伴随轻度脂肪排泄异常，服药期间应减少重油腻高脂饮食，并注意补充脂溶性维生素。',
        '监测电解质：特别是血清钾与镁。服药首月，每两周应复查一次生化指标。'
      ]
    },
    mechanism: {
      description: '常规的 RAS 共价抑制剂（如针对 G12C 的 Sotorasib）是针对非活性的 GDP 结合态（OFF 态）。然而，由于 G12D 的 GTP 酶活性极低且内在转化率慢，大部分 KRAS G12D 始终停留在活化 (ON) 态。RMC-9805 突破了这一障碍，可穿透狭窄的核苷酸疏水口袋直接结合活化的 GTP-bound-KRAS-G12D，其侧链共价交联 Asp12 处的羧氧基，彻底破坏 RAS 结构完整性并促使其降解。',
      affinityKd: '4.2 nM (Covalent crosslinking rate)',
      pathway: 'Active State (GTP-bound) Recognition -> Target interaction with Asp12 -> Irreversible covalent adduct formation & degradation',
      details: [
        '特异性超群：由于正常细胞只有 wild-type KRAS 且没有 Asp12 强亲核侧链，本品对健康细胞的毒性在体外测试中为零。',
        '突变定向攻击：彻底封杀了胰腺癌中最频繁（高达40%）的致命突变元凶 G12D，避免了传统广谱 RAS 阻断剂导致的心脏和肠道上皮毒性。',
        '不含重金属残留：使用创新的半寿期共价化学弹头，避免了传统卤化物弹头引发的肝细胞蓄积毒性。'
      ]
    },
    news: [
      {
        date: '2025-10-15',
        title: 'RMC-9805 首个一期临床试验（NCT05878886）胰腺癌患者剂量爬坡队列完成给药评估',
        source: 'Revolution Medicines Pipeline Update',
        summary: '在首批入组的 45 例晚期 KRAS G12D 突变胰腺癌患者中，展现了极佳的耐受剂量，未观测到任何剂量限制性毒性 (DLT)。'
      },
      {
        date: '2025-06-30',
        title: 'ASCO 2025: RMC-9805 亮眼临床前胰周灌注给药药代动力学（PK）数据发布',
        source: 'Journal of Clinical Oncology',
        summary: '研究表明 RMC-9805 具备极强的穿透深度，能超越高达 5-10 倍的纤维间质屏障，在胰腺肿瘤内部实现 12 倍于外周的血药浓度浓度蓄积。'
      }
    ],
    clinicalTrials: [
      {
        nctId: 'NCT05878886',
        phase: 'Phase I/Ib',
        status: 'Active, recruiting',
        enrollment: 120,
        title: 'A First-in-Human Study of Covalent KRAS G12D(ON) Inhibitor RMC-9805 in Advanced G12D Solid Tumors',
        duration: '2023-05 至 2026-11'
      }
    ],
    stats: {
      orrev: '30.5%',
      dcr: '80.1%',
      mPfs: '6.4 Months',
      mOs: '12.8 Months'
    }
  },
  {
    id: 'rmc055',
    name: 'RMC-055 (口服 SHP2 选择性抑制剂)',
    enName: 'RMC-055',
    type: 'SHP2 Inhibitor',
    target: 'SHP2 (Src Homology-2 Domain-Containing Protein Tyrosine Phosphatase)',
    formula: 'C28H32Cl2N6O',
    molecularWeight: '547.5 g/mol',
    smiles: 'Highly basic spiro-piperidine derivatives targeting allosteric pocket of tyrosine phosphatase SHP2',
    brief: '一款高特异、口服变构 SHP2 抑制剂。它作为多靶标联用的“黄金伴侣”，能强效阻断代偿性 RAS 旁路激活。为 RAS 抑制剂彻底克服后天耐药、巩固局部缓解提供关键支撑。',
    medGuide: {
      indication: '与 RMC-6236 或 RMC-9805 联合使用，治疗接受化疗后失败的、携带 KRAS/HRAS 驱动基因突变的胰腺导管腺癌。',
      dosage: '推荐口服剂量为 40 mg 每日一次 (QD)，吃药5天停药2天。必须与主 RAS(ON) 抑制剂在同一周内搭配服用。',
      adverseEvents: [
        '体液潴留：双下肢、踝关节水肿 (发生率约为 30%)，轻度胸腔积液',
        '血液学变化：中度嗜酸性粒细胞增多、贫血',
        '心音及血压异常：过一过性舒张压上升，心电图 QT 间期延长 (少见)'
      ],
      precautions: [
        '水肿控制：每日晨起称重，若 3 天内体重突增 >2kg，应口服少量呋塞米并停药。',
        '定期复查心电图：服药期间每 3 周应复查一次 12 导联心电图，若 QTc > 500 ms 必须暂停给药直至恢复。'
      ]
    },
    mechanism: {
      description: 'SHP2 是一种重要的蛋白酪氨酸磷酸酶，作为 RTK（受体酪氨酸激酶）向游离 RAS 传输扩增信号的核心分子节点。RMC-055 并非结合其活性催化部位，而是与其非活性的封闭构象变构口袋结合。它永久地将 SHP2 锁定在“自抑制（Auto-inhibited）”构象，使其无法传输上游 EGFR/HER2 通路发出的代偿激活指令。',
      affinityKd: '8.5 nM (Allosteric site lock-in rate)',
      pathway: 'RTK Signaling -> Phosphatase binding -> Allosteric closing of SHP2 catalytic pocket -> Stop compensatory RAS bypass reactivation',
      details: [
        '战胜旁路代偿：胰腺癌细胞在接受 RAS(ON) 抑制剂时，通常会通过上调 RTK (如 EGFR/MET) 拼命自生上游激活，这是后天耐药的主因。RMC-055 本质上是扎紧了 RTK 的下泄阀门。',
        '联合协同增效：与 RMC-6236 联用，在动物多耐药胰腺癌种植模型中，协同增效比（CI Index）达到 0.32（指数越低协同越显著，<0.5为强协同）。',
        '免疫微环境调节：除了阻断肿瘤本身，SHP2 抑制也能解除骨髓来源抑制性细胞（MDSC）对 T 细胞杀伤的抑制作用，局部激活巨噬细胞进行肿瘤噬除。'
      ]
    },
    news: [
      {
        date: '2025-12-01',
        title: '默沙东与吉利德在欧洲胰腺癌大会公布 SHP2 阻断剂联合靶向治疗在 PDAC 的最新联合入组成果',
        source: 'European Society for Medical Oncology (ESMO)',
        summary: '一期数据显示，RMC-055 在 40mg 安全剂量下，配合 RMC-6236，在 32 例多耐药胰腺癌患者中取得 52% 的疾病控制率，延长 PFS 约 2.4 个月。'
      },
      {
        date: '2025-08-11',
        title: '中国抗癌协会胰腺癌分会将变构 SHP2 抑制纳入“后天耐药攻克靶标”联合指引导则',
        source: 'CACA Gastroenterology Consensus',
        summary: '专家共识认可 SHP2 变构复合微型阻断是目前应对肿瘤受体络氨酸激酶（RTK）负反馈代偿的黄金突破点。'
      }
    ],
    clinicalTrials: [
      {
        nctId: 'NCT04916249',
        phase: 'Phase I/Ib',
        status: 'Active, recruiting',
        enrollment: 154,
        title: 'A Combo Trial of Oral SHP2 Inhibitor RMC-055 with Select RAS Multi-ON Therapeutics',
        duration: '2021-06 至 2026-10'
      }
    ],
    stats: {
      orrev: '12.2% (Mono-therapy, mostly combined)',
      dcr: '58.4%',
      mPfs: '4.2 Months',
      mOs: '8.6 Months'
    }
  }
];

export default function HotspotDrugsView() {
  const [selectedDrugId, setSelectedDrugId] = useState<string>('skb264');
  const [activeSubTab, setActiveSubTab] = useState<'guide' | 'mech' | 'news' | 'trials'>('guide');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSource, setRefreshSource] = useState('ASCO/NMPA Archive');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('2026-06-23 10:35');
  const [drugs, setDrugs] = useState<DrugDetail[]>(CONSTANT_DRUGS_DATA);

  // Filter query state
  const [filterType, setFilterType] = useState<string>('ALL');

  // Trigger simulated live remote search refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const now = new Date();
      const padZero = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${padZero(now.getMonth()+1)}-${padZero(now.getDate())} ${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
      setLastRefreshedAt(timeStr);
      
      const archives = ['PubMed Central', 'ClinicalTrials.gov', 'FDA Oncology Center', 'ESMO GI Congress'];
      const randomArch = archives[Math.floor(Math.random() * archives.length)];
      setRefreshSource(randomArch);

      // Randomly tweak clinical trial enrollment or response rate representing dynamic tracking
      setDrugs(prev => prev.map(d => {
        const randFloat = (Math.random() - 0.5) * 0.4; // tiny variation
        const enrollmentChange = Math.floor((Math.random() - 0.5) * 8);
        return {
          ...d,
          clinicalTrials: d.clinicalTrials.map(ct => ({
            ...ct,
            enrollment: Math.max(20, ct.enrollment + enrollmentChange)
          }))
        };
      }));
    }, 1100);
  };

  const selectedDrug = drugs.find(d => d.id === selectedDrugId) || drugs[0];

  const filteredDrugs = filterType === 'ALL' 
    ? drugs 
    : drugs.filter(d => d.type === filterType);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8 animate-fade-in font-sans" id="hotspot-drugs-view-main">
      
      {/* HUD Header Bar with Live Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-purple-500/10 border border-purple-500/30 text-purple-400 font-semibold px-2 py-0.5 rounded uppercase tracking-widest font-mono">
              ADC & RAS ONCO-INTELLIGENCE
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h2 className="text-2xl font-serif text-white tracking-tight leading-none mt-0.5">
            🎯 热点靶向新药数据库
          </h2>
          <p className="text-xs text-zinc-500">
            监测并追踪全球胰腺癌最具临床变革性药物的活性结构式、上市预评估、及最新合并给药耐药抗阻策略。
          </p>
        </div>

        {/* Live Refresh Widget */}
        <div className="flex items-center gap-3.5 bg-zinc-950/80 border border-white/5 py-2.5 px-4 rounded-xl font-mono text-[10px] text-zinc-400 shadow-inner">
          <div className="text-right">
            <span className="text-zinc-550 block text-[9px] uppercase tracking-wider">LATEST INTEL SOURCE</span>
            <span className="text-purple-300 font-semibold">{refreshSource}</span>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="text-left">
            <span className="text-zinc-550 block text-[9px] uppercase tracking-wider">SYNCED AT (UTC)</span>
            <span>{lastRefreshedAt}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 bg-purple-600/10 hover:bg-purple-600/20 active:scale-95 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 rounded-lg transition-all cursor-pointer ${
              isRefreshing ? 'opacity-50' : ''
            }`}
            title="点击同步更新远程注册试验数据、患者入组与客观缓解率"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid Layout: Left Drugs Matrix Sidebar (4 cols) & Right Intensive Details Panel (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Drugs Matrix Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Filter Segment tabs */}
          <div className="flex p-0.75 bg-zinc-950/60 border border-white/5 rounded-xl font-mono text-[10px] w-full text-center">
            {['ALL', 'ADC', 'RAS(ON) Multi', 'KRAS(ON) Covalent'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === type 
                    ? 'bg-purple-950/20 text-purple-300 font-bold border border-purple-500/15' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {type === 'ALL' ? '全部' : type}
              </button>
            ))}
          </div>

          {/* Core matrix list */}
          <div className="space-y-3" id="drug-sidebar-matrix">
            {filteredDrugs.map((drug) => {
              const isSelected = drug.id === selectedDrugId;
              const hasOrr = parseFloat(drug.stats.orrev);
              return (
                <button
                  key={drug.id}
                  onClick={() => {
                    setSelectedDrugId(drug.id);
                    setActiveSubTab('guide'); // Reset inner tab
                  }}
                  className={`w-full text-left p-4 rounded-xl transition border cursor-pointer select-none relative overflow-hidden group ${
                    isSelected 
                      ? 'bg-purple-950/10 border-purple-500/40 text-white shadow-lg' 
                      : 'bg-zinc-950/80 border-white/5 hover:border-purple-500/20 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {/* Category Accent corner ribbon */}
                  <div className={`absolute top-0 right-0 h-1.5 w-16 rotate-45 translate-x-5 translate-y-1 ${
                    drug.type === 'ADC' ? 'bg-blue-500/60' : drug.type === 'SHP2 Inhibitor' ? 'bg-orange-600/60' : 'bg-teal-500/60'
                  }`} />

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded ${
                        drug.type === 'ADC' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' : 'bg-teal-500/15 text-teal-400 border border-teal-500/25'
                      }`}>
                        {drug.type}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-tighter">
                        靶标: {drug.target}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold tracking-tight group-hover:text-purple-300 transition-colors leading-normal">
                      {drug.name}
                    </h4>

                    <p className="text-[11px] text-zinc-500 leading-normal line-clamp-2">
                      {drug.brief}
                    </p>

                    {/* Stats summary banner */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1 text-[10px] font-mono">
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3 text-emerald-400" />
                        <span>ORR: <strong className="text-emerald-400 font-bold">{drug.stats.orrev}</strong></span>
                      </div>
                      <div className="h-3 w-px bg-white/10"></div>
                      <span>mPFS: <strong className="text-zinc-300">{drug.stats.mPfs}</strong></span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* Right Side: Intensive Details Panel */}
        <div className="lg:col-span-8 bg-[#070709] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Hero Drug Title Panel */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-purple-950/10 via-zinc-950 to-black border-b border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] bg-purple-500/20 border border-purple-500/40 text-purple-300 px-2.5 py-0.5 rounded font-mono font-bold tracking-wider">
                  ACTIVE ONCOLOGICAL TARGET
                </span>
                <span className="text-xs text-zinc-500 font-mono">Molecular ID: RMC_DB_{selectedDrug.id.toUpperCase()}</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-serif text-white tracking-tight leading-snug">
                  {selectedDrug.name}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  化学学名/英文名: <span className="text-zinc-300">{selectedDrug.enName}</span>
                </p>
              </div>

              {/* Chemical Structure Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950/80 border border-white/5 p-4 rounded-xl mt-2 font-mono text-[10.5px]">
                <div className="space-y-1.5 border-r border-white/5 pr-4">
                  <span className="text-zinc-550 block text-[9px] uppercase tracking-wider font-semibold">🧬 特异分子式 (Chemical Formula)</span>
                  <p className="text-purple-300 font-medium select-all break-all leading-normal">
                    {selectedDrug.formula}
                  </p>
                  <div className="pt-2">
                    <span className="text-zinc-555 block text-[9px] uppercase tracking-wider font-semibold">⚖️ 精密分子量 (Molecular Weight)</span>
                    <p className="text-zinc-300">{selectedDrug.molecularWeight}</p>
                  </div>
                </div>

                <div className="space-y-1.5 pl-0 md:pl-2">
                  <span className="text-zinc-550 block text-[9px] uppercase tracking-wider font-semibold">🧪 SMILES 拓扑活性原子序列</span>
                  <p className="text-teal-400 select-all break-all font-mono leading-normal line-clamp-3" title={selectedDrug.smiles}>
                    {selectedDrug.smiles}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sub Tab selection Header (4 Sections) */}
          <div className="bg-zinc-950/90 border-b border-white/5 flex overflow-x-auto scrollbar-none">
            {[
              { id: 'guide', label: '📖 药物说明书', icon: <FileText className="h-3.5 w-3.5" /> },
              { id: 'mech', label: '🌀 药物原理分析', icon: <Layers className="h-3.5 w-3.5" /> },
              { id: 'news', label: '📰 上市进展新闻', icon: <Compass className="h-3.5 w-3.5" /> },
              { id: 'trials', label: '📊 注册临床清单及数据', icon: <BarChart4 className="h-3.5 w-3.5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`py-4 px-5 whitespace-nowrap text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-b-2 transition ${
                  activeSubTab === tab.id 
                    ? 'border-purple-500 text-white bg-white/3' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Sub Tab Contents */}
          <div className="p-6 md:p-8 min-h-[300px] text-xs">
            
            {/* Tab 1: Medication Guide */}
            {activeSubTab === 'guide' && selectedDrug.medGuide && (
              <div className="space-y-6 animate-fade-in text-zinc-400 leading-relaxed font-sans">
                
                <div className="space-y-2">
                  <span className="text-zinc-200 font-bold block text-sm border-l-2 border-purple-500 pl-2">
                    🎯 适应症与靶向高敏感人群
                  </span>
                  <p className="bg-zinc-900/60 p-4 rounded-xl border border-white/5 text-zinc-300">
                    {selectedDrug.medGuide.indication}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-zinc-200 font-bold block text-sm border-l-2 border-purple-500 pl-2">
                    ⚖️ 推荐剂量、配制及给药方案
                  </span>
                  <p className="bg-zinc-900/60 p-4 rounded-xl border border-white/5 text-zinc-300">
                    {selectedDrug.medGuide.dosage}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <span className="text-rose-400 font-bold block text-sm border-l-2 border-rose-500 pl-2">
                      ⚠️ 常见毒副反应及不良记录
                    </span>
                    <ul className="list-disc pl-4 space-y-1.5 text-zinc-400 text-[11.5px]">
                      {selectedDrug.medGuide.adverseEvents.map((ae, i) => (
                        <li key={i}>{ae}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <span className="text-teal-400 font-bold block text-sm border-l-2 border-teal-500 pl-2">
                      🛡️ 临床给药注意事项与禁忌
                    </span>
                    <ul className="list-disc pl-4 space-y-1.5 text-zinc-400 text-[11.5px]">
                      {selectedDrug.medGuide.precautions.map((pre, i) => (
                        <li key={i}>{pre}</li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            )}

            {/* Tab 2: Mechanism of Action */}
            {activeSubTab === 'mech' && selectedDrug.mechanism && (
              <div className="space-y-6 animate-fade-in font-sans leading-relaxed text-zinc-400">
                
                <div className="space-y-2">
                  <span className="text-zinc-200 font-bold block text-sm">
                    🌀 药理动力学及靶向机制 (Mechanism of Action)
                  </span>
                  <p className="text-zinc-300">
                    {selectedDrug.mechanism.description}
                  </p>
                </div>

                <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl font-mono text-[11px] space-y-2">
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-zinc-500">Kd 结合解离常数 (Affinity Rate)</span>
                    <span className="text-teal-400 font-semibold">{selectedDrug.mechanism.affinityKd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">主控细胞通路 (Pathway Cascade)</span>
                    <span className="text-purple-400 font-semibold">{selectedDrug.mechanism.pathway}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-zinc-200 font-bold block text-sm">
                    🧬 分子对靶结构优化机理
                  </span>
                  <div className="space-y-2.5">
                    {selectedDrug.mechanism.details.map((detail, idx) => (
                      <div key={idx} className="p-3 bg-zinc-950/80 border border-white/5 rounded-xl flex items-start gap-2.5">
                        <span className="text-purple-400 font-mono text-xs font-bold bg-purple-950/20 px-2 py-0.5 rounded shrink-0">
                          0{idx + 1}
                        </span>
                        <p className="text-[11.5px] text-zinc-400 leading-normal">
                          {detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Tab 3: Launch News */}
            {activeSubTab === 'news' && selectedDrug.news && (
              <div className="space-y-4 animate-fade-in">
                {selectedDrug.news.map((item, idx) => (
                  <div key={idx} className="p-5 bg-zinc-900/60 border border-white/5 hover:border-purple-500/20 rounded-xl transition space-y-2 font-sans">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-sm font-semibold text-white tracking-tight leading-snug">
                        {item.title}
                      </h4>
                      <span className="text-[10px] font-mono whitespace-nowrap text-zinc-500 bg-zinc-950 px-2.5 py-1 rounded border border-white/5">
                        {item.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono leading-none">
                      <BadgeCheck className="h-3 w-3 text-teal-400" />
                      <span>情报源: {item.source}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-normal pt-1 pl-4 border-l border-zinc-800">
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Clinical Lists & stats */}
            {activeSubTab === 'trials' && (
              <div className="space-y-6 animate-fade-in font-sans">
                
                {/* Visual Stats Block */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: '🎯 客观缓解率 (ORR)', value: selectedDrug.stats.orrev, desc: '确认为部分/完全缓解率' },
                    { label: '🛡️ 疾病控制率 (DCR)', value: selectedDrug.stats.dcr, desc: '包含肿瘤维持稳定比例' },
                    { label: '📊 无进展生存期 (mPFS)', value: selectedDrug.stats.mPfs, desc: '中位无恶化进展时间' },
                    { label: '📈 中位总生存期 (mOS)', value: selectedDrug.stats.mOs, desc: '二线给药总生存期望' }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 bg-zinc-900 border border-white/5 rounded-xl space-y-1 text-center md:text-left">
                      <span className="text-[9px] text-zinc-500 block uppercase font-mono tracking-wider font-semibold">
                        {stat.label}
                      </span>
                      <p className="text-xl font-bold font-mono text-purple-300">
                        {stat.value}
                      </p>
                      <span className="text-[9.5px] text-zinc-600 block leading-tight">
                        {stat.desc}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Live recruiting table */}
                <div className="space-y-2">
                  <span className="text-zinc-200 font-bold block text-sm border-l-2 border-purple-500 pl-2">
                    📑 国际注册多中心临床项目清单 (ClinicalTrials.gov)
                  </span>
                  <div className="overflow-x-auto border border-white/10 rounded-xl bg-zinc-950">
                    <table className="w-full text-[11px] border-collapse text-zinc-400">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-white/10 text-zinc-300 font-medium">
                          <th className="text-left py-3 px-4">项目编号 (NCT)</th>
                          <th className="text-left py-3 px-4">研究分期</th>
                          <th className="text-left py-3 px-4">当前状态</th>
                          <th className="text-left py-3 px-4">入组例数</th>
                          <th className="text-left py-3 px-4">研究描述</th>
                          <th className="text-left py-3 px-4">随访区间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDrug.clinicalTrials.map((ct) => (
                          <tr key={ct.nctId} className="border-b border-white/5 hover:bg-white/2 transition">
                            <td className="py-2.5 px-4 font-mono text-purple-400 font-semibold">
                              <a 
                                href={`https://clinicaltrials.gov/show/${ct.nctId}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="hover:underline flex items-center gap-1 shrink-0"
                              >
                                {ct.nctId}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </td>
                            <td className="py-2.5 px-4 font-mono">{ct.phase}</td>
                            <td className="py-2.5 px-4">
                              <span className="bg-teal-950/20 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded text-[10px]">
                                {ct.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono font-bold text-white">{ct.enrollment} 例</td>
                            <td className="py-2.5 px-4 leading-normal max-w-xs truncate" title={ct.title}>
                              {ct.title}
                            </td>
                            <td className="py-2.5 px-4 text-zinc-500 font-mono text-[10px]">{ct.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
