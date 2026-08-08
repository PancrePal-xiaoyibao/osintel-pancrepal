// Types
export type {
  CenterHospital,
  CenterDoctor,
  CenterService,
  CenterSubmission,
  CenterRating,
  HospitalLevel,
  HospitalType,
  DataQuality,
  ServiceCategory,
  ServiceAvailability,
} from './types';

// Hospital CRUD
export {
  listHospitals,
  getHospital,
  createHospital,
  updateHospital,
} from './hospital-crud';

export type {
  ListHospitalsOptions,
  ListHospitalsResult,
} from './hospital-crud';

// Doctor CRUD
export {
  listDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
} from './doctor-crud';

export type {
  ListDoctorsOptions,
  ListDoctorsResult,
} from './doctor-crud';

// Service CRUD
export {
  listServices,
  getService,
  createService,
  updateService,
} from './service-crud';

export type {
  ListServicesOptions,
  ListServicesResult,
} from './service-crud';

// Seed data
export {
  INITIAL_CENTER_HOSPITALS,
  INITIAL_CENTER_DOCTORS,
  INITIAL_CENTER_SERVICES,
} from './seed';

// Submission
export {
  generateSubId,
  validateSubmission,
  checkDuplicate,
  upsertFromSubmission,
} from './submission';

// Validation
export {
  validateUrl,
  validateHospital,
  validateDoctor,
  validateService,
} from './validation';

// Quality Scoring
export {
  createCenterQualityEngine,
} from './quality';

export type {
  QualityBreakdown,
  QualityResult,
  QualityScoringContext,
} from './quality';

// Ratings
export {
  generateRatingId,
  submitRating,
  getRatings,
  getAggregate,
  getUserRating,
} from './ratings';

export type {
  RatingsAggregate,
} from './ratings';
