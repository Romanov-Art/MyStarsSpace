import fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppConfig } from './config.js';
import { CanvaApiError, CanvaClient, type CanvaDesign, type DatasetValue } from './canva.js';
import { codeChallenge, randomToken } from './crypto.js';
import { parseDataUrl } from './data-url.js';
import { createStore, type Store } from './store.js';

const authUrlQuerySchema = z.object({
  user_id: z.string().min(1).max(128).default('default'),
  return_to: z.string().url().optional()
});

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1)
});

const canvasSchema = z.object({
  width: z.number().positive().default(30),
  height: z.number().positive().default(40),
  unit: z.enum(['cm', 'mm', 'px']).default('cm'),
  dpi: z.number().positive().default(300)
});

const textSchema = z
  .object({
    phrase: z.string().default(''),
    line1: z.string().default(''),
    line2: z.string().default(''),
    line3: z.string().default(''),
    line4: z.string().default('')
  })
  .default({ phrase: '', line1: '', line2: '', line3: '', line4: '' });

const styleSchema = z
  .object({
    phraseFont: z.string().optional(),
    phraseFontSize: z.union([z.string(), z.number()]).optional(),
    subtitleFont: z.string().optional(),
    subtitleFontSize: z.union([z.string(), z.number()]).optional(),
    themeId: z.string().optional()
  })
  .default({});

const editorCreateSchema = z.object({
  user_id: z.string().min(1).max(128).default('default'),
  title: z.string().min(1).max(255).default('MyStarsSpace Star Map'),
  canvas: canvasSchema.default({ width: 30, height: 40, unit: 'cm', dpi: 300 }),
  asset: z.object({
    data_url: z.string().min(1),
    name: z.string().min(1).max(50).default('Star map background')
  }),
  template: z
    .object({
      brand_template_id: z.string().min(1).optional(),
      design_id: z.string().min(1).optional()
    })
    .default({}),
  text: textSchema,
  style: styleSchema
});

type EditorCreateBody = z.infer<typeof editorCreateSchema>;

function expiresAt(seconds: number): Date {
  return new Date(Date.now() + Math.max(seconds, 1) * 1000);
}

function designEditUrl(design: CanvaDesign): string | undefined {
  return design.urls?.edit_url ?? design.url;
}

function textValue(value: unknown): DatasetValue {
  return { type: 'text', text: String(value ?? '') };
}

function autofillData(body: EditorCreateBody, backgroundAssetId: string): Record<string, DatasetValue> {
  const data: Record<string, DatasetValue> = {
    starMapBackground: { type: 'image', asset_id: backgroundAssetId },
    phrase: textValue(body.text.phrase),
    line1: textValue(body.text.line1),
    line2: textValue(body.text.line2),
    line3: textValue(body.text.line3),
    line4: textValue(body.text.line4)
  };

  for (const [key, value] of Object.entries(body.style)) {
    if (value !== undefined) data[key] = textValue(value);
  }

  return data;
}

