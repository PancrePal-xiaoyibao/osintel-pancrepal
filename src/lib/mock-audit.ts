import type { OSINTItem } from '../types';

export type RuntimeMode = 'real' | 'graceful_fallback' | 'demo_only' | 'unavailable';

export function responseMode(mode: RuntimeMode): RuntimeMode {
  return mode;
}

export function buildExtractiveDailySummary(items: OSINTItem[], generatedAt = new Date().toISOString()): string {
  const sorted = [...items].sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 8);
  const lines = sorted.length
    ? sorted.map((item, index) => {
      const source = item.url ? `[${item.source}](${item.url})` : item.source;
      return `${index + 1}. **${item.title}** (${source}, ${item.evidenceLevel}级, ${item.importanceScore.toFixed(1)}/10)\n   ${item.summary || 'No summary available.'}`;
    }).join('\n')
    : '当前没有可摘要的真实情报条目。请先刷新实时 feed 或检查上游搜索源。';

  return `# 胰腺癌 OSINT 抽取式简报

> 当前未连接可用 LLM。本简报只抽取并排序当前 feed 中已有条目，不生成新的临床结论，不替代医生和 MDT。

## 高优先级条目

${lines}

## 数据状态

- Feed item count: ${items.length}
- Summary mode: graceful_fallback
- Generated at: ${generatedAt}`;
}

export function unavailableChatResponse(reason: string): string {
  return `### AI 助手暂不可用

${reason}

当前系统没有返回模拟医学结论。请配置有效的 LLM API key，或先使用文献、临床试验、KnowS 和新闻检索结果作为人工阅读参考。

*本提示仅说明系统状态，不构成诊疗建议。*`;
}
