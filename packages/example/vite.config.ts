import path from 'path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { inspectorServer } from '@react-dev-inspector/vite-plugin';
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), inspectorServer()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // 让 @ 指向 example/src
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        // 可选：自定义 antd 主题
        modifyVars: {
          // '@primary-color': '#1890ff',
          // 主题变量...
        },
      },
    },
  },
})
