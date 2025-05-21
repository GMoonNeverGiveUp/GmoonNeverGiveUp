// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    // required by @astrojs/node starting v0.6+
    mode: 'production'
  }),
  site: 'https://gmoonnervergiveup.on.fleek.co/'
});
