import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' lets the built app run from any folder (GitHub Pages, Netlify)
export default defineConfig({
  plugins: [react()],
  base: './',
})
