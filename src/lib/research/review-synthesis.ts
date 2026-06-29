import type { LiteratureItem, PersonalReview, ProfileQuery } from '../../types';
import { buildRegistry } from './citation-registry.ts';
import {
  buildExtractiveReview,
  verifyReview,
  type RawReview
} from './hallucination-verify.ts';
import type { ClinicalTrialItem } from '../../types';
import { callChatModel, parseJsonFromText, type LlmConfig } from './llm-call.ts';

/**
 * Build a zero-hallucination review from retrieved papers and trials.
 *
 * Flow (ported from lifescience-research-copilot): registry (fact base) ->
 * LLM synthesis constrained to allowed ids -> deterministic verification that
 * drops any fabricated id. When the LLM is unavailable or returns malformed
 * output, fall back to the extractive synthesizer (always verification-clean).
 */

const SYSTEM_PROMPT = [
  '你是资深肿瘤文献综述专家。基于给定论文用简体中文撰写结构完整的研究综述。',
  '硬性要求：',
  '1) 覆盖性：allowed_ids 中每一篇论文都至少在一条结论里被引用，不得遗漏；',
  '2) 结构：先写 2-3 句研究背景概述(overview)，再把论文按机制/主题归纳为 3-6 个主题；',
  '3) 深度：每个主题 2-5 条结论，写清机制、药物、疗效数据(如 ORR/PFS/OS)、耐药通路，避免空泛；',
  '4) 引用：每条结论必须引用 allowed_ids 中真实存在的 id，可多引；禁止编造任何 id 或事实；',
  '5) 输出完整合法的 JSON，不要用代码块包裹，不要超长截断。',
  'JSON 结构：{"overview":str,"themes":[{"name":str,"claims":[{"text":str,"citations":[id,...]}]}]}'
].join('\n');

export type SynthesisInput = {
  query: ProfileQuery;
  papers: LiteratureItem[];
  trials: ClinicalTrialItem[];
  config?: LlmConfig;
};

export async function synthesizeReview(input: SynthesisInput): Promise<PersonalReview> {
  const registry = buildRegistry(input.papers, input.trials);

  // Cap corpus size and abstract length to protect the token budget (mirrors
  // the skill: 12 papers, 900-char abstracts).
  const corpus = input.papers
    .filter((p) => p.abstract)
    .slice(0, 12)
    .map((p) => ({
      id: `PMID:${p.pmid}`,
      title: p.title,
      abstract: p.abstract.slice(0, 900)
    }));
  const allowedIds = corpus.map((c) => c.id);

  if (corpus.length > 0) {
    const userPrompt = JSON.stringify({
      question: { gene: input.query.gene, cancer: input.query.cancer, question: input.query.question },
      allowed_ids: allowedIds,
      papers: corpus
    });

    const result = await callChatModel({
      config: input.config,
      systemInstruction: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.2,
      timeoutMs: 60000
    });

    if (result.ok) {
      try {
        const parsed = parseJsonFromText(result.text) as RawReview;
        if (parsed && Array.isArray(parsed.themes) && parsed.themes.length > 0) {
          return verifyReview(parsed, registry, 'llm');
        }
      } catch {
        // fall through to extractive
      }
    }
  }

  // Extractive fallback: verification-clean, no LLM required.
  return verifyReview(buildExtractiveReview(input.papers), registry, 'extractive');
}
