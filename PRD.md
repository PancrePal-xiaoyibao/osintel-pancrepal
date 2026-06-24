# Product Requirement Document (PRD) - Pancreatic Cancer OSINT Intelligence Hub (胰腺癌 OSINT 情报中心)

## 1. 产品愿景与定位 (Product Vision & Positioning)
本系统名 “Pancreatic Cancer OSINT Intelligence Hub” (胰腺癌全球开源情报自主追踪与服务中心)。
- **核心定位**：全天候自主采集、多源去重聚合、AI语义翻译、精准实体提取、风险权重打分，提供具备“自治、自修、自我评估、可一键复制部署”特征的开源抗癌情报神经元节点。
- **免责声明限制**：所有AI加工摘要必须与原文对照，且在UI显著位置标明“不作为直接临床诊断及治疗参考意见”。

---

## 2. 核心功能需求 (Functional Requirements)

### 2.1 24H 多源自主采集引擎 (Autonomous Ingestion Engine)
- **新闻源 (News)**: 精准追踪 Google News 转化流、各大医院/研究所新闻稿、ASCO/ESMO/AACR 学会公告。
- **临床试验 (Clinical Trials)**: 追踪国际和地区注册中心（ClinicalTrials.gov、EU Clinical Trials、jRCT 等）。
- **学术文献 (Publications)**: 追踪 PubMed、bioRxiv、medRxiv 每日新增。
- **患者资源与支持 (Support Resources)**: 收集权威专科中心（外科 MDT、营养支持、疼痛调节、心理援助）发布的权威指导材料。

### 2.2 智能 AI 分析与标签提取器 (AI Processing & Entity Tagger)
由 Gemini 3.5 Flash 驱动，对采集的情报流执行以下加工：
- **学术翻译与中文无损表达**：多语言（英/日/德等）学术专有名词精准对齐翻译。
- **突变与靶点识别 (Mutation/Target tagging)**：提取靶点信息（如 KRAS WT, KRAS G12D, ATM, ATR, GNAS, BRCA1/2 等）。
- **重要度打分 (Importance Scoring)**：0.0 - 10.0。
  - FDA/EMA 审评与批准：9.0 - 10.0
  - 临床三期阳性结果：8.0 - 9.0
  - 新临床招募或一二期结果：6.0 - 8.0
  - 患者基础营养科普/中心活动：2.0 - 5.0
- **证据级别分析 (Evidence Grade)**：
  - A 级：多中心随机对照（MCT）/ 国际金标准
  - B 级：前瞻性单臂研究 / 知名指南
  - C 级：回顾性分析 / 预印文献
  - D 级：个案报告 / 科普观点

### 2.3 互动式可视化情报中心 (Visual Intelligence Dashboard)
- **时间轮盘与状态监测 (Live OSINT Feed)**：提供按时间、证据级别、特殊靶点筛选的情报瀑布流，支持查看原文。
- **资源地图导航 (Interactive Pancreatic Resources Map)**：显示全球知名胰腺癌诊疗中心、研究中枢、优秀外科 MDT 的空间分布，带有生存资源包和导航。
- **每日情报摘要 (Daily AI Summary Briefing)**：合并当天极高价值的情报，形成精简、面向患者及临床科研人员的决策导向摘要。

### 2.4 守护进程与自治监控 (Watchdog & Autonomic Monitoring)
自维护管理控制台，模拟并可视化展示本系统的自治流程：
- **5分钟健康自检（Health Checker）**：检查源可用率、网络通路、数据库、API状态。
- **自动修复引擎（Auto-Repair Sandbox）**：当遇到解析器选择器失效、API 连接重试、超限流频等问题时，自动生成修复快照或降级方案。
- **每 15 天自治评估（Evaluation Bot）**：周期生成升级与修复计划，支持版本回滚与去中心化部署方案的下载。

---

## 3. 技术栈与架构设计 (Technological & Architecture Design)

### 3.1 架构层次
1. **Frontend (Presentation)**: React (SPA mounted on Express Server) using Vite, Tailwind CSS, and Lucide icons for responsive presentation.
2. **Backend (Core Express Server)**: Express custom server managing routes, acting as proxy to keep Gemini API Key strictly hidden.
3. **Database Layer (Virtual Memory)**: File-based/Memory persistent engine mapping historical data, allowing simulation of real-time OSINT fetching, with custom seeds for fully immersive realism.
4. **Agent Layer**: Built with `@google/genai` (utilizing `'gemini-3.5-flash'`) on the backend for fast entity taxonomy tagging, semantic translation, and auto-scoring.

### 3.2 环境变量定义
```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"
```

---

## 4. 自治生命体演化评估 (Autonomous System Evaluation)
1. **0 - 15 天**：实现单节点 100% 独立生存运行，通过 Health Check 检测网络、API 限额、数据抓取故障。
2. **15 - 30 天**：边缘副本配置支持，多镜像节点，热重部署，一键 Docker 化。
3. **30天以上**：去中心化去联邦共识上链（IPFS 快照、Cloudflare Worker 边缘缓存映射）。
