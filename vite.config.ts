import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Hosted at changh95.github.io/efficient-ai-infrastructure
// (routed to www.cv-learn.com/efficient-ai-infrastructure — same base path)
export default defineConfig({
  plugins: [react()],
  base: '/efficient-ai-infrastructure/',
})
