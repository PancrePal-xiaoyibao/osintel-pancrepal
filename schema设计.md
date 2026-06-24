# 胰腺癌全球开源情报自主追踪与服务中心 (Pancreas OSINT) 数据库 Schema 设计

本系统采用 **Google Cloud Firestore (Enterprise Edition)** 作为持久化云端数据库。在系统设计中，通过明确的实体关系（ER）与严格的字段定义，补齐了医疗机构、前沿学术情报及患者脱敏健康画像的数据库存储与分类需求。

## 1. 核心集合 (Core Collections)

### 1.1 医疗机构资源中心 (`resource_centers`)
用于存储全球知名胰腺癌诊疗、研究与支持性机构。去除了对文本模糊嗅探关键字的依赖，增加了显式的分类标记字段 `explicitCategory`。

*   **路径**：`/resource_centers/{id}`
*   **数据模型 (Schema)**:
    ```typescript
    interface ResourceCenter {
      id: string;              // 唯一标示 ID (例如 "res-sh-fudan-tumor")
      name: string;            // 机构名称
      country: string;         // 国家及省市 (格式 "中国 (上海, China)")
      latitude: number;        // 地理坐标纬度，高精度浮点数
      longitude: number;       // 地理坐标经度，高精度浮点数
      specialties: string[];    // 核心医学特色/专长列表
      leadDoctors?: string[];  // 显式领衔专家/院士/教授名单
      type?: "clinical_center" | "research_hub" | "patient_guide"; // 机构学术底座类型
      explicitCategory: "treatment" | "complication" | "psychology" | "nutrition"; // 👈 显式硬编码分类字段
      description: string;     // 机构多维度深度诊疗实力描绘
      contact: string;         // 就诊卡挂号 ID、微信号或官方电子邮箱
      survivorResources?: string[]; // 该机构特供给病患的居家自救/营养配比攻略
    }
    ```

### 1.2 开源学术情报列表 (`osint_items`)
存储多源采集聚合的胰腺癌临床、突变及药物理论。

*   **路径**：`/osint_items/{id}`
*   **数据模型 (Schema)**:
    ```typescript
    interface OSINTItem {
      id: string;              // 唯一标识 ID (例如 "osint-1")
      title: string;           // 情报标题 (学术论文/行业审批/指南公告)
      url: string;             // 国际权威来源原文 URL 链接
      source: string;          // 采集数据源名称 (例如 "The Lancet Oncology")
      publishedAt: string;     // 情报发布时间 UTC 格式
      country: string;         // 所属国家或地区
      category: "drug" | "trial" | "surgery" | "nutrition" | "psychology" | "policy" | "patient_resource"; // 学术类型
      entities: string[];      // 识别出的核心突变靶点、药物或临床分期
      importanceScore: number; // 科学重要度权重评分 (0.0 - 10.0，在 UI 显式展示)
      summary: string;         // 经大模型学术翻译、病患无损转化的 Simplified Chinese 摘要
      evidenceLevel: "A" | "B" | "C" | "D"; // 牛津循证医学证据评级级
      clinicalTrialId?: string; // (可选) 国际临床注册试验注册号 (例如 "NCT04083235")
      clickable?: boolean;     // UI 是否可穿透查看详情
    }
    ```

### 1.3 患者分子脱敏档案 (`patient_profiles`)
与 Firebase Authentication 高度隔离的患者无损基因与临床症状特征映射表。

*   **路径**：`/patient_profiles/{uid}`
*   **数据模型 (Schema)**:
    ```typescript
    interface PatientProfile {
      uid: string;            // 关联 Firebase Auth 用户的 UID
      city: string;           // 所处就医流转城市 (例如 "上海")
      mutations: string[];    // 携带的基因靶向突变列表 (如 ["KRAS G12D", "ATM deficiency"])
      ihcResults: string;     // IHC 临床免疫组化显性表达
      regimen: string;        // 正在接受的化化疗/靶点方案 (如 "FOLFIRINOX")
      efficacy: string;       // 耐受状态评估 (如 "稳定 / 偶尔副反应")
      summary: string;        // 汇总注释
      lastUpdated: string;    // 最后同步时间戳
    }
    ```

---

## 2. 安全过滤规则 (Hardened Firestore Rules)

数据库实施 Zero-Trust 零信任防护规则（完整定义写入 `firestore.rules`中）：
1.  **公共只读权限**：`resource_centers` 与 `osint_items` 为全域公开只读 (`allow read: if true;`)，只有经过双重验证的系统管理级凭证能进行创建与更新修改。
2.  **PII 隐私强隔离**：`patient_profiles` 的 `read`, `write` 操作强制实施 `uid` 拥有者一致性拦截 (`allow read, write: if request.auth != null && request.auth.uid == uid;`)，杜绝匿名及平行越权的数据探针。
