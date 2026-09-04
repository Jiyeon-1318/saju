import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, type PluginOption } from 'vite';

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: [],
  r2_buckets: [],
};

export default defineConfig(async ({ command }) => {
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  const cloudflarePlugins: PluginOption[] = [];

  if (command === 'build') {
    const { cloudflare } = await import('@cloudflare/vite-plugin');

    cloudflarePlugins.push(
      cloudflare({
        viteEnvironment: {
          name: 'rsc',
          childEnvironments: ['ssr'],
        },
        config: localBindingConfig,
      }),
    );
  }

  return {
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },
    optimizeDeps:
      command === 'serve'
        ? {
            noDiscovery: true,
            include: [],
          }
        : undefined,
    server: isCodexSeatbeltSandbox
      ? {
          watch: {
            useFsEvents: false,
            usePolling: true,
          },
        }
      : undefined,
    plugins: [vinext(), ...cloudflarePlugins],
  };
});
