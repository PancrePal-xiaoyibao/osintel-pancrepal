export const RESOURCE_HIERARCHY = [
  'region',
  'country',
  'city',
  'treatment_center',
  'hospital_department'
] as const;

export const NEWS_REVIEW_STATUSES = [
  'pending',
  'needs_human_review',
  'approved',
  'rejected'
] as const;

export const NEWS_SEED_KINDS = [
  'feed_item',
  'seed_candidate',
  'intelligence_event',
  'source_metadata_only',
  'reject'
] as const;

export const SOURCE_BACKED_SCALE_METRIC_FIELDS = [
  'metric_key',
  'name',
  'value',
  'unit',
  'period',
  'scope',
  'definition',
  'source_urls',
  'source_type',
  'verification_status',
  'confidence'
] as const;

export const PUBLIC_SIGNAL_FIELDS = [
  'public_signal_heat',
  'wechat_activity_heat',
  'academic_activity_heat',
  'trial_activity_heat',
  'patient_discussion_heat'
] as const;

export const SCHEMA_TABLE_GROUPS = {
  core: [
    'app_settings',
    'patient_profiles',
    'watchdog_events',
    'system_reports'
  ],
  geography: [
    'geo_regions',
    'geo_countries',
    'geo_cities'
  ],
  resource: [
    'resource_centers',
    'hospital_departments',
    'department_public_accounts',
    'resource_heat_snapshots',
    'resource_source_links'
  ],
  news: [
    'news_source_registry',
    'news_source_collections',
    'news_collection_runs',
    'news_normalized_items',
    'news_review_actions',
    'intelligence_events'
  ]
} as const;

export type SchemaTableGroup = keyof typeof SCHEMA_TABLE_GROUPS;
export type SchemaTableName = (typeof SCHEMA_TABLE_GROUPS)[SchemaTableGroup][number];

export const ALL_SCHEMA_TABLES = [
  ...SCHEMA_TABLE_GROUPS.core,
  ...SCHEMA_TABLE_GROUPS.geography,
  ...SCHEMA_TABLE_GROUPS.resource,
  ...SCHEMA_TABLE_GROUPS.news
] as const;

export function getAllSchemaTables(): readonly SchemaTableName[] {
  return ALL_SCHEMA_TABLES;
}

export function getTableGroupNames(): readonly SchemaTableGroup[] {
  return Object.keys(SCHEMA_TABLE_GROUPS) as SchemaTableGroup[];
}

