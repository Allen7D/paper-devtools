import path from 'node:path';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import fs from 'node:fs';
import zip from 'vite-plugin-zip-pack';
import manifest from './manifest.config.js';
import { name, version } from './package.json';

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
        // 注入脚本由独立的 vite.inject.config.ts 配置处理
      },
    },
  },
  plugins: [
    react(),
    crx({ manifest }),
    zip({ outDir: 'release', outFileName: `crx-${name}-${version}.zip` }),
    {
      name: 'inject-manifest-plugin',
      enforce: 'post',
      writeBundle() {
        // 自动更新 manifest.json 的 web_accessible_resources
        const manifestPath = path.resolve(__dirname, 'dist/chrome/manifest.json')
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
          if (manifest.web_accessible_resources && manifest.web_accessible_resources[0]) {
            const resources = manifest.web_accessible_resources[0].resources
            if (!resources.includes('inject/index.js')) {
              resources.push('inject/index.js')
            }
            if (!resources.includes('inject/parse.js')) {
              resources.push('inject/parse.js')
            }
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
          }
        }
      },
    },
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
      origin: [/chrome-extension:\/\//],
    },
  },
});
