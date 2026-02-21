// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import partytown from '@astrojs/partytown';

// https://astro.build/config
export default defineConfig({
  integrations: [partytown({
    config: {
      forward: ["sa_event"]
    }
  })],
  vite: {
    plugins: [tailwindcss()]
  }
});