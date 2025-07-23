import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
