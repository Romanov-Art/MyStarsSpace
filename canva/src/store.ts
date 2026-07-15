import { mkdir } from 'node:fs/promises';
import { createClient, type Client } from '@libsql/client';
import { databaseUrl } from './config.js';

export interface OAuthStateInput {
  state: string;
  userId: string;
  codeVerifier: string;
  returnTo?: string;
  expiresAt: Date;
}

export interface OAuthStateRow {
  state: string;
  user_id: string;
  code_verifier: string;
  return_to: string | null;
  expires_at: string;
}

export interface TokenInput {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}

export interface TokenRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scopes: string;
}

export interface Store {
  close(): void;
  insertOAuthState(input: OAuthStateInput): Promise<void>;
  takeOAuthState(state: string): Promise<OAuthStateRow | null>;
  upsertToken(input: TokenInput): Promise<void>;
  getToken(userId: string): Promise<TokenRow | null>;
  cleanupExpired(now?: Date): Promise<void>;
}

export async function createStore(dataDir: string): Promise<Store> {
  await mkdir(dataDir, { recursive: true });
  const client = createClient({ url: databaseUrl(dataDir) });
  await migrate(client);
  return new LibsqlStore(client);
}

async function migrate(client: Client): Promise<void> {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        code_verifier TEXT NOT NULL,
        return_to TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at)`,
      `CREATE TABLE IF NOT EXISTS canva_tokens (
        user_id TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        scopes TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_canva_tokens_expires_at ON canva_tokens(expires_at)`
    ],
    'write'
  );
}

class LibsqlStore implements Store {
  constructor(private readonly client: Client) {}

  close(): void {
    this.client.close();
  }

  async insertOAuthState(input: OAuthStateInput): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO oauth_states (state, user_id, code_verifier, return_to, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [input.state, input.userId, input.codeVerifier, input.returnTo ?? null, input.expiresAt.toISOString(), new Date().toISOString()]
    });
  }

  async takeOAuthState(state: string): Promise<OAuthStateRow | null> {
    const result = await this.client.execute({
      sql: `SELECT state, user_id, code_verifier, return_to, expires_at
            FROM oauth_states
            WHERE state = ?
            LIMIT 1`,
      args: [state]
    });
    await this.client.execute({ sql: 'DELETE FROM oauth_states WHERE state = ?', args: [state] });
    return (result.rows[0] as unknown as OAuthStateRow | undefined) ?? null;
  }

  async upsertToken(input: TokenInput): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO canva_tokens (user_id, access_token, refresh_token, expires_at, scopes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              access_token = excluded.access_token,
              refresh_token = excluded.refresh_token,
              expires_at = excluded.expires_at,
              scopes = excluded.scopes,
              updated_at = excluded.updated_at`,
      args: [
        input.userId,
        input.accessToken,
        input.refreshToken,
        input.expiresAt.toISOString(),
        input.scopes.join(' '),
        new Date().toISOString()
      ]
    });
  }

  async getToken(userId: string): Promise<TokenRow | null> {
    const result = await this.client.execute({
      sql: `SELECT user_id, access_token, refresh_token, expires_at, scopes
            FROM canva_tokens
            WHERE user_id = ?
            LIMIT 1`,
      args: [userId]
    });
    return (result.rows[0] as unknown as TokenRow | undefined) ?? null;
  }

  async cleanupExpired(now = new Date()): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM oauth_states WHERE expires_at <= ?',
      args: [now.toISOString()]
    });
  }
}
