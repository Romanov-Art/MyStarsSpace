import type { Env as SiteEnv } from '../src/index.js';

// `env` from cloudflare:test / cloudflare:workers is typed as Cloudflare.Env
declare global {
  namespace Cloudflare {
    interface Env extends SiteEnv {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
