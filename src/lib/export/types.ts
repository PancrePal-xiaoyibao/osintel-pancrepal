import type { ScoredResult } from '../credibility/types';
import type { FilterParams } from '../filtering/types';

// ---- Export Format ----

/** Supported export formats */
export type ExportFormat = 'json' | 'csv';

/** MIME type per format */
export const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  json: 'application/json',
  csv:  'text/csv; charset=utf-8',
};

/** File extension per format */
export const EXPORT_EXTENSIONS: Record<ExportFormat, string> = {
  json: '.json',
  csv:  '.csv',
};

// ---- CSV Column Schema ----

/**
 * Defines how a SearchResult field maps to a CSV column.
 */
export type CsvColumn = {
  /** Column header label */
  header: string;
  /** Accessor function: (item) => cell value */
  accessor: (item: ScoredResult) => string;
};

// ---- Export Options ----

/**
 * Configuration for an export operation.
 */
export type ExportOptions = {
  /** Output format */
  format: ExportFormat;
  /** Filter to apply before export (optional — exports all if omitted) */
  filter?: FilterParams;
  /** Max items to export (safety cap, default 10000) */
  maxItems?: number;
  /** Whether to include credibility breakdown in JSON */
  includeCredibility?: boolean;
  /** Whether to include source metadata in JSON */
  includeMetadata?: boolean;
};

// ---- Export Metadata ----

/**
 * Metadata accompanying an export.
 * Always present in JSON exports; embedded as CSV comment header.
 */
export type ExportMetadata = {
  /** Generation timestamp */
  generatedAt: string;
  /** Total items exported */
  itemCount: number;
  /** Format used */
  format: ExportFormat;
  /** Filters applied (if any) */
  filter?: FilterParams;
  /** Source of data (e.g. 'rss-feed-cache', 'live-search') */
  dataSource: string;
};

// ---- Export Result ----

/**
 * Result of an export operation.
 */
export type ExportResult = {
  /** Serialized content */
  content: string;
  /** Metadata */
  metadata: ExportMetadata;
  /** MIME type for HTTP response */
  mimeType: string;
  /** Suggested filename */
  filename: string;
};

// ---- Pipeline Interface ----

/**
 * Export pipeline: filtering → serializing → output.
 */
export interface ExportPipeline {
  /** Export items with options, returning ready-to-serve content */
  export(items: ScoredResult[], options: ExportOptions): ExportResult;

  /** Stream-friendly: export line by line (for large datasets) */
  exportStream(
    items: ScoredResult[],
    options: ExportOptions,
    onChunk: (chunk: string) => void
  ): Promise<ExportMetadata>;
}
