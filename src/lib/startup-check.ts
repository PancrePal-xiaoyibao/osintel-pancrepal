import type { CheckIssue, CheckResult } from './operations-contract';

export type StartupCheckInput = {
  env: Record<string, string | undefined>;
  requiredFiles: string[];
  fileExists: (path: string) => Promise<boolean>;
};

const PLACEHOLDER_VALUES = new Set([
  'MY_GEMINI_API_KEY',
  'MY_APP_URL',
  'YOUR_SUPABASE_ANON_KEY',
  'YOUR_SUPABASE_SERVICE_ROLE_KEY',
  'YOUR_OPENAI_API_KEY',
  'YOUR_OPENROUTER_API_KEY',
  'YOUR_SILICONFLOW_API_KEY',
  'YOUR_DASHSCOPE_API_KEY'
]);

const SUPPORTED_LLM_PROVIDERS = new Set(['gemini', 'openai', 'openrouter', 'siliconflow', 'dashscope']);

function isPlaceholder(value: string | undefined): boolean {
  return !value || PLACEHOLDER_VALUES.has(value.trim());
}

function isValidUrl(value: string | undefined): boolean {
  if (isPlaceholder(value)) {
    return false;
  }

  try {
    new URL(value as string);
    return true;
  } catch {
    return false;
  }
}

function resolveProvider(env: Record<string, string | undefined>): string {
  return (env.LLM_PROVIDER || 'gemini').trim().toLowerCase() || 'gemini';
}

export async function runStartupCheck(input: StartupCheckInput): Promise<CheckResult> {
  const issues: CheckIssue[] = [];

  if (isPlaceholder(input.env.GEMINI_API_KEY)) {
    issues.push({ code: 'missing_gemini_key', message: 'missing GEMINI_API_KEY' });
  }

  if (!isValidUrl(input.env.APP_URL)) {
    issues.push({ code: 'missing_app_url', message: 'missing APP_URL or invalid URL' });
  }

  const provider = resolveProvider(input.env);
  if (!SUPPORTED_LLM_PROVIDERS.has(provider)) {
    issues.push({ code: 'unsupported_llm_provider', message: `unsupported LLM_PROVIDER: ${provider}` });
  } else {
    const providerKeyMap: Record<string, string> = {
      gemini: 'GEMINI_API_KEY',
      openai: 'OPENAI_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      siliconflow: 'SILICONFLOW_API_KEY',
      dashscope: 'DASHSCOPE_API_KEY'
    };
    const providerKey = providerKeyMap[provider];
    if (providerKey && isPlaceholder(input.env[providerKey])) {
      issues.push({ code: `missing_${provider}_key`, message: `missing ${providerKey}` });
    }
  }

  const supabaseUrl = input.env.SUPABASE_URL || input.env.NEXT_PUBLIC_SUPABASE_URL || input.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = input.env.SUPABASE_ANON_KEY || input.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || input.env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceKey = input.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseEnabled = input.env.SUPABASE_ENABLED === 'true' || Boolean(supabaseUrl || supabaseAnonKey || supabaseServiceKey);

  if (supabaseEnabled) {
    if (!isValidUrl(supabaseUrl)) {
      issues.push({ code: 'missing_supabase_url', message: 'missing SUPABASE_URL or invalid URL' });
    }
    if (isPlaceholder(supabaseAnonKey)) {
      issues.push({ code: 'missing_supabase_anon_key', message: 'missing SUPABASE_ANON_KEY' });
    }
    if (input.env.SUPABASE_ENABLED === 'true' && isPlaceholder(supabaseServiceKey)) {
      issues.push({ code: 'missing_supabase_service_key', message: 'missing SUPABASE_SERVICE_ROLE_KEY' });
    }
  }

  for (const file of input.requiredFiles) {
    if (!(await input.fileExists(file))) {
      issues.push({ code: 'missing_file', message: `missing file: ${file}` });
    }
  }

  return { ok: issues.length === 0, issues };
}

