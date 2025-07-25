import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.js'
import { name, version } from './package.json'

export default defineConfig({
  resolve: {
    alias: {
      '@': `${path.resolve(__dirname, 'src')}`,
    },
  },
  build: {
    rollupOptions: {
      input: {
        panel: path.resolve(__dirname, 'src/panel/index.html'),
        // 添加注入脚本的构建入口点
        'index': path.resolve(__dirname, 'src/inject/index.ts'),
        'parse': path.resolve(__dirname, 'src/inject/parse.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'index') {
            return 'inject/index.js';
          } else if (chunkInfo.name === 'parse') {
            return 'inject/parse.js';
          }
          return '[name]-[hash].js';
        }
      }
    },
  },
  plugins: [
    react(),
    crx({ manifest }),
    zip({ outDir: 'release', outFileName: `crx-${name}-${version}.zip` }),
  ],
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
  server: {
    cors: {
      origin: [
        /chrome-extension:\/\//,
      ],
    },
  },
})
