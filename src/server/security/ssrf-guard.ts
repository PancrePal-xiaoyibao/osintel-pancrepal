// SSRF guard for the LLM gateway.
//
// The /api/osint/chat-custom endpoint forwards the user's chosen provider baseUrl to fetch().
// Without this guard, a hostile client can make the server POST to:
//   - cloud metadata endpoints (169.254.169.254) → IAM token theft
//   - internal admin ports (10.x, 192.168.x, 127.x) → internal service abuse
//   - arbitrary hosts for credential forwarding
//
// Defense layers (in order):
//   1. URL parsing — only http/https, must have a host.
//   2. Host whitelist — 7 known LLM providers. Custom host requires ALLOW_CUSTOM_LLM_HOST=1.
//   3. DNS lookup + private-IP reject — defeats DNS-rebinding where the hostname resolves to
//      a public IP at parse time and a private IP at fetch time.
import { lookup } from 'node:dns/promises';
import net from 'node:net';

const ALLOWED_LLM_HOSTS = new Set<string>([
  'api.siliconflow.cn',
  'dashscope.aliyuncs.com',
  'openrouter.ai',
  'generativelanguage.googleapis.com',
  'api.openai.com',
  'api.fireworks.ai',
  'api.stepfun.com'
]);

export class SsrfError extends Error {
  code: string;
  constructor(code: string, detail?: string) {
    super(detail ? `${code}:${detail}` : code);
    this.code = code;
    this.name = 'SsrfError';
    (this as any).status = 422;
    (this as any).expose = true;
  }
}

export function isPrivateIp(ip: string): boolean {
  // IPv4: loopback / private / link-local / carrier-grade NAT / metadata
  if (net.isIPv4(ip)) {
    if (ip === '0.0.0.0') return true;
    if (ip.startsWith('127.')) return true; // loopback
    if (ip.startsWith('10.')) return true; // private class A
    if (ip.startsWith('192.168.')) return true; // private class C
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true; // private class B
    if (ip.startsWith('169.254.')) return true; // link-local + AWS/Azure/GCP metadata
    if (ip.startsWith('100.64.') || ip.startsWith('100.65.') || ip.startsWith('100.66.')) return true; // CGNAT
    return false;
  }
  // IPv6: loopback, unspecified, ULA (fc/fd), link-local (fe80)
  if (net.isIPv6(ip)) {
    if (ip === '::' || ip === '::1') return true;
    const lower = ip.toLowerCase();
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local
    if (lower.startsWith('fe80')) return true; // link-local
    // IPv4-mapped (::ffff:1.2.3.4) — extract and re-check
    const v4match = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
    if (v4match) return isPrivateIp(v4match[1]);
    return false;
  }
  return true; // unknown family — treat as private
}

export async function assertSafeProviderUrl(rawUrl: unknown): Promise<URL> {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
    throw new SsrfError('invalid_url');
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError('invalid_url', rawUrl.slice(0, 80));
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new SsrfError('disallowed_protocol', url.protocol);
  }

  const host = url.hostname.toLowerCase();
  if (!host) throw new SsrfError('missing_host');

  // Whitelist check — fast reject for unknown hosts unless operator explicitly opted in.
  if (!ALLOWED_LLM_HOSTS.has(host)) {
    if (process.env.ALLOW_CUSTOM_LLM_HOST !== '1') {
      throw new SsrfError('provider_not_whitelisted', host);
    }
    // Even with ALLOW_CUSTOM_LLM_HOST=1, private IPs are always blocked below.
  }

  // DNS resolve and reject any private/loopback/metadata address (DNS-rebinding defense).
  let records: { address: string; family: number }[];
  try {
    records = await lookup(host, { all: true });
  } catch (err: any) {
    throw new SsrfError('dns_resolve_failed', err?.code || host);
  }
  if (records.length === 0) {
    throw new SsrfError('dns_no_records', host);
  }
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new SsrfError('private_ip_resolved', `${host} -> ${r.address}`);
    }
  }

  return url;
}

export function isAllowedLlmHost(host: string): boolean {
  return ALLOWED_LLM_HOSTS.has(host.toLowerCase());
}
