import { Buffer } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';
import type { CanvaClient } from '../src/canva.js';
import type { OAuthStateInput, OAuthStateRow, Store, TokenInput, TokenRow } from '../src/store.js';

function config(): AppConfig {
  return {
    port: 3200,
    dataDir: './data-test',
    publicBaseUrl: 'http://localhost:3200',
    apiKeys: ['test-key'],
    defaults: {
      brandTemplateId: 'default-template',
      designId: ''
    },
    canva: {
      apiBaseUrl: 'https://api.canva.test/rest',
      authBaseUrl: 'https://www.canva.test/api/oauth/authorize',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'http://localhost:3200/v1/auth/canva/callback',
      scopes: ['design:content:write', 'design:meta:read', 'asset:write']
    },
    jobs: {
      pollIntervalMs: 1,
      pollTimeoutMs: 100
    }
  };
}

class MemoryStore implements Store {
  states = new Map<string, OAuthStateRow>();
  tokens = new Map<string, TokenRow>();

  close(): void {}

  async insertOAuthState(input: OAuthStateInput): Promise<void> {
    this.states.set(input.state, {
      state: input.state,
      user_id: input.userId,
      code_verifier: input.codeVerifier,
      return_to: input.returnTo ?? null,
      expires_at: input.expiresAt.toISOString()
    });
  }

  async takeOAuthState(state: string): Promise<OAuthStateRow | null> {
    const row = this.states.get(state) ?? null;
    this.states.delete(state);
    return row;
  }

  async upsertToken(input: TokenInput): Promise<void> {
    this.tokens.set(input.userId, {
      user_id: input.userId,
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
      expires_at: input.expiresAt.toISOString(),
      scopes: input.scopes.join(' ')
    });
  }

  async getToken(userId: string): Promise<TokenRow | null> {
    return this.tokens.get(userId) ?? null;
  }

  async cleanupExpired(): Promise<void> {}
}

function fakeCanva() {
  return {
    authorizationUrl: vi.fn().mockReturnValue('https://www.canva.test/auth'),
    exchangeCode: vi.fn().mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_in: 14400,
      scope: 'design:content:write asset:write design:meta:read',
      token_type: 'Bearer'
    }),
    refreshToken: vi.fn().mockResolvedValue({
      access_token: 'refreshed-access',
      refresh_token: 'refreshed-refresh',
      expires_in: 14400,
      scope: 'design:content:write asset:write design:meta:read',
      token_type: 'Bearer'
    }),
    uploadAsset: vi.fn().mockResolvedValue({ id: 'asset-123', type: 'image', name: 'Star map background' }),
    autofillDesign: vi.fn().mockResolvedValue({
      id: 'design-123',
      urls: {
        edit_url: 'https://www.canva.com/api/design/edit',
        view_url: 'https://www.canva.com/api/design/view'
      }
    })
  } as unknown as CanvaClient & Record<string, ReturnType<typeof vi.fn>>;
}

const pngDataUrl = `data:image/png;base64,${Buffer.from('png').toString('base64')}`;

