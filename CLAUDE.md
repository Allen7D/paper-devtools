# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 React + TypeScript + Vite + CRXJS 的 Chrome 浏览器扩展项目。项目名称为 "paper-devtools"，目标是为 Paper.js 应用提供开发者工具扩展。

## 核心技术栈

- **构建工具**: Vite 7.0.5 + TypeScript 5.8.3
- **前端框架**: React 19.1.0 + React DOM 19.1.0
- **扩展开发**: @crxjs/vite-plugin 2.0.3 (Chrome Extension MV3)
- **包管理器**: pnpm (根据 pnpm-lock.yaml)

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build

# 预览构建结果
pnpm run preview
```

## 项目架构

### 扩展程序结构
- **Popup UI**: `src/popup/` - 扩展弹窗界面 (点击图标显示)
- **Content Scripts**: `src/content/` - 注入到网页的脚本
- **Background Scripts**: `src/background/` - 后台服务 (目前为空)
- **DevTools**: `src/devtools/` - 开发者工具面板 (目前为空)
- **Shared**: `src/shared/` - 共享代码和类型定义

### 入口点
- **Popup**: `src/popup/main.tsx` → `src/popup/index.html`
- **Content Script**: `src/content/main.tsx` (注入到所有 https 页面)

### 配置文件
- **manifest.config.ts**: Chrome 扩展清单配置 (MV3)
- **vite.config.ts**: Vite + CRXJS 插件配置，包含路径别名 `@/` → `src/`
- **package.json**: 项目依赖和脚本配置

## 关键配置

### 路径别名
项目配置了 `@/` 作为 `src/` 目录的别名，可以使用绝对路径导入：
```typescript
import HelloWorld from '@/components/HelloWorld'
import crxLogo from '@/assets/crx.svg'
```

### 扩展权限
- **matches**: `['https://*/*']` - 在所有 HTTPS 网站注入 content script
- **icons**: 使用 `public/logo.png` 作为扩展图标
- **popup**: 点击图标显示 `src/popup/index.html`

### 构建输出
- **开发模式**: Vite 开发服务器 + HMR
- **生产构建**: TypeScript 编译 + Vite 构建 → `dist/` 目录
- **发布打包**: 使用 vite-plugin-zip-pack 生成 `release/crx-{name}-{version}.zip`

## Content Script 架构

Content script 在页面中创建独立的 React 应用：
```typescript
// 创建容器元素
const container = document.createElement('div')
container.id = 'crxjs-app'
document.body.appendChild(container)

// 渲染 React 应用
createRoot(container).render(<App />)
```

## 开发注意事项

### Chrome 扩展加载
1. 运行 `pnpm run dev` 启动开发服务器
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"，选择项目的 `dist` 目录

### 热重载支持
- CRXJS 插件提供热重载功能
- 修改代码后扩展会自动重新加载
- Content script 和 popup 都支持热重载

### TypeScript 配置
项目使用复合 TypeScript 配置：
- `tsconfig.json` - 根配置文件
- `tsconfig.app.json` - 应用代码配置
- `tsconfig.node.json` - Node.js 环境配置

### CORS 配置
开发服务器配置了 CORS 以支持 chrome-extension:// 协议访问。

## 当前实现状态

- ✅ Popup UI 基础框架 (HelloWorld 组件)
- ✅ Content Script 注入机制 (带切换按钮)
- ⚠️ Background script 目录存在但为空
- ⚠️ DevTools 目录存在但为空
- ⚠️ Shared 类型定义目录为空