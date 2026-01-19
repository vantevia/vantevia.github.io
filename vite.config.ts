import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // REPLACE 'repo-name' with your GitHub project name
  plugins: [react()],
})
