# Centers API Reference

> Base: `http://localhost:3000/api/centers`  
> All responses use envelope: `{ status: 'ok' | 'error', data: ..., ...meta }`

---

## Hospitals

### GET /api/centers/hospitals

列表查询，支持筛选/排序/分页。

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `city` | string | - | 城市精确匹配 |
| `province` | string | - | 省份精确匹配 |
| `country` | string | - | 国家精确匹配 |
| `hospitalLevel` | string | - | 等级: `3A`, `3B`, `2A`, `2B`, `international`, `unknown` |
| `hospitalType` | string | - | 类型: `general`, `cancer_center`, `specialized`, `university` |
| `sortBy` | string | `qualityScore` | 排序字段: `name`, `qualityScore`, `pancreaticAnnualSurgeries`, `updatedAt` |
| `order` | string | `desc` | 排序方向: `asc`, `desc` |
| `limit` | number | 50 | 每页数量 |
| `offset` | number | 0 | 偏移量 |

**Response:**

```json
{
  "status": "ok",
  "data": [
    {
      "id": "hosp-bj-xiehe",
      "name": "北京协和医院",
      "shortName": "协和医院",
      "city": "北京",
      "province": "北京",
      "country": "中国",
      "latitude": 39.91,
      "longitude": 116.41,
      "hospitalLevel": "3A",
      "hospitalType": "general",
      "accreditedBy": ["JCI"],
      "pancreaticAnnualSurgeries": 600,
      "hasMDT": true,
      "mdtSchedule": "周三 MDT 绿道（协和 App 预约）",
      "contact": "pumch_hospital",
      "website": "...",
      "sourceUrls": ["https://www.pumch.cn/"],
      "dataQuality": "public",
      "qualityScore": 96,
      "verifiedAt": "...",
      "updatedAt": "2025-07-30T00:00:00.000Z"
    }
  ],
  "total": 24,
  "offset": 0,
  "limit": 50
}
```

### GET /api/centers/hospitals/:id

获取单个医院详情。

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | 医院 ID，如 `hosp-bj-xiehe` |

**Response:** `{ "status": "ok", "data": { CenterHospital } }`  
**404:** `{ "status": "error", "message": "Hospital not found" }`

### POST /api/centers/hospitals

创建或更新医院（upsert，按 id 匹配）。

**Request Body:** `CenterHospital` 对象，`id` 和 `name` 必填。

