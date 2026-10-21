import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works at https://<user>.github.io/time-tree-v1/ and locally.
export default defineConfig({
  base: './',
  plugins: [react()],
})
