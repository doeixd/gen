import { defineConfig } from 'vite'
import { createEntityDiscoveryPlugin } from '@doeixd/gen'

export default defineConfig({
  plugins: [
    createEntityDiscoveryPlugin({
      include: ['src/**/*.entity.ts'],
      strict: true,
    }),
  ],
})
