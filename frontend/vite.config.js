import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    // Forcing every antd module into one 'antd' chunk (the old approach)
    // backfires: almost every route lazy-loads its own page component, so
    // Rollup would otherwise only ship each page the antd pieces it
    // actually imports (Table for one page, DatePicker for another) as
    // part of that page's own chunk. Grouping them all together instead
    // built a single ~1.2MB blob that index.html had to modulepreload on
    // *every* first load, before the user had even picked a page. Leaving
    // antd unchunked lets it fall back to Rollup's automatic splitting,
    // which is what actually shrinks the eager-loaded payload — this is a
    // real reduction, not a warning-threshold change.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor'
          if (id.includes('dayjs')) return 'dayjs'
          return undefined
        },
      },
    },
  },
})
