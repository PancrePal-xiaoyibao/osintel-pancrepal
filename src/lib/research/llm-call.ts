/**
 * Reusable server-side LLM call for the personalized OSINTel routes.
 *
 * Mirrors the provider/endpoint mapping used by `/api/osint/chat-custom` so the
 * review synthesis and grounded assistant can reuse the same multi-provider
 * gateway. Returns plain text; callers decide how to parse (e.g. JSON for the
 * review synthesizer). On any failure it returns `{ ok: false }` so callers can
 * fall back cleanly (extractive review / simulated assistant).
 */

export type ChatRole = 'user' | 'assistant' | 'system';
export type ChatTurn = { role: ChatRole; content: string };

export type LlmConfig = {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export type LlmCallInput = {
  config?: LlmConfig;
  messages: ChatTurn[];
  systemInstruction?: string;
  temperature?: number;
  timeoutMs?: number;
};

export type LlmCallResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

function autoModel(provider: string): string {
  switch (provider) {
    case 'gemini':
      return 'gemini-2.5-flash';
    case 'openai':
      return 'gpt-4o-mini';
    case 'stepfun':
      return 'step-1-flash';
    case 'openrouter':
      return 'deepseek/deepseek-r1';
    case 'dashscope':
      return 'qwen-plus';
    case 'fireworks':
      return 'accounts/fireworks/models/deepseek-v3';
    default:
      return 'deepseek-ai/DeepSeek-V3';
  }
}

function endpointFor(provider: string, baseUrl: string): string {
  switch (provider) {
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    case 'openai':
      return `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
    case 'siliconflow':
      return `${baseUrl || 'https://api.siliconflow.cn/v1'}/chat/completions`;
    case 'openrouter':
      return `${baseUrl || 'https://openrouter.ai/api/v1'}/chat/completions`;
    case 'fireworks':
      return `${baseUrl || 'https://api.fireworks.ai/inference/v1'}/chat/completions`;
    case 'dashscope':
      return `${baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'}/chat/completions`;
    case 'stepfun':
      return `${baseUrl || 'https://api.stepfun.com/v1'}/chat/completions`;
    default:
      return baseUrl ? `${baseUrl}/chat/completions` : '';
  }
}

/**
 * Call an OpenAI-compatible chat endpoint. Requires a client-provided API key;
 * when absent, returns `{ ok: false, reason: 'missing_api_key' }` so the caller
 * can route to its own fallback (the routes still honor the server Gemini key
 * separately if desired).
 */
export async function callChatModel(input: LlmCallInput): Promise<LlmCallResult> {
  const provider = (input.config?.provider || 'siliconflow').trim();
  const apiKey = (input.config?.apiKey || '').trim();
  const baseUrl = (input.config?.baseUrl || '').trim();
  let model = (input.config?.model || 'auto').trim();
  if (!model || model === 'auto') model = autoModel(provider);

  if (!apiKey) {
    return { ok: false, reason: 'missing_api_key' };
  }

  const messages: ChatTurn[] = [];
  if (input.systemInstruction) {
    messages.push({ role: 'system', content: input.systemInstruction });
  }
  for (const m of input.messages) {
    messages.push({
      role: m.role === 'user' ? 'user' : m.role === 'system' ? 'system' : 'assistant',
      content: m.content || ''
    });
  }

  const endpointUrl = endpointFor(provider, baseUrl);
  if (!endpointUrl) {
    return { ok: false, reason: 'no_endpoint' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://ai.studio/build';
    headers['X-Title'] = 'Pancreas OSINTel Personal';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 30000);
  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: input.temperature ?? 0.5
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text();
      return { ok: false, reason: `http_${response.status}:${detail.slice(0, 200)}` };
    }
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) {
      return { ok: false, reason: 'empty_text' };
    }
    return { ok: true, text };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'request_failed';
    return { ok: false, reason };
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract a JSON object from an LLM text response (handles ``` fences). */
export function parseJsonFromText(text: string): unknown {
  let content = text.trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
  }
  return JSON.parse(content);
}