```json
{
  "id": "hosp-new-hospital",
  "name": "新医院名称",
  "city": "上海",
  "province": "上海",
  "country": "中国",
  "latitude": 31.2,
  "longitude": 121.5,
  "hospitalLevel": "3A",
  "hospitalType": "general",
  "hasMDT": true,
  "sourceUrls": [],
  "dataQuality": "unverified",
  "qualityScore": 0,
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Response:** `{ "status": "ok", "data": { ...hospital } }`  
**400:** `{ "status": "error", "message": "id and name are required" }`

### PUT /api/centers/hospitals/:id

更新指定医院的部分字段。

**Request Body:** `Partial<CenterHospital>` — 仅传需要更新的字段。

**Response:** `{ "status": "ok", "data": { ...updated } }`  
**404:** `{ "status": "error", "message": "Hospital not found" }`

---

## Doctors

### GET /api/centers/doctors

列表查询，支持按医院、专长、职称筛选。

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `hospitalId` | string | - | 关联医院 ID（如 `hosp-bj-xiehe`） |
| `specialty` | string | - | 专长关键词匹配 |
| `title` | string | - | 职称精确匹配 |
| `sortBy` | string | `qualityScore` | 排序字段: `name`, `qualityScore`, `patientVolume`, `updatedAt` |
| `order` | string | `desc` | 排序方向 |
| `limit` | number | 50 | 每页数量 |
| `offset` | number | 0 | 偏移量 |

**Response:**

```json
{
  "status": "ok",
  "data": [
    {
      "id": "doc-bj-zhaoyupei",
      "name": "赵玉沛",
      "title": "教授/主任医师",
      "hospitalIds": ["hosp-bj-xiehe"],
      "departmentName": "基本外科",
      "specialties": ["胰腺癌综合诊治", "胰岛素瘤诊治", "疑难罕见疾病MDT"],
      "academicTitle": "院士",
      "academicOrg": "中国工程院院士，国际胰腺学会前主席",
      "sourceUrls": ["https://www.pumch.cn/"],
      "dataQuality": "public",
      "qualityScore": 98,
      "updatedAt": "2025-07-30T00:00:00.000Z"
    }
  ],
  "total": 22,
  "offset": 0,
  "limit": 50
}
```

### GET /api/centers/doctors/:id

获取单个医生详情。

**404:** `{ "status": "error", "message": "Doctor not found" }`

### POST /api/centers/doctors

创建或更新医生（upsert）。`id` 和 `name` 必填。

### PUT /api/centers/doctors/:id

更新指定医生。`id` 不可变更。

---

## Services

### GET /api/centers/services

列表查询，支持按医院、类别、可及性筛选。

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `hospitalId` | string | - | 关联医院 ID |
| `category` | string | - | 服务类别: `surgery`, `chemotherapy`, `radiotherapy`, `intervention`, `nutrition`, `psychology`, `rehabilitation`, `palliative`, `clinical_trial`, `genetic_testing` |
| `availability` | string | - | 可及性: `immediate`, `within_week`, `within_month`, `queue_long`, `unknown` |
| `sortBy` | string | `qualityScore` | 排序字段 |
| `order` | string | `desc` | 排序方向 |
| `limit` | number | 50 | 每页数量 |
| `offset` | number | 0 | 偏移量 |

**Response:**

```json
{
  "status": "ok",
  "data": [
    {
      "id": "svc-bj-xiehe-insulinoma",
      "name": "胰岛素瘤等神经内分泌肿瘤诊治",
      "description": "赵玉沛院士团队，亚洲最大宗胰岛素瘤诊治中心（600余例）",
      "category": "surgery",
      "hospitalId": "hosp-bj-xiehe",
      "departmentName": "基本外科",
      "availability": "within_month",
      "insuranceCoverage": ["北京医保"],
      "sourceUrls": ["https://www.pumch.cn/"],
      "dataQuality": "public",
      "qualityScore": 95,
      "updatedAt": "2025-07-30T00:00:00.000Z"
    }
  ],
  "total": 17,
  "offset": 0,
  "limit": 50
}
```

### GET /api/centers/services/:id

获取单个服务详情。

**404:** `{ "status": "error", "message": "Service not found" }`

### POST /api/centers/services

创建或更新服务（upsert）。`id` 和 `name` 必填。

### PUT /api/centers/services/:id

更新指定服务。

---

## Submissions & Review

### POST /api/centers/submissions

社区贡献提交入口（医院/医生/服务）。

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entityType` | string | yes | `hospital`, `doctor`, or `service` |
| `action` | string | yes | `create` or `update` |
| `payload` | object | yes | 实体数据（须含 `name` 字段） |
| `submitterId` | string | no | 提交者 UID |
| `submitterName` | string | no | 提交者称呼 |
| `sourceUrls` | string[] | yes | 信息来源 URL |

**Example:**
```json
{
  "entityType": "hospital",
  "action": "create",
  "payload": {
    "id": "hosp-gd-new",
    "name": "广东省某三甲医院",
    "city": "广州",
    "province": "广东",
    "country": "中国",
    "latitude": 23.13,
    "longitude": 113.26,
    "hospitalLevel": "3A",
    "hospitalType": "general",
    "hasMDT": true,
    "sourceUrls": [],
    "dataQuality": "unverified",
    "qualityScore": 50
  },
  "submitterName": "患者家属-张先生",
  "sourceUrls": ["https://example.com/hospital-info"]
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "id": "sub-1721000000000-abc123",
    "entityType": "hospital",
    "action": "create",
    "payload": { ... },
    "submitterName": "患者家属-张先生",
    "status": "pending",
    "sourceUrls": ["https://example.com/hospital-info"],
    "createdAt": "2025-07-30T12:00:00.000Z"
  }
}
```

