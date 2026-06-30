export type LlmProviderId =
  | 'siliconflow'
  | 'dashscope'
  | 'openrouter'
  | 'gemini'
  | 'openai'
  | 'fireworks'
  | 'stepfun'
  | 'openai_compatible';

export type LlmProviderDefinition = {
  id: LlmProviderId;
  name: string;
  defaultBaseUrl: string;
  defaultModels: string[];
  placeholderKey: string;
  iconColor: string;
  envBaseUrlKey?: string;
  envApiKeyKey?: string;
};

export type StoredProviderConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export const PROVIDER_STORAGE_KEYS = {
  activeProvider: 'pancreas_ai_elements_active_provider',
  configs: 'pancreas_ai_elements_configs'
} as const;

export const LLM_PROVIDER_REGISTRY: Record<LlmProviderId, LlmProviderDefinition> = {
  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    defaultModels: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B', 'Qwen/Qwen2.5-72B-Instruct', 'Qwen/Qwen2.5-Coder-32B-Instruct', 'THUDM/glm-4-9b-chat'],
    placeholderKey: 'sk-sf-...',
    iconColor: 'text-purple-400'
  },
  dashscope: {
    id: 'dashscope',
    name: 'Aliyun DashScope (通义千问)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModels: ['qwen-max', 'qwen-max-latest', 'qwen-plus', 'qwen-turbo', 'qwen2.5-72b-instruct', 'qwen2.5-14b-instruct', 'qwen-vl-max-latest'],
    placeholderKey: 'sk-ali-...',
    iconColor: 'text-amber-400'
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModels: ['deepseek/deepseek-r1', 'meta-llama/llama-3.3-70b-instruct', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.5-pro', 'google/gemini-2.5-flash'],
    placeholderKey: 'sk-or-...',
    iconColor: 'text-indigo-400'
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.0-pro-exp'],
    placeholderKey: 'AIzaSy...',
    iconColor: 'text-blue-400'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModels: ['o3-mini', 'o1', 'o1-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    placeholderKey: 'sk-proj-...',
    iconColor: 'text-emerald-400'
  },
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    defaultBaseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModels: ['accounts/fireworks/models/deepseek-v3', 'accounts/fireworks/models/deepseek-r1', 'accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/qwen2p5-72b-instruct'],
    placeholderKey: 'fw_...',
    iconColor: 'text-pink-400'
  },
  stepfun: {
    id: 'stepfun',
    name: 'StepFun (阶跃星辰)',
    defaultBaseUrl: 'https://api.stepfun.com/v1',
    defaultModels: ['step-1-max', 'step-1.5-v-pro', 'step-1-flash', 'step-1-pro', 'step-1.5-pro'],
    placeholderKey: 'key_...',
    iconColor: 'text-red-400'
  },
  openai_compatible: {
    id: 'openai_compatible',
    name: 'OpenAI Compatible (自定义模型)',
    defaultBaseUrl: 'https://your-custom-endpoint.com/v1',
    defaultModels: ['custom-model-v1', 'deepseek-r1', 'llama3'],
    placeholderKey: 'api-key-...',
    iconColor: 'text-zinc-400'
  }
};

export const LLM_PROVIDER_IDS = Object.keys(LLM_PROVIDER_REGISTRY) as LlmProviderId[];

export function getLlmProvider(providerId: string): LlmProviderDefinition {
  return LLM_PROVIDER_REGISTRY[(providerId as LlmProviderId) || 'siliconflow'] || LLM_PROVIDER_REGISTRY.siliconflow;
}

export function getProviderDefaults(providerId: string): StoredProviderConfig {
  const provider = getLlmProvider(providerId);
  return {
    apiKey: '',
    baseUrl: provider.defaultBaseUrl,
    model: provider.defaultModels[0] || ''
  };
}

export function getProviderModelOptions(providerId: string): string[] {
  return getLlmProvider(providerId).defaultModels;
}

export function getStoredProviderConfigs(): Record<string, StoredProviderConfig> {
  try {
    const raw = globalThis.localStorage?.getItem(PROVIDER_STORAGE_KEYS.configs);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<StoredProviderConfig>>;
    return Object.fromEntries(
      Object.entries(parsed).map(([providerId, config]) => [
        providerId,
        {
          apiKey: config?.apiKey || '',
          baseUrl: config?.baseUrl || getProviderDefaults(providerId).baseUrl,
          model: config?.model || getProviderDefaults(providerId).model
        }
      ])
    );
  } catch {
    return {};
  }
}

export function getStoredActiveProvider(): LlmProviderId {
  try {
    const stored = globalThis.localStorage?.getItem(PROVIDER_STORAGE_KEYS.activeProvider);
    if (stored && stored in LLM_PROVIDER_REGISTRY) {
      return stored as LlmProviderId;
    }
  } catch {
    // Ignore localStorage access failures and use the safe default.
  }
  return 'siliconflow';
}

export function getResolvedProviderConfig(providerId: string): {
  provider: LlmProviderDefinition;
  config: StoredProviderConfig;
} {
  const provider = getLlmProvider(providerId);
  const configs = getStoredProviderConfigs();
  return {
    provider,
    config: configs[provider.id] || getProviderDefaults(provider.id)
  };
}
