import assert from 'node:assert/strict';
import { runStartupCheck } from '../src/lib/startup-check.ts';

const result = await runStartupCheck({
  env: {
    GEMINI_API_KEY: 'x',
    APP_URL: 'https://example.com',
    LLM_PROVIDER: 'gemini',
    SUPABASE_URL: 'https://demo.supabase.co',
    SUPABASE_ANON_KEY: 'anon'
  },
  requiredFiles: ['package.json', 'server.ts', '.env.example'],
  fileExists: async () => true,
});

assert.equal(result.ok, true);
assert.deepEqual(result.issues, []);

const missing = await runStartupCheck({
  env: {
    GEMINI_API_KEY: 'MY_GEMINI_API_KEY',
    APP_URL: 'not-a-url',
    LLM_PROVIDER: 'openai',
    OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY',
    SUPABASE_ENABLED: 'true',
    SUPABASE_URL: 'bad-url',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    SUPABASE_SERVICE_ROLE_KEY: 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
  },
  requiredFiles: ['package.json'],
  fileExists: async () => true,
});

assert.equal(missing.ok, false);
assert(missing.issues.some((item) => item.code === 'missing_gemini_key'));
assert(missing.issues.some((item) => item.code === 'missing_app_url'));
assert(missing.issues.some((item) => item.code === 'missing_openai_key'));
assert(missing.issues.some((item) => item.code === 'missing_supabase_url'));
assert(missing.issues.some((item) => item.code === 'missing_supabase_anon_key'));
assert(missing.issues.some((item) => item.code === 'missing_supabase_service_key'));