**Errors:**
- `400`: 验证失败 — `{ status: 'error', message: 'entityType must be...' }`
- `409`: 重复提交 — `{ status: 'error', message: 'A similar submission already exists...' }`

### GET /api/centers/submissions

审核队列（管理员查看）。

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | - | 筛选状态: `pending`, `approved`, `rejected` |
| `limit` | number | 50 | 每页数量 |
| `offset` | number | 0 | 偏移量 |

**Response:** 按创建时间降序排列
```json
{
  "status": "ok",
  "data": [ ...CenterSubmission[] ],
  "total": 5,
  "offset": 0,
  "limit": 50
}
```

### POST /api/centers/submissions/:id/review

审核操作（批准或拒绝）。

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | `approve` or `reject` |
| `comment` | string | no | 审核意见 |

**Example — Approve:**
```json
{
  "action": "approve",
  "comment": "信息经核实，同意收录"
}
```

**Example — Reject:**
```json
{
  "action": "reject",
  "comment": "来源无法验证，信息可能不准确"
}
```

**Approve behavior:** 自动将 `payload` 写入对应实体集合（hospitals/doctors/services），状态变为 `approved`。

**Reject behavior:** 状态变为 `rejected`，记录拒绝原因。

**Errors:**
- `400`: 操作无效（已审核、action 不合法）
- `404`: 提交记录不存在

### GET /api/centers/submissions/my

查询我的提交历史。

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | yes | 提交者 UID |

**Response:**
```json
{
  "status": "ok",
  "data": [ ...CenterSubmission[] ],
  "total": 3
}
```

---

## Quality Scoring & Ratings

### GET /api/centers/quality/:entityType/:id

获取实体的质量评分详情（包含各维度分解）。

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `entityType` | string | `hospital`, `doctor`, or `service` |
| `id` | string | 实体 ID |

**Response:**
```json
{
  "status": "ok",
  "data": {
    "score": 85,
    "breakdown": {
      "dataCompleteness": 0.65,
      "sourceAuthority": 0.90,
      "crossValidation": 0.40,
      "accreditation": 0.80,
      "timeliness": 1.00
    },
    "scoredAt": "2025-08-01T12:00:00.000Z"
  }
}
```

**评分维度 (5 dimensions, weighted):**

| 维度 | 权重 | 说明 |
|------|------|------|
| `dataCompleteness` | 30% | 可选字段填写率 |
| `sourceAuthority` | 25% | 来源权威性 (gov > edu > hospital > social) |
| `crossValidation` | 20% | 多源交叉验证 (1源=0.4, 2源=0.7, 3+=1.0) |
| `accreditation` | 15% | 认证背书 (JCI=1.0, 三甲=0.8) |
| `timeliness` | 10% | 时效性 (<90天=1.0, <180天=0.7, <365天=0.4) |

### POST /api/centers/ratings

