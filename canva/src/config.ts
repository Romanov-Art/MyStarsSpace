import path from 'node:path';
import 'dotenv/config';

export interface AppConfig {
  port: number;
  dataDir: string;
  publicBaseUrl: string;
  apiKeys: string[];
  defaults: {
    brandTemplateId: string;
    designId: string;
  };
  canva: {
    apiBaseUrl: string;
    authBaseUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
  jobs: {
    pollIntervalMs: number;
    pollTimeoutMs: number;
  };
}

function csv(value: string | undefined, fallback: string[]): string[] {
  const parsed = (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

export function loadConfigFromEnv(): AppConfig {
  const port = Number(process.env.PORT ?? 3200);
  const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, '');

  return {
    port,
    dataDir: process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data'),
    publicBaseUrl,
    apiKeys: csv(process.env.API_KEYS ?? process.env.API_KEY, []),
    defaults: {
      brandTemplateId: process.env.DEFAULT_BRAND_TEMPLATE_ID ?? '',
      designId: process.env.DEFAULT_DESIGN_ID ?? ''
    },
    canva: {
      apiBaseUrl: (process.env.CANVA_API_BASE_URL ?? 'https://api.canva.com/rest').replace(/\/$/, ''),
      authBaseUrl: (process.env.CANVA_AUTH_BASE_URL ?? 'https://www.canva.com/api/oauth/authorize').replace(/\/$/, ''),
      clientId: process.env.CANVA_CLIENT_ID ?? '',
      clientSecret: process.env.CANVA_CLIENT_SECRET ?? '',
      redirectUri: process.env.CANVA_REDIRECT_URI ?? `${publicBaseUrl}/v1/auth/canva/callback`,
      scopes: csv(process.env.CANVA_SCOPES, ['design:content:write', 'design:meta:read', 'asset:write'])
    },
    jobs: {
      pollIntervalMs: Number(process.env.CANVA_JOB_POLL_INTERVAL_MS ?? 1500),
      pollTimeoutMs: Number(process.env.CANVA_JOB_POLL_TIMEOUT_MS ?? 60000)
    }
  };
}

export function databaseUrl(dataDir: string): string {
  return `file:${path.join(dataDir, 'canva-api.db')}`;
}
