# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 pnpm workspaces 管理的 monorepo 项目，主要包含一个 Chrome 浏览器扩展。项目名称为 "paper-devtools"，目标是为 Paper.js 应用提供开发者工具扩展。

## 核心技术栈

- **monorepo 管理**: pnpm workspaces
- **构建工具**: Vite 7.0.5 + TypeScript 5.8.3
- **前端框架**: React 19.1.0 + React DOM 19.1.0
- **扩展开发**: @crxjs/vite-plugin 2.0.3 (Chrome Extension MV3)

## 项目结构

```
project-root/
├── pnpm-workspace.yaml     # pnpm workspace 配置
├── package.json            # 根配置文件
├── tsconfig.json           # TypeScript 根配置
└── packages/               # 子项目目录
    └── extension/          # Chrome 扩展
        ├── src/            # 扩展源码
        ├── public/         # 静态资源
        ├── package.json    # 扩展项目配置
        ├── vite.config.ts  # Vite 配置
        └── manifest.config.ts # Chrome 扩展清单
```

## 开发命令

```bash
# 安装所有依赖
pnpm install

# 启动扩展开发服务器
pnpm run dev

# 构建扩展生产版本
pnpm run build

# 预览扩展构建结果
pnpm run preview

# 并行启动所有子项目（如果有多个）
pnpm run dev:all

# 构建所有子项目
pnpm run build:all
```

## Workspace 管理

### 添加新的子项目
在 `packages/` 目录下创建新项目，确保包含 `package.json`。

### 子项目间依赖
使用 workspace 协议引用其他子项目：
```json
{
  "dependencies": {
    "@paper-devtools/shared": "workspace:*"
  }
}
```

### 过滤命令执行
```bash
# 只在 extension 项目中执行命令
pnpm --filter extension dev
pnpm --filter extension build

# 在所有项目中并行执行
pnpm -r --parallel dev
```

## 扩展架构 (packages/extension)

### 扩展程序结构
- **Popup UI**: `packages/extension/src/popup/` - 扩展弹窗界面 (点击图标显示)
- **Content Scripts**: `packages/extension/src/content/` - 注入到网页的脚本
- **Background Scripts**: `packages/extension/src/background/` - 后台服务 (目前为空)
- **DevTools**: `packages/extension/src/devtools/` - 开发者工具面板 (目前为空)
- **Shared**: `packages/extension/src/shared/` - 共享代码和类型定义

### 入口点
- **Popup**: `packages/extension/src/popup/main.tsx` → `packages/extension/src/popup/index.html`
- **Content Script**: `packages/extension/src/content/main.tsx` (注入到所有 https 页面)

### 配置文件
- **manifest.config.ts**: Chrome 扩展清单配置 (MV3)
- **vite.config.ts**: Vite + CRXJS 插件配置，包含路径别名 `@/` → `src/`
- **package.json**: 扩展项目依赖和脚本配置

## 关键配置

### 路径别名
扩展项目配置了 `@/` 作为 `src/` 目录的别名，可以使用绝对路径导入：
```typescript
import HelloWorld from '@/components/HelloWorld'
import crxLogo from '@/assets/crx.svg'
```

### 扩展权限
- **matches**: `['https://*/*']` - 在所有 HTTPS 网站注入 content script
- **icons**: 使用 `packages/extension/public/logo.png` 作为扩展图标
- **popup**: 点击图标显示 `packages/extension/src/popup/index.html`

### 构建输出
- **开发模式**: Vite 开发服务器 + HMR
- **生产构建**: TypeScript 编译 + Vite 构建 → `packages/extension/dist/` 目录
- **发布打包**: 使用 vite-plugin-zip-pack 生成 `packages/extension/release/crx-{name}-{version}.zip`

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
4. 点击"加载已解压的扩展程序"，选择 `packages/extension/dist` 目录

### 热重载支持
- CRXJS 插件提供热重载功能
- 修改代码后扩展会自动重新加载
- Content script 和 popup 都支持热重载

### TypeScript 配置
项目使用复合 TypeScript 配置：
- 根目录 `tsconfig.json` - 引用所有子项目
- `packages/extension/tsconfig.app.json` - 扩展应用代码配置
- `packages/extension/tsconfig.node.json` - Node.js 环境配置

### CORS 配置
开发服务器配置了 CORS 以支持 chrome-extension:// 协议访问。

## 当前实现状态

- ✅ pnpm workspaces 结构
- ✅ Popup UI 基础框架 (HelloWorld 组件)
- ✅ Content Script 注入机制 (带切换按钮)
- ⚠️ Background script 目录存在但为空
- ⚠️ DevTools 目录存在但为空
- ⚠️ Shared 类型定义目录为空