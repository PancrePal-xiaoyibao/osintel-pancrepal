import type { ScoredResult } from '../credibility/types';
import { createFilterEngine } from '../filtering/engine';
import type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  ExportMetadata,
  ExportPipeline,
  CsvColumn,
} from './types';
import { EXPORT_MIME_TYPES, EXPORT_EXTENSIONS } from './types';

// ---- Constants ----

const DEFAULT_MAX_ITEMS = 10000;

// ---- CSV Column Schema ----

/**
 * Default CSV columns mapping ScoredResult fields → flat cells.
 * Order here determines column order in output.
 */
const DEFAULT_CSV_COLUMNS: CsvColumn[] = [
  { header: 'Title',        accessor: (r) => escapeCsv(r.title || '') },
  { header: 'URL',          accessor: (r) => r.url || '' },
  { header: 'Source',       accessor: (r) => r.source || '' },
  { header: 'Provider',     accessor: (r) => r.providerId || '' },
  { header: 'Kind',         accessor: (r) => r.kind || '' },
  { header: 'Published',    accessor: (r) => r.publishedAt || '' },
  { header: 'Credibility',  accessor: (r) => r.credibility ? String(r.credibility.score) : 'N/A' },
  { header: 'Source Tier',  accessor: (r) => r.credibility?.sourceTier || '' },
  { header: 'Evidence',     accessor: (r) => r.credibility?.evidenceLevel || '' },
  { header: 'DOI',          accessor: (r) => (r as any).doi || '' },
  { header: 'PMID',         accessor: (r) => (r as any).pmid || '' },
  { header: 'NCT',          accessor: (r) => (r as any).nct || '' },
  { header: 'Snippet',      accessor: (r) => escapeCsv((r.snippet || '').slice(0, 200)) },
];

// ---- CSV Helpers ----

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsvHeaderLine(columns: CsvColumn[]): string {
  return columns.map((c) => escapeCsv(c.header)).join(',');
}

function buildCsvDataLine(item: ScoredResult, columns: CsvColumn[]): string {
  return columns.map((c) => c.accessor(item)).join(',');
}

// ---- JSON Serializer ----

function buildJsonExport(
  items: ScoredResult[],
  metadata: ExportMetadata,
  options: ExportOptions
): string {
  const payload: Record<string, unknown> = {};

  if (options.includeMetadata !== false) {
    payload.metadata = metadata;
  }

  if (options.includeCredibility !== false) {
    payload.items = items;
  } else {
    // Strip credibility field
    payload.items = items.map(({ credibility, ...rest }) => rest);
  }

  return JSON.stringify(payload, null, 2);
}

// ---- CSV Serializer ----

function buildCsvExport(
  items: ScoredResult[],
  metadata: ExportMetadata,
  columns: CsvColumn[] = DEFAULT_CSV_COLUMNS
): string {
  const lines: string[] = [];

  // CSV comment header with metadata
  lines.push(`# Generated: ${metadata.generatedAt}`);
  lines.push(`# Items: ${metadata.itemCount}`);
  lines.push(`# Data Source: ${metadata.dataSource}`);
  if (metadata.filter) {
    lines.push(`# Filter: ${JSON.stringify(metadata.filter)}`);
  }
  lines.push('');

  // Column headers
  lines.push(buildCsvHeaderLine(columns));

  // Data rows
  for (const item of items) {
    lines.push(buildCsvDataLine(item, columns));
  }

  return lines.join('\n');
}

// ---- Filename Generator ----

function generateFilename(format: ExportFormat): string {
  const ext = EXPORT_EXTENSIONS[format];
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `osintel-export-${ts}${ext}`;
}

// ---- Pipeline Implementation ----

export function createExportPipeline(): ExportPipeline {
  const filterEngine = createFilterEngine();

  return {
    export(items: ScoredResult[], options: ExportOptions): ExportResult {
      // 1. Apply filter (if any)
      let subset = items;
      if (options.filter) {
        subset = filterEngine.apply(items, options.filter).items as ScoredResult[];
      }

      // 2. Apply max cap
      const max = options.maxItems || DEFAULT_MAX_ITEMS;
      if (subset.length > max) {
        subset = subset.slice(0, max);
      }

      // 3. Build metadata
      const metadata: ExportMetadata = {
        generatedAt: new Date().toISOString(),
        itemCount: subset.length,
        format: options.format,
        filter: options.filter,
        dataSource: 'osintel-feed',
      };

      // 4. Serialize
      let content: string;
      switch (options.format) {
        case 'json':
          content = buildJsonExport(subset, metadata, options);
          break;
        case 'csv':
          content = buildCsvExport(subset, metadata);
          break;
        default:
          content = buildJsonExport(subset, metadata, options);
      }

      return {
        content,
        metadata,
        mimeType: EXPORT_MIME_TYPES[options.format],
        filename: generateFilename(options.format),
      };
    },

    async exportStream(
      items: ScoredResult[],
      options: ExportOptions,
      onChunk: (chunk: string) => void
    ): Promise<ExportMetadata> {
      let subset = items;
      if (options.filter) {
        subset = filterEngine.apply(items, options.filter).items as ScoredResult[];
      }

      const max = options.maxItems || DEFAULT_MAX_ITEMS;
      if (subset.length > max) {
        subset = subset.slice(0, max);
      }

      const metadata: ExportMetadata = {
        generatedAt: new Date().toISOString(),
        itemCount: subset.length,
        format: options.format,
        filter: options.filter,
        dataSource: 'osintel-feed',
      };

      // Stream line by line for CSV
      if (options.format === 'csv') {
        const columns = DEFAULT_CSV_COLUMNS;
        onChunk(`# Generated: ${metadata.generatedAt}\n`);
        onChunk(`# Items: ${metadata.itemCount}\n`);
        onChunk(`# Data Source: ${metadata.dataSource}\n`);
        if (metadata.filter) {
          onChunk(`# Filter: ${JSON.stringify(metadata.filter)}\n`);
        }
        onChunk('\n');
        onChunk(buildCsvHeaderLine(columns) + '\n');

        for (const item of subset) {
          onChunk(buildCsvDataLine(item, columns) + '\n');
          // Yield to event loop every 100 items
          if (subset.indexOf(item) % 100 === 99) {
            await new Promise((resolve) => setImmediate(resolve));
          }
        }
      } else {
        // JSON: build in one shot (assumes reasonable size after cap)
        onChunk(buildJsonExport(subset, metadata, options));
      }

      return metadata;
    },
  };
}
