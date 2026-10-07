import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

const migrations = await readD1Migrations(new URL('./site/migrations', import.meta.url).pathname);

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './site/wrangler.jsonc' },
            miniflare: {
              bindings: {
                TEST_MIGRATIONS: migrations,
                ADMIN_TOKEN: 'test-admin',
                IP_HASH_SECRET: 'test-secret',
              },
            },
          }),
        ],
        test: {
          name: 'site',
          include: ['site/test/**/*.test.ts'],
          setupFiles: ['./site/test/apply-migrations.ts'],
        },
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './canva/wrangler.jsonc' },
            miniflare: { bindings: { GIFTSCANVA_API_KEYS: 'good-key,second-key' } },
          }),
        ],
        test: { name: 'canva', include: ['canva/test/**/*.test.ts'] },
      },
    ],
  },
});
