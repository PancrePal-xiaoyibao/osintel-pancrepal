import React, { useEffect, useState } from 'react';
import { ShieldCheck, Check, X, Clock, RefreshCw, Filter as FilterIcon, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

interface CenterSubmission {
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

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: { label: '待审核', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <Clock className="h-3 w-3" /> },
  approved: { label: '已通过', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <Check className="h-3 w-3" /> },
  rejected: { label: '已拒绝', className: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: <X className="h-3 w-3" /> },
};

const ENTITY_LABELS: Record<string, string> = {
  hospital: '医院',
  doctor: '医生',
  service: '服务',
};

export default function CenterAdminPanel() {
  const [submissions, setSubmissions] = useState<CenterSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function loadSubmissions() {
    setLoading(true);
    setError(null);
    try {
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/centers/submissions${query}`);
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data.data || []);
      } else {
        setError(data.message || '加载失败');
      }
    } catch {
      setError('网络错误，请检查连接');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter]);

  async function handleReview(submissionId: string, action: 'approve' | 'reject', comment?: string) {
    try {
      const res = await fetch(`/api/centers/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment }),
      });
      const data = await res.json();
      if (res.ok) {
        loadSubmissions();
      } else {
        setError(data.message || '审核操作失败');
      }
    } catch {
      setError('网络错误，审核操作失败');
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  const badgeClass = 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border';

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">管理员审核面板</h2>
        </div>
        <button
          onClick={loadSubmissions}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 mb-5 bg-zinc-900/60 rounded-lg p-1">
        {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusFilter === f
                ? 'bg-white/10 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FilterIcon className="h-3 w-3 inline mr-1" />
            {f === 'all' ? '全部' : STATUS_CONFIG[f]?.label || f}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-zinc-400 text-sm">加载中...</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">
          {statusFilter === 'pending' ? '暂无待审核的提交' : '暂无记录'}
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <div
              key={sub.id}
              className="rounded-xl border border-white/5 bg-zinc-900/50 hover:border-white/10 transition-colors"
            >
              {/* Header Row */}
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => toggleExpand(sub.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  {expandedIds.has(sub.id)
                    ? <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                  }
                  <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                    ENTITY_LABELS[sub.entityType]
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {ENTITY_LABELS[sub.entityType] || sub.entityType}
                  </span>
                  <span className="text-sm text-white truncate">
                    {String(sub.payload?.name || sub.payload?.id || '未知')}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <span className={`${badgeClass} ${STATUS_CONFIG[sub.status]?.className || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {STATUS_CONFIG[sub.status]?.icon}
                    {STATUS_CONFIG[sub.status]?.label || sub.status}
                  </span>

                  {sub.status === 'pending' && (
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleReview(sub.id, 'approve', '管理员审核通过')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs transition-colors"
                      >
                        <Check className="h-3 w-3" /> 通过
                      </button>
                      <button
                        onClick={() => handleReview(sub.id, 'reject', '管理员拒绝')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs transition-colors"
                      >
                        <X className="h-3 w-3" /> 拒绝
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedIds.has(sub.id) && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500">提交者：</span>
                      <span className="text-zinc-300">{sub.submitterName || sub.submitterId || '匿名'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">提交时间：</span>
                      <span className="text-zinc-300">{formatDate(sub.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">操作类型：</span>
                      <span className="text-zinc-300">{sub.action === 'create' ? '新增' : '更新'}</span>
                    </div>
                    {sub.reviewedAt && (
                      <div>
                        <span className="text-zinc-500">审核时间：</span>
                        <span className="text-zinc-300">{formatDate(sub.reviewedAt)}</span>
                      </div>
                    )}
                    {sub.reviewComment && (
                      <div className="md:col-span-2">
                        <span className="text-zinc-500">审核意见：</span>
                        <span className="text-zinc-300">{sub.reviewComment}</span>
                      </div>
                    )}
                  </div>

                  {/* Payload JSON */}
                  <details className="mt-2">
                    <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">查看提交数据 (JSON)</summary>
                    <pre className="mt-2 p-3 rounded-lg bg-black/60 text-xs text-zinc-300 overflow-x-auto max-h-48 font-mono">
                      {JSON.stringify(sub.payload, null, 2)}
                    </pre>
                  </details>

                  {/* Source URLs */}
                  {sub.sourceUrls.length > 0 && (
                    <div>
                      <span className="text-xs text-zinc-500 block mb-1">信息来源：</span>
                      {sub.sourceUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 break-all">
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          {url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-zinc-600">
        共 {submissions.length} 条{statusFilter !== 'all' ? ` ${STATUS_CONFIG[statusFilter]?.label || statusFilter}` : ''} 记录
      </div>
    </div>
  );
}