describe('MyStarsSpace Canva API', () => {
  it('creates Canva OAuth authorization URLs with stored PKCE state', async () => {
    const store = new MemoryStore();
    const canva = fakeCanva();
    const app = await buildApp(config(), { store, canva });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/canva/url?user_id=user-1'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.object).toBe('canva.authorization_url');
    expect(body.authorization_url).toBe('https://www.canva.test/auth');
    expect(store.states.has(body.state)).toBe(true);
    await app.close();
  });

  it('stores Canva tokens on OAuth callback', async () => {
    const store = new MemoryStore();
    const canva = fakeCanva();
    await store.insertOAuthState({
      state: 'state-123',
      userId: 'user-1',
      codeVerifier: 'verifier',
      expiresAt: new Date(Date.now() + 300_000)
    });
    const app = await buildApp(config(), { store, canva });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/canva/callback?code=code-123&state=state-123'
    });

    expect(response.statusCode).toBe(200);
    expect(store.tokens.get('user-1')?.access_token).toBe('new-access');
    await app.close();
  });

  it('reports Canva connection status', async () => {
    const store = new MemoryStore();
    await store.upsertToken({
      userId: 'user-1',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: new Date(Date.now() + 300_000),
      scopes: ['design:content:write']
    });
    const app = await buildApp(config(), { store, canva: fakeCanva() });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/canva/status?user_id=user-1',
      headers: { authorization: 'Bearer test-key' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ connected: true, user_id: 'user-1' });
    await app.close();
  });

  it('rejects protected endpoints without an API key', async () => {
    const app = await buildApp(config(), { store: new MemoryStore(), canva: fakeCanva() });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/canva/status?user_id=user-1'
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('rejects editor creation without a textless asset data URL', async () => {
    const store = new MemoryStore();
    await store.upsertToken({
      userId: 'user-1',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: new Date(Date.now() + 300_000),
      scopes: ['design:content:write', 'asset:write']
    });
    const app = await buildApp(config(), { store, canva: fakeCanva() });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/editor/create',
      headers: { authorization: 'Bearer test-key' },
      payload: {
        user_id: 'user-1',
        text: { phrase: 'Our night sky' }
      }
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('uploads a textless star map background and autofills editable text fields', async () => {
    const store = new MemoryStore();
    const canva = fakeCanva();
    await store.upsertToken({
      userId: 'user-1',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: new Date(Date.now() + 300_000),
      scopes: ['design:content:write', 'asset:write']
    });
    const app = await buildApp(config(), { store, canva });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/editor/create',
      headers: { authorization: 'Bearer test-key' },
      payload: {
        user_id: 'user-1',
        title: 'Customer Star Map',
        asset: { data_url: pngDataUrl, name: 'Star map background' },
        canvas: { width: 30, height: 40, unit: 'cm', dpi: 300 },
        text: {
          phrase: 'The Night We Met',
          line1: 'Anthony & Laura',
          line2: 'Paris, France',
          line3: '29.06.2026, 22:30',
          line4: '48.8566 N, 2.3522 E'
        },
        style: {
          phraseFont: 'Cormorant Garamond',
          phraseFontSize: 30,
          subtitleFont: 'Cormorant Garamond',
          subtitleFontSize: 12,
          themeId: 'black'
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(canva.uploadAsset).toHaveBeenCalledWith(
      'access',
      expect.objectContaining({ name: 'Star map background', mimeType: 'image/png' })
    );
    expect(canva.autofillDesign).toHaveBeenCalledWith(
      'access',
      expect.objectContaining({
        title: 'Customer Star Map',
        brandTemplateId: 'default-template',
        data: expect.objectContaining({
          starMapBackground: { type: 'image', asset_id: 'asset-123' },
          phrase: { type: 'text', text: 'The Night We Met' },
          line1: { type: 'text', text: 'Anthony & Laura' },
          line2: { type: 'text', text: 'Paris, France' },
          line3: { type: 'text', text: '29.06.2026, 22:30' },
          line4: { type: 'text', text: '48.8566 N, 2.3522 E' },
          phraseFont: { type: 'text', text: 'Cormorant Garamond' },
          phraseFontSize: { type: 'text', text: '30' },
          subtitleFont: { type: 'text', text: 'Cormorant Garamond' },
          subtitleFontSize: { type: 'text', text: '12' },
          themeId: { type: 'text', text: 'black' }
        })
      })
    );
    expect(response.json().edit_url).toBe('https://www.canva.com/api/design/edit');
    await app.close();
  });

  it('refreshes expired tokens before creating the Canva design', async () => {
    const store = new MemoryStore();
    const canva = fakeCanva();
    await store.upsertToken({
      userId: 'user-1',
      accessToken: 'expired-access',
      refreshToken: 'refresh',
      expiresAt: new Date(Date.now() - 10_000),
      scopes: ['design:content:write', 'asset:write']
    });
    const app = await buildApp(config(), { store, canva });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/editor/create',
      headers: { authorization: 'Bearer test-key' },
      payload: {
        user_id: 'user-1',
        asset: { data_url: pngDataUrl },
        text: { phrase: 'Fresh token' }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(canva.refreshToken).toHaveBeenCalledWith('refresh');
    expect(canva.uploadAsset).toHaveBeenCalledWith('refreshed-access', expect.any(Object));
    expect(store.tokens.get('user-1')?.access_token).toBe('refreshed-access');
    await app.close();
  });
});
