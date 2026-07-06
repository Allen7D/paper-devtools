import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// devtool-local 独立运行版本：脱离 Chrome 扩展，同页面直接跑 Paper.js + Panel UI
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 复用 extension 包的源码（shared / inject / panel）
      '@': resolve(__dirname, '../extension/src'),
    },
  },
  css: {
    preprocessorOptions: {
      less: { javascriptEnabled: true },
    },
  },
});
