// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kingwatam.github.io',
  integrations: [sitemap()],
  prefetch: {
    prefetchAll: true,
  },
  server: {
    // Dev-only: permits previewing through tunnels (cloudflared/ngrok).
    // Has no effect on production builds.
    allowedHosts: true,
  },
});
