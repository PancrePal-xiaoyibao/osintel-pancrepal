import React, { useState, useRef, useEffect } from 'react';
import { Download, FileJson, FileSpreadsheet, Loader2, Check } from 'lucide-react';

interface ExportButtonProps {
  onExport: (format: 'json' | 'csv') => void;
  isExporting: boolean;
}

const LABELS: Record<string, Record<string, string>> = {
  ZH: {
    export: '导出结果',
    jsonLabel: 'JSON（含评分详情）',
    csvLabel: 'CSV（表格格式）',
    exporting: '导出中...',
    done: '已下载',
  },
  EN: {
    export: 'Export',
    jsonLabel: 'JSON (with scores)',
    csvLabel: 'CSV (spreadsheet)',
    exporting: 'Exporting...',
    done: 'Downloaded',
  },
};

export default function ExportButton({ onExport, isExporting }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = LABELS.ZH; // Default ZH for now; wire language prop if needed

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-reset "done" state after 2 seconds
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), 2000);
    return () => clearTimeout(timer);
  }, [done]);

  const handleExport = (format: 'json' | 'csv') => {
    setOpen(false);
    setDone(true);
    onExport(format);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={isExporting}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition
          ${done
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
            : 'border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 bg-zinc-950/60'
          }
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isExporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : done ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span className="font-mono tracking-[0.1em] uppercase text-[11px]">
          {isExporting ? t.exporting : done ? t.done : t.export}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[80] overflow-hidden glass animate-fade-in">
          <button
            onClick={() => handleExport('json')}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-300 hover:bg-white/5 transition"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-400" />
            <div className="text-left">
              <div className="text-zinc-300">JSON</div>
              <div className="text-[10px] text-zinc-600">{t.jsonLabel}</div>
            </div>
          </button>
          <div className="border-t border-white/5" />
          <button
            onClick={() => handleExport('csv')}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-300 hover:bg-white/5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <div className="text-left">
              <div className="text-zinc-300">CSV</div>
              <div className="text-[10px] text-zinc-600">{t.csvLabel}</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
