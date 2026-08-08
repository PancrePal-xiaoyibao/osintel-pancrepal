/**
 * Type declarations for Pancreatic Cancer OSINT Intelligence Hub
 */

export type OSINTCategory = 
  | 'drug' 
  | 'trial' 
  | 'surgery' 
  | 'oncology' 
  | 'nutrition' 
  | 'psychology' 
  | 'complication' 
  | 'policy' 
  | 'patient_resource';

export type EvidenceLevel = 'A' | 'B' | 'C' | 'D';

export interface OSINTItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  country: string;
  category: OSINTCategory;
  entities: string[]; // e.g., ["KRAS WT", "ATR inhibitor", "ATM mutation"]
  importanceScore: number; // 0.0 - 10.0
  summary: string;
  evidenceLevel: EvidenceLevel;
  clinicalTrialId?: string; // e.g., NCT05123456
  clickable?: boolean;
  sourceType?: 'center' | 'clinical' | 'drug' | 'trial' | 'psychology' | 'nutrition' | 'policy' | 'other';
  topicTags?: string[];
  contentTags?: string[];
  freshnessMinutes?: number;
  freshnessWindow?: '24h' | '7d' | '30d';
  centerPriority?: boolean;
  reviewStatus?: 'pending' | 'needs_human_review' | 'approved' | 'rejected';
  sourceEvidence?: Array<{ title: string; url: string; note?: string }>;
}

export interface ErrorLogEntry {
  time: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  classification: string; // e.g., "RSS Parser Timeout", "API Rate Limit", "HTML Selection Change"
}

export interface WatchdogStatus {
  status: 'healthy' | 'degraded' | 'error';
  uptime: string;
  lastCheck: string;
  nextCheck: string;
  nodesActive: number;
  apiQuotaUsed: number;
  apiQuotaTotal: number;
  cpuLoad: number;
  memoryUsage: string;
  errorLog: ErrorLogEntry[];
  selfHealedCount: number;
  recentRepairAction?: string;
}

export interface ResourceCenter {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  leadDoctors?: string[];
  type: 'clinical_center' | 'research_hub' | 'patient_guide';
  explicitCategory?: 'treatment' | 'complication' | 'psychology' | 'nutrition';
  description: string;
  contact?: string;
  survivorResources?: string[];
}

// === Center Information Database Types ===

export type HospitalLevel = '3A' | '3B' | '2A' | '2B' | 'international' | 'unknown';
export type HospitalType = 'general' | 'cancer_center' | 'specialized' | 'university';
export type DataQuality = 'public' | 'estimated' | 'mixed' | 'unverified';
export type ServiceCategory = 'surgery' | 'chemotherapy' | 'radiotherapy' | 'intervention'
  | 'nutrition' | 'psychology' | 'rehabilitation' | 'palliative'
  | 'clinical_trial' | 'genetic_testing';
export type ServiceAvailability = 'immediate' | 'within_week' | 'within_month' | 'queue_long' | 'unknown';

export interface CenterHospital {
  id: string;
  name: string;
  shortName?: string;
  city: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  hospitalLevel: HospitalLevel;
  hospitalType: HospitalType;
  accreditedBy?: string[];
  pancreaticAnnualSurgeries?: number;
  hasMDT: boolean;
  mdtSchedule?: string;
  contact?: string;
  website?: string;
  sourceUrls: string[];
  dataQuality: DataQuality;
  qualityScore: number;
  verifiedAt?: string;
  updatedAt: string;
}

export interface CenterDoctor {
  id: string;
  name: string;
  title: string;
  hospitalIds: string[];
  departmentName?: string;
  specialties: string[];
  academicTitle?: string;
  academicOrg?: string;
  patientVolume?: number;
  publications?: string[];
  clinicalTrialIds?: string[];
  sourceUrls: string[];
  dataQuality: DataQuality;
  qualityScore: number;
  verifiedAt?: string;
  updatedAt: string;
}

export interface CenterService {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  hospitalId: string;
  departmentName?: string;
  availability: ServiceAvailability;
  costRange?: string;
  insuranceCoverage?: string[];
  requirements?: string[];
  sourceUrls: string[];
  dataQuality: DataQuality;
  qualityScore: number;
  verifiedAt?: string;
  updatedAt: string;
}

export interface CenterSubmission {
  id: string;
  entityType: 'hospital' | 'doctor' | 'service';
  action: 'create' | 'update';
  payload: Record<string, unknown>;
  submitterId?: string;
  submitterName?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerId?: string;
  reviewComment?: string;
  sourceUrls: string[];
  createdAt: string;
  reviewedAt?: string;
}

export interface CenterRating {
  id: string;
  entityType: 'hospital' | 'doctor' | 'service';
  entityId: string;
  userId: string;
  score: number;
  comment?: string;
  aspects?: {
    expertise?: number;
    communication?: number;
    efficiency?: number;
    facilities?: number;
  };
  createdAt: string;
}

export interface SystemReport15Day {
  generatedAt: string;
  title: string;
  executiveSummary: string;
  dataQualityScore: number; // out of 100
  crawlerSuccessRate: number; // percentage
  topActiveSources: { name: string; count: number }[];
  categoryDistribution: { category: OSINTCategory; count: number }[];
  recommendations: string[];
}

export interface PatientProfile {
  city: string;
  mutations: string[]; // e.g. ["KRAS G12D", "TP53"]
  ihcResults: string; // e.g. "Claudin 18.2 High, HER2 (1+)"
  regimen: string; // e.g. "AG (Gemcitabine + nab-Paclitaxel)"
  efficacy: string; // e.g. "PR (Partial Response)"
  summary: string; // short summary
  lastUpdated: string;
}

/**
 * Personalized OSINTel research types.
 * Backing the dedicated "My" tab: PubMed papers, ClinicalTrials.gov trials,
 * and a zero-hallucination synthesized review.
 */

export interface LiteratureItem {
  pmid: string;
  title: string;
  abstract: string;
  journal?: string;
  year?: string;
  doi?: string;
  url: string; // https://pubmed.ncbi.nlm.nih.gov/<pmid>/
  citedByCount?: number;
  isOpenAccess?: boolean;
}

export interface ClinicalTrialItem {
  nct: string;
  title: string;
  status: string; // e.g. RECRUITING
  phase: string[];
  sponsor?: string;
  url: string; // https://clinicaltrials.gov/study/<nct>
  conditions?: string[];
  locations?: string[];
}

export interface ReviewClaim {
  text: string;
  citations: string[]; // e.g. ["PMID:12345", "NCT01234567"]
  links?: string[];
}

export interface ReviewTheme {
  name: string;
  claims: ReviewClaim[];
}

export interface ReviewIntegrity {
  citations_valid: number;
  citations_invalid: number;
  claims_dropped: number;
  claims_uncited: number;
  hallucination_rate: number;
  verified: boolean;
}

export interface PersonalReview {
  overview?: string;
  themes: ReviewTheme[];
  integrity: ReviewIntegrity;
  engine: 'llm' | 'extractive';
}

/** Derived, de-identified query tokens sent to external research APIs. */
export interface ProfileQuery {
  gene: string; // primary English gene/mutation token, e.g. "KRAS G12D"
  genes: string[]; // all normalized gene tokens
  cancer: string; // fixed: "pancreatic cancer"
  question: string; // research question
  newsQuery: string; // free-text query for the news pipeline
  city?: string; // optional location hint for trials
}
