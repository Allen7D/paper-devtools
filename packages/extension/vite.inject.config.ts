import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// 专门用于构建注入脚本的 Vite 配置
export default defineConfig((config) => {
  const isDev = config.mode === 'development';
  const outDir = isDev ? 'dist' : 'dist';

  return {
    root: resolve(__dirname, 'src/'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    plugins: [
      {
        name: 'wrap-in-iife',
        generateBundle(_outputOptions, bundle) {
          // 为注入脚本添加 IIFE 包装，避免全局污染
          Object.keys(bundle).forEach((fileName) => {
            const file = bundle[fileName];
            if (fileName.slice(-3) === '.js' && 'code' in file) {
              file.code = `(() => {\n${file.code}})()`;
            }
          });
        },
      },
    ],
    build: {
      lib: {
        entry: ['inject/index.ts', 'inject/parse.ts'],
        fileName: (format, name) => `${name}.js`,
        formats: ['es'],
      },
      target: 'es2020',
      outDir: resolve(__dirname, `${outDir}/inject`),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
  };
});
