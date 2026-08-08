import type { CenterHospital, CenterDoctor, CenterService } from './types';

type ScorableEntity = CenterHospital | CenterDoctor | CenterService;

export interface QualityBreakdown {
  dataCompleteness: number;   // 0-1
  sourceAuthority: number;    // 0-1
  crossValidation: number;    // 0-1
  accreditation: number;      // 0-1
  timeliness: number;         // 0-1
}

export interface QualityResult {
  score: number;              // 0-100
  breakdown: QualityBreakdown;
  scoredAt: string;
}

export interface QualityScoringContext {
  now?: Date;
}

const DEFAULT_WEIGHTS = {
  dataCompleteness: 0.30,
  sourceAuthority: 0.25,
  crossValidation: 0.20,
  accreditation: 0.15,
  timeliness: 0.10,
};

/**
 * Score source URL authority: gov/pubmed > edu > hospital > social > unknown.
 */
function scoreSourceAuthority(sourceUrls: string[]): number {
  if (!sourceUrls || sourceUrls.length === 0) return 0;

  let bestScore = 0;
  for (const url of sourceUrls) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.includes('.gov.') || hostname.endsWith('.gov') || hostname.includes('who.int') || hostname.includes('pubmed')) {
        bestScore = Math.max(bestScore, 1.0);
      } else if (hostname.includes('.edu.') || hostname.endsWith('.edu')) {
        bestScore = Math.max(bestScore, 0.9);
      } else if (hostname.includes('hospital') || hostname.includes('clinic') || hostname.includes('med')) {
        bestScore = Math.max(bestScore, 0.7);
      } else if (hostname.includes('weixin') || hostname.includes('mp.weixin') || hostname.includes('zhihu')) {
        bestScore = Math.max(bestScore, 0.4);
      } else {
        bestScore = Math.max(bestScore, 0.3);
      }
    } catch {
      bestScore = Math.max(bestScore, 0.1);
    }
  }
  return bestScore;
}

/**
 * Score cross-validation: more independent sources → higher score.
 */
function scoreCrossValidation(sourceUrls: string[]): number {
  const count = sourceUrls?.length ?? 0;
  if (count === 0) return 0;
  if (count === 1) return 0.4;
  if (count === 2) return 0.7;
  return 1.0;
}

/**
 * Score accreditation: JCI, 3A hospital level, international certifications.
 */
function scoreAccreditation(entity: ScorableEntity): number {
  let score = 0;

  if ('hospitalLevel' in entity) {
    const h = entity as CenterHospital;
    if (h.hospitalLevel === '3A') score = Math.max(score, 0.8);
    if (h.hospitalLevel === 'international') score = Math.max(score, 0.7);
    if (h.accreditedBy?.some(a => a.includes('JCI'))) score = Math.max(score, 1.0);
    if (h.accreditedBy?.some(a => a.includes('NMPA') || a.includes('卫健委'))) score = Math.max(score, 0.7);
  }

  if ('academicTitle' in entity && entity.academicTitle) {
    score = Math.max(score, 0.5);
  }

  return score;
}

/**
 * Score data completeness: ratio of filled optional fields.
 */
function scoreDataCompleteness(entity: ScorableEntity): number {
  let filled = 0;
  let total = 0;

  // Use type-safe property access with explicit field checking
  function check(fieldVal: unknown): boolean {
    return fieldVal !== undefined && fieldVal !== null && fieldVal !== '';
  }
  function checkArr(arr: unknown): boolean {
    return Array.isArray(arr) && arr.length > 0;
  }

  // Fields common to all entities
  // Use explicit type-safe checks for each type

  if (isHospital(entity)) {
    if (check(entity.shortName)) { total++; if (entity.shortName !== '') filled++; }
    if (check(entity.contact)) { total++; if (entity.contact !== '') filled++; }
    if (check(entity.website)) { total++; if (entity.website !== '') filled++; }
    if (checkArr(entity.accreditedBy)) { total++; filled++; }
    if (check(entity.mdtSchedule)) { total++; if (entity.mdtSchedule !== '') filled++; }
  }
  if (isDoctor(entity)) {
    if (check(entity.departmentName)) { total++; if (entity.departmentName !== '') filled++; }
    if (check(entity.academicTitle)) { total++; if (entity.academicTitle !== '') filled++; }
    if (check(entity.academicOrg)) { total++; if (entity.academicOrg !== '') filled++; }
    if (check(entity.patientVolume)) { total++; if (entity.patientVolume !== undefined) filled++; }
    if (checkArr(entity.publications)) { total++; filled++; }
    if (checkArr(entity.clinicalTrialIds)) { total++; filled++; }
  }
  if (isService(entity)) {
    if (check(entity.departmentName)) { total++; if (entity.departmentName !== '') filled++; }
    if (check(entity.costRange)) { total++; if (entity.costRange !== '') filled++; }
    if (checkArr(entity.insuranceCoverage)) { total++; filled++; }
    if (checkArr(entity.requirements)) { total++; filled++; }
  }

  return total > 0 ? filled / total : 0;
}

function isHospital(e: ScorableEntity): e is CenterHospital {
  return 'hospitalLevel' in e;
}

function isDoctor(e: ScorableEntity): e is CenterDoctor {
  return 'hospitalIds' in e && !('hospitalLevel' in e);
}

function isService(e: ScorableEntity): e is CenterService {
  return 'availability' in e;
}

/**
 * Score timeliness: how recently data was verified.
 */
function scoreTimeliness(verifiedAt: string | undefined, now: Date): number {
  if (!verifiedAt) return 0;
  try {
    const verified = new Date(verifiedAt).getTime();
    if (isNaN(verified)) return 0;
    const daysSince = (now.getTime() - verified) / (1000 * 60 * 60 * 24);
    if (daysSince < 90) return 1.0;
    if (daysSince < 180) return 0.7;
    if (daysSince < 365) return 0.4;
    return 0.2;
  } catch {
    return 0;
  }
}

/**
 * Create the center quality scoring engine (following credibility engine factory pattern).
 */
export function createCenterQualityEngine(ctx?: QualityScoringContext) {
  const now = ctx?.now ?? new Date();

  function scoreOne(entity: ScorableEntity): QualityResult {
    const sourceUrls = (entity as unknown as { sourceUrls?: string[] }).sourceUrls || [];
    const verifiedAt = (entity as unknown as { verifiedAt?: string }).verifiedAt;

    const breakdown: QualityBreakdown = {
      dataCompleteness: scoreDataCompleteness(entity),
      sourceAuthority: scoreSourceAuthority(sourceUrls),
      crossValidation: scoreCrossValidation(sourceUrls),
      accreditation: scoreAccreditation(entity),
      timeliness: scoreTimeliness(verifiedAt, now),
    };

    const score = Math.round(
      (breakdown.dataCompleteness * DEFAULT_WEIGHTS.dataCompleteness +
       breakdown.sourceAuthority * DEFAULT_WEIGHTS.sourceAuthority +
       breakdown.crossValidation * DEFAULT_WEIGHTS.crossValidation +
       breakdown.accreditation * DEFAULT_WEIGHTS.accreditation +
       breakdown.timeliness * DEFAULT_WEIGHTS.timeliness) * 100
    );

    return { score, breakdown, scoredAt: now.toISOString() };
  }

  function scoreAll(entities: ScorableEntity[]): Map<string, QualityResult> {
    const results = new Map<string, QualityResult>();
    for (const entity of entities) {
      results.set(entity.id, scoreOne(entity));
    }
    return results;
  }

  return { scoreOne, scoreAll };
}