提交或更新评价（每用户每实体限一条，更新覆盖）。

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entityType` | string | yes | `hospital`, `doctor`, or `service` |
| `entityId` | string | yes | 实体 ID |
| `userId` | string | yes | 评价者 UID |
| `score` | number | yes | 评分 1-5（整数） |
| `comment` | string | no | 评价内容 |
| `aspects` | object | no | `{ expertise, communication, efficiency, facilities }` 各1-5 |

**Example:**
```json
{
  "entityType": "hospital",
  "entityId": "hosp-bj-xiehe",
  "userId": "demo-user-1",
  "score": 5,
  "comment": "非常专业",
  "aspects": { "expertise": 5, "communication": 4, "efficiency": 4, "facilities": 5 }
}
```

**Response:** `{ "status": "ok", "data": CenterRating, "isNew": true }`

### GET /api/centers/ratings/:entityType/:entityId

获取实体评价列表及聚合统计。

**Response:**
```json
{
  "status": "ok",
  "data": [ ...CenterRating[] ],
  "aggregate": {
    "avg": 4.5,
    "count": 10,
    "distribution": [0, 0, 2, 1, 7]
  }
}
```

`distribution`: [1星数, 2星数, 3星数, 4星数, 5星数]

---

## Data Types

### CenterHospital

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | 唯一标识，如 `hosp-bj-xiehe` |
| `name` | string | yes | 医院全称 |
| `shortName` | string | no | 简称 |
| `city` | string | yes | 城市 |
| `province` | string | yes | 省份 |
| `country` | string | yes | 国家 |
| `latitude` | number | yes | 纬度 |
| `longitude` | number | yes | 经度 |
| `hospitalLevel` | string | yes | `3A`, `3B`, `2A`, `2B`, `international`, `unknown` |
| `hospitalType` | string | yes | `general`, `cancer_center`, `specialized`, `university` |
| `accreditedBy` | string[] | no | 认证机构，如 `["JCI"]` |
| `pancreaticAnnualSurgeries` | number | no | 年胰腺手术量 |
| `hasMDT` | boolean | yes | 是否多学科会诊 |
| `mdtSchedule` | string | no | MDT 排班 |
| `contact` | string | no | 联系方式 |
| `website` | string | no | 官网 URL |
| `sourceUrls` | string[] | yes | 数据来源 URL |
| `dataQuality` | string | yes | `public`, `estimated`, `mixed`, `unverified` |
| `qualityScore` | number | yes | 0-100 综合质量分 |
| `verifiedAt` | string | no | 验证时间 ISO |
| `updatedAt` | string | yes | 更新时间 ISO |

### CenterDoctor

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | 唯一标识，如 `doc-bj-zhaoyupei` |
| `name` | string | yes | 姓名 |
| `title` | string | yes | 职称 |
| `hospitalIds` | string[] | yes | 关联医院 ID（支持多点执业） |
| `departmentName` | string | no | 科室 |
| `specialties` | string[] | yes | 专长列表 |
| `academicTitle` | string | no | 学术头衔 |
| `academicOrg` | string | no | 所属学会 |
| `patientVolume` | number | no | 年接诊/手术量 |
| `publications` | string[] | no | 代表性论文 PMID |
| `clinicalTrialIds` | string[] | no | 临床试验 NCT 编号 |
| `sourceUrls` | string[] | yes | 数据来源 |
| `dataQuality` | string | yes | 同上 |
| `qualityScore` | number | yes | 0-100 |
| `verifiedAt` | string | no | 验证时间 |
| `updatedAt` | string | yes | 更新时间 |

### CenterService

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | 唯一标识 |
| `name` | string | yes | 服务名称 |
| `description` | string | yes | 服务描述 |
| `category` | string | yes | 类别: `surgery`, `chemotherapy`, `radiotherapy`, `intervention`, `nutrition`, `psychology`, `rehabilitation`, `palliative`, `clinical_trial`, `genetic_testing` |
| `hospitalId` | string | yes | 关联医院 ID |
| `departmentName` | string | no | 提供科室 |
| `availability` | string | yes | 可及性: `immediate`, `within_week`, `within_month`, `queue_long`, `unknown` |
| `costRange` | string | no | 费用区间 |
| `insuranceCoverage` | string[] | no | 医保覆盖 |
| `requirements` | string[] | no | 准入条件 |
| `sourceUrls` | string[] | yes | 数据来源 |
| `dataQuality` | string | yes | 同上 |
| `qualityScore` | number | yes | 0-100 |
| `verifiedAt` | string | no | 验证时间 |
| `updatedAt` | string | yes | 更新时间 |

---

## Error Responses

All error responses use this format:

```json
{
  "status": "error",
  "message": "Human-readable error description"
}
```

HTTP status codes: `400` (validation), `404` (not found), `500` (server error).