function templateSource(body: EditorCreateBody, config: AppConfig): { brandTemplateId?: string; designId?: string } {
  const brandTemplateId = body.template.brand_template_id ?? config.defaults.brandTemplateId;
  const designId = body.template.design_id ?? config.defaults.designId;
  if (!brandTemplateId && !designId) {
    const error = new Error('template.brand_template_id, template.design_id, DEFAULT_BRAND_TEMPLATE_ID, or DEFAULT_DESIGN_ID is required');
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  return brandTemplateId ? { brandTemplateId } : { designId };
}

export async function buildApp(
  config: AppConfig,
  options: {
    store?: Store;
    canva?: CanvaClient;
  } = {}
): Promise<FastifyInstance> {
  const app = fastify({ logger: false, bodyLimit: 25 * 1024 * 1024 });
  const store = options.store ?? (await createStore(config.dataDir));
  const canva = options.canva ?? new CanvaClient(config.canva, config.jobs);

  app.addHook('onClose', async () => {
    store.close();
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof CanvaApiError) {
      return reply.code(error.status >= 400 && error.status < 600 ? error.status : 502).send({
        error: {
          type: 'canva_api_error',
          message: error.message,
          details: error.details
        }
      });
    }

    const typedError = error as Error & { statusCode?: number };
    const statusCode = typedError.statusCode;
    const status = error instanceof z.ZodError ? 400 : statusCode && statusCode >= 400 && statusCode < 600 ? statusCode : 500;
    return reply.code(status).send({
      error: {
        type: status === 400 ? 'invalid_request_error' : status === 401 ? 'authentication_error' : 'server_error',
        message: typedError.message
      }
    });
  });

  app.addHook('preHandler', async (request) => {
    const publicRoute =
      request.url === '/healthz' ||
      request.url.startsWith('/v1/auth/canva/url') ||
      request.url.startsWith('/v1/auth/canva/callback');
    if (publicRoute) return;

    if (config.apiKeys.length === 0) {
      throw new Error('API_KEYS is not configured');
    }
    const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token || !config.apiKeys.includes(token)) {
      const error = new Error('Invalid or missing API key');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }
  });

  async function accessTokenFor(userId: string): Promise<string> {
    const row = await store.getToken(userId);
    if (!row) {
      const error = new Error(`Canva is not connected for user_id "${userId}"`);
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    if (new Date(row.expires_at).getTime() - Date.now() > 60_000) {
      return row.access_token;
    }

    const refreshed = await canva.refreshToken(row.refresh_token);
    await store.upsertToken({
      userId,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: expiresAt(refreshed.expires_in),
      scopes: refreshed.scope?.split(/\s+/).filter(Boolean) ?? row.scopes.split(/\s+/).filter(Boolean)
    });
    return refreshed.access_token;
  }

  app.get('/healthz', async () => ({ ok: true }));

  app.get('/v1/auth/canva/url', async (request) => {
    if (!config.canva.clientId || !config.canva.clientSecret) {
      throw new Error('CANVA_CLIENT_ID and CANVA_CLIENT_SECRET must be configured');
    }

    const query = authUrlQuerySchema.parse(request.query);
    const verifier = randomToken(64);
    const state = randomToken(32);
    await store.insertOAuthState({
      state,
      userId: query.user_id,
      codeVerifier: verifier,
      returnTo: query.return_to,
      expiresAt: expiresAt(10 * 60)
    });

    return {
      object: 'canva.authorization_url',
      user_id: query.user_id,
      state,
      authorization_url: canva.authorizationUrl({
        state,
        codeChallenge: codeChallenge(verifier)
      })
    };
  });

  app.get('/v1/auth/canva/callback', async (request, reply) => {
    const query = callbackQuerySchema.parse(request.query);
    const state = await store.takeOAuthState(query.state);
    if (!state || new Date(state.expires_at).getTime() <= Date.now()) {
      return reply.code(400).send({ error: { type: 'invalid_request_error', message: 'OAuth state not found or expired' } });
    }

    const token = await canva.exchangeCode(query.code, state.code_verifier, config.canva.redirectUri);
    await store.upsertToken({
      userId: state.user_id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: expiresAt(token.expires_in),
      scopes: token.scope?.split(/\s+/).filter(Boolean) ?? config.canva.scopes
    });

    if (state.return_to) {
      const url = new URL(state.return_to);
      url.searchParams.set('canva_connected', '1');
      url.searchParams.set('user_id', state.user_id);
      return reply.redirect(url.toString());
    }

    return reply.send({
      object: 'canva.connection',
      connected: true,
      user_id: state.user_id
    });
  });

  app.get('/v1/auth/canva/status', async (request) => {
    const query = z.object({ user_id: z.string().default('default') }).parse(request.query);
    const token = await store.getToken(query.user_id);
    return {
      object: 'canva.connection_status',
      user_id: query.user_id,
      connected: Boolean(token),
      expires_at: token?.expires_at ?? null,
      scopes: token?.scopes?.split(/\s+/).filter(Boolean) ?? []
    };
  });

  app.post('/v1/editor/create', async (request) => {
    const body = editorCreateSchema.parse(request.body);
    const token = await accessTokenFor(body.user_id);
    const parsed = parseDataUrl(body.asset.data_url);
    const uploaded = await canva.uploadAsset(token, {
      name: body.asset.name,
      bytes: parsed.bytes,
      mimeType: parsed.mimeType
    });
    const source = templateSource(body, config);
    const design = await canva.autofillDesign(token, {
      title: body.title,
      ...source,
      data: autofillData(body, uploaded.id)
    });

    return {
      object: 'canva.editor_result',
      mode: 'autofill',
      canvas: body.canvas,
      asset: uploaded,
      design,
      edit_url: designEditUrl(design)
    };
  });

  return app;
}
