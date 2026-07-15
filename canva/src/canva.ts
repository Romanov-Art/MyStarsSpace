import { Buffer } from 'node:buffer';
import type { AppConfig } from './config.js';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}

export interface CanvaJob<T> {
  id: string;
  status: 'in_progress' | 'success' | 'failed';
  result?: T;
  asset?: CanvaAsset;
  error?: { code: string; message: string };
}

export interface CanvaAsset {
  id: string;
  type: string;
  name?: string;
}

export interface CanvaDesign {
  id: string;
  title?: string;
  url?: string;
  urls?: {
    edit_url: string;
    view_url: string;
  };
}

export type DatasetValue =
  | { type: 'text'; text: string }
  | { type: 'image'; asset_id: string }
  | { type: 'video'; asset_id: string }
  | Record<string, unknown>;

export class CanvaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: unknown
  ) {
    super(message);
  }
}

function bodyFromBytes(bytes: Buffer): BodyInit {
  return new Blob([new Uint8Array(bytes)]);
}

export class CanvaClient {
  constructor(
    private readonly config: AppConfig['canva'],
    private readonly jobs: AppConfig['jobs'],
    private readonly fetcher: typeof fetch = fetch
  ) {}

  authorizationUrl(input: { state: string; codeChallenge: string; scopes?: string[]; redirectUri?: string }): string {
    const url = new URL(this.config.authBaseUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri ?? this.config.redirectUri);
    url.searchParams.set('scope', (input.scopes ?? this.config.scopes).join(' '));
    url.searchParams.set('state', input.state);
    url.searchParams.set('code_challenge', input.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier: string, redirectUri = this.config.redirectUri): Promise<TokenResponse> {
    return this.tokenRequest(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri
      })
    );
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return this.tokenRequest(
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    );
  }

  async uploadAsset(accessToken: string, input: { name: string; bytes: Buffer; mimeType: string }): Promise<CanvaAsset> {
    const response = await this.request<{ job: CanvaJob<never> }>(accessToken, '/v1/asset-uploads', {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'Asset-Upload-Metadata': JSON.stringify({
          name_base64: Buffer.from(input.name.slice(0, 50)).toString('base64')
        })
      },
      body: bodyFromBytes(input.bytes)
    });

    const job = await this.pollJob<{ asset?: CanvaAsset }>(accessToken, `/v1/asset-uploads/${response.job.id}`, (body) => body.job);
    if (!job.asset) throw new CanvaApiError('Canva asset upload completed without an asset', 502, job);
    return job.asset;
  }

  async autofillDesign(
    accessToken: string,
    input: {
      title: string;
      brandTemplateId?: string;
      designId?: string;
      data: Record<string, DatasetValue>;
    }
  ): Promise<CanvaDesign> {
    const source = input.brandTemplateId
      ? { type: 'create_from_brand_template', brand_template_id: input.brandTemplateId }
      : { type: 'create_from_design', design_id: input.designId };

    const response = await this.request<{ job: CanvaJob<{ design: CanvaDesign }> }>(accessToken, '/v1/autofills', {
      method: 'POST',
      json: {
        ...source,
        title: input.title,
        data: input.data
      }
    });

    const job = await this.pollJob<{ design: CanvaDesign }>(accessToken, `/v1/autofills/${response.job.id}`, (body) => body.job);
    if (!job.result?.design) throw new CanvaApiError('Canva autofill completed without a design', 502, job);
    return job.result.design;
  }

  private async tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
    const response = await this.fetcher(`${this.config.apiBaseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body
    });
    return this.parseResponse<TokenResponse>(response);
  }

  private async request<T>(
    accessToken: string,
    path: string,
    init: {
      method: string;
      headers?: Record<string, string>;
      json?: unknown;
      body?: BodyInit;
    }
  ): Promise<T> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
      ...(init.headers ?? {})
    };
    let body = init.body;
    if (init.json !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(init.json);
    }

    const response = await this.fetcher(`${this.config.apiBaseUrl}${path}`, {
      method: init.method,
      headers,
      body
    });
    return this.parseResponse<T>(response);
  }

  private async pollJob<T>(
    accessToken: string,
    path: string,
    select: (body: { job: CanvaJob<T> }) => CanvaJob<T>
  ): Promise<CanvaJob<T>> {
    const started = Date.now();
    for (;;) {
      const body = await this.request<{ job: CanvaJob<T> }>(accessToken, path, { method: 'GET' });
      const job = select(body);
      if (job.status === 'success') return job;
      if (job.status === 'failed') {
        throw new CanvaApiError(job.error?.message ?? 'Canva job failed', 502, job);
      }
      if (Date.now() - started > this.jobs.pollTimeoutMs) {
        throw new CanvaApiError('Timed out waiting for Canva job', 504, job);
      }
      await new Promise((resolve) => setTimeout(resolve, this.jobs.pollIntervalMs));
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new CanvaApiError(`Canva API request failed with ${response.status}`, response.status, body);
    }
    return body as T;
  }
}
