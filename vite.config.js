import path from 'path';
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  resolve:{
    alias:{
      '@' : path.resolve(__dirname, './src')
    },
  },
  plugins: [vue()],
  server: {
    proxy: {
      '/api/': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
