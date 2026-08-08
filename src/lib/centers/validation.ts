import type { CenterHospital, CenterDoctor, CenterService, ServiceCategory } from './types';

const VALID_CATEGORIES: ServiceCategory[] = [
  'surgery', 'chemotherapy', 'radiotherapy', 'intervention',
  'nutrition', 'psychology', 'rehabilitation', 'palliative',
  'clinical_trial', 'genetic_testing',
];

const VALID_HOSPITAL_LEVELS = ['3A', '3B', '2A', '2B', 'international', 'unknown'];
const VALID_HOSPITAL_TYPES = ['general', 'cancer_center', 'specialized', 'university'];

/**
 * Validate a URL format (basic check).
 */
export function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate a hospital entity. Returns an array of error messages.
 */
export function validateHospital(h: Partial<CenterHospital>): string[] {
  const errors: string[] = [];

  if (!h.name?.trim()) errors.push('name is required');
  if (!h.city?.trim()) errors.push('city is required');
  if (!h.country?.trim()) errors.push('country is required');

  if (h.latitude !== undefined && (h.latitude < -90 || h.latitude > 90)) {
    errors.push('latitude must be between -90 and 90');
  }
  if (h.longitude !== undefined && (h.longitude < -180 || h.longitude > 180)) {
    errors.push('longitude must be between -180 and 180');
  }

  if (h.hospitalLevel && !VALID_HOSPITAL_LEVELS.includes(h.hospitalLevel)) {
    errors.push(`hospitalLevel must be one of: ${VALID_HOSPITAL_LEVELS.join(', ')}`);
  }
  if (h.hospitalType && !VALID_HOSPITAL_TYPES.includes(h.hospitalType)) {
    errors.push(`hospitalType must be one of: ${VALID_HOSPITAL_TYPES.join(', ')}`);
  }

  if (h.sourceUrls) {
    if (!Array.isArray(h.sourceUrls)) {
      errors.push('sourceUrls must be an array');
    } else {
      h.sourceUrls.forEach((url, i) => {
        if (!validateUrl(url)) errors.push(`sourceUrls[${i}] is not a valid HTTP/HTTPS URL`);
      });
    }
  }

  return errors;
}

/**
 * Validate a doctor entity.
 */
export function validateDoctor(d: Partial<CenterDoctor>): string[] {
  const errors: string[] = [];

  if (!d.name?.trim()) errors.push('name is required');
  if (!d.title?.trim()) errors.push('title is required');

  if (d.hospitalIds !== undefined) {
    if (!Array.isArray(d.hospitalIds)) {
      errors.push('hospitalIds must be an array');
    } else if (d.hospitalIds.length === 0) {
      errors.push('hospitalIds must contain at least one hospital');
    }
  }

  if (d.specialties !== undefined && (!Array.isArray(d.specialties) || d.specialties.length === 0)) {
    errors.push('specialties must be a non-empty array');
  }

  if (d.sourceUrls) {
    d.sourceUrls.forEach((url, i) => {
      if (!validateUrl(url)) errors.push(`sourceUrls[${i}] is not a valid HTTP/HTTPS URL`);
    });
  }

  return errors;
}

/**
 * Validate a service entity.
 */
export function validateService(s: Partial<CenterService>): string[] {
  const errors: string[] = [];

  if (!s.name?.trim()) errors.push('name is required');
  if (!s.description?.trim()) errors.push('description is required');
  if (!s.hospitalId?.trim()) errors.push('hospitalId is required');

  if (s.category && !VALID_CATEGORIES.includes(s.category as ServiceCategory)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (s.availability && !['immediate', 'within_week', 'within_month', 'queue_long', 'unknown'].includes(s.availability)) {
    errors.push('availability must be one of: immediate, within_week, within_month, queue_long, unknown');
  }

  if (s.sourceUrls) {
    s.sourceUrls.forEach((url, i) => {
      if (!validateUrl(url)) errors.push(`sourceUrls[${i}] is not a valid HTTP/HTTPS URL`);
    });
  }

  return errors;
}
