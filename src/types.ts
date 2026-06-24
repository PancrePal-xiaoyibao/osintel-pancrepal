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

