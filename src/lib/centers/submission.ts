import type { CenterSubmission, CenterHospital, CenterDoctor, CenterService } from './types';

/**
 * Generate a unique submission ID.
 */
export function generateSubId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Validate a submission payload.
 * Returns an array of error messages, or empty array if valid.
 */
export function validateSubmission(payload: {
  entityType?: unknown;
  action?: unknown;
  payload?: unknown;
  sourceUrls?: unknown;
}): string[] {
  const errors: string[] = [];

  if (!payload.entityType || !['hospital', 'doctor', 'service'].includes(payload.entityType as string)) {
    errors.push('entityType must be "hospital", "doctor", or "service"');
  }
  if (!payload.action || !['create', 'update'].includes(payload.action as string)) {
    errors.push('action must be "create" or "update"');
  }
  if (!payload.payload || typeof payload.payload !== 'object') {
    errors.push('payload must be a non-null object');
  } else {
    const p = payload.payload as Record<string, unknown>;
    if (!p.name) {
      errors.push('payload.name is required');
    }
  }
  if (!Array.isArray(payload.sourceUrls)) {
    errors.push('sourceUrls must be an array');
  }

  return errors;
}

/**
 * Check if a similar submission already exists (duplicate detection).
 * Matches on: same entityType + any overlapping sourceUrls.
 */
export function checkDuplicate(
  submissions: CenterSubmission[],
  entityType: string,
  sourceUrls: string[],
): CenterSubmission | null {
  return submissions.find(
    (s) =>
      s.entityType === entityType &&
      s.sourceUrls.some((url) => sourceUrls.includes(url)) &&
      s.status !== 'rejected',
  ) ?? null;
}

/**
 * Upsert an approved submission payload into the target entity array.
 * Returns the updated array and a boolean indicating if it was created (true) or updated (false).
 */
export function upsertFromSubmission(
  hospitals: CenterHospital[],
  doctors: CenterDoctor[],
  services: CenterService[],
  submission: CenterSubmission,
): { created: boolean; id: string } {
  const payload = submission.payload as Record<string, unknown>;
  const now = new Date().toISOString();

  switch (submission.entityType) {
    case 'hospital': {
      const hospitalData = payload as unknown as CenterHospital;
      const idx = hospitals.findIndex((h) => h.id === hospitalData.id);
      if (idx >= 0) {
        hospitals[idx] = { ...hospitals[idx], ...hospitalData, updatedAt: now };
        return { created: false, id: hospitalData.id };
      } else {
        hospitals.push({ ...hospitalData, updatedAt: now });
        return { created: true, id: hospitalData.id };
      }
    }
    case 'doctor': {
      const doctorData = payload as unknown as CenterDoctor;
      const idx = doctors.findIndex((d) => d.id === doctorData.id);
      if (idx >= 0) {
        doctors[idx] = { ...doctors[idx], ...doctorData, updatedAt: now };
        return { created: false, id: doctorData.id };
      } else {
        doctors.push({ ...doctorData, updatedAt: now });
        return { created: true, id: doctorData.id };
      }
    }
    case 'service': {
      const serviceData = payload as unknown as CenterService;
      const idx = services.findIndex((s) => s.id === serviceData.id);
      if (idx >= 0) {
        services[idx] = { ...services[idx], ...serviceData, updatedAt: now };
        return { created: false, id: serviceData.id };
      } else {
        services.push({ ...serviceData, updatedAt: now });
        return { created: true, id: serviceData.id };
      }
    }
    default:
      throw new Error(`Unknown entity type: ${submission.entityType}`);
  }
}
