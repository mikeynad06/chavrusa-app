import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // The Privacy Policy and Terms are imported with ?raw from ../docs/legal, outside this folder.
      // The production build reads them directly; the dev server needs permission to serve them.
      allow: [searchForWorkspaceRoot(process.cwd()), path.resolve(__dirname, '../docs/legal')],
    },
  },
})
