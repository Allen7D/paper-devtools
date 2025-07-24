# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 pnpm workspaces 管理的 monorepo 项目，包含两个子项目：
1. **Chrome 扩展** (packages/extension) - 为 Paper.js 应用提供开发者工具
2. **示例应用** (packages/example) - Paper.js 绘图工具演示应用

项目名称为 "paper-devtools"，主要目标是为 Paper.js 应用提供完整的开发调试环境。

## 核心技术栈

- **monorepo 管理**: pnpm workspaces
- **构建工具**: Vite 7.0.5 + TypeScript 5.8.3
- **前端框架**: React 19.1.0 + React DOM 19.1.0
- **UI 库**: Ant Design 5.26.6 + Less 4.4.0
- **状态管理**: Zustand 5.0.6
- **扩展开发**: @crxjs/vite-plugin 2.0.3 (Chrome Extension MV3)
- **Paper.js**: 0.12.18

## 项目结构

```
project-root/
├── pnpm-workspace.yaml     # pnpm workspace 配置
├── package.json            # 根配置文件
├── tsconfig.json           # TypeScript 根配置
└── packages/               # 子项目目录
    ├── extension/          # Chrome 扩展
    │   ├── src/            # 扩展源码
    │   ├── public/         # 静态资源
    │   ├── package.json    # 扩展项目配置
    │   ├── vite.config.ts  # Vite 配置
    │   └── manifest.config.ts # Chrome 扩展清单
    └── example/            # Paper.js 示例应用
        ├── src/            # 示例源码
        ├── package.json    # 示例项目配置
        └── vite.config.ts  # Vite 配置
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

# 启动示例应用开发服务器
pnpm run dev:example

# 构建示例应用
pnpm run build:example

# 预览示例应用
pnpm run preview:example

# 运行示例应用 ESLint 检查
pnpm run lint:example

# 并行启动所有子项目
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

# 只在 example 项目中执行命令
pnpm --filter example dev
pnpm --filter example build
pnpm --filter example lint

# 在所有项目中并行执行
pnpm -r --parallel dev
```

## 扩展架构 (packages/extension)

### 扩展程序结构
- **Popup UI**: `packages/extension/src/popup/` - 扩展弹窗界面 (点击图标显示)
- **Content Scripts**: `packages/extension/src/content/` - 注入到网页的脚本
- **Background Scripts**: `packages/extension/src/background/` - 后台服务 (目前为空)
- **DevTools Panel**: `packages/extension/src/devtools/` - 开发者工具面板入口
- **Panel UI**: `packages/extension/src/panel/` - DevTools 面板界面 (React + Zustand)
- **Shared**: `packages/extension/src/shared/` - 共享代码和类型定义

### 入口点
- **Popup**: `packages/extension/src/popup/main.tsx` → `packages/extension/src/popup/index.html`
- **Content Script**: `packages/extension/src/content/index.ts` (注入到所有 https 页面)
- **DevTools Panel**: `packages/extension/src/devtools/index.ts` → `packages/extension/src/panel/index.tsx`

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

## DevTools 面板架构

扩展实现了完整的 Chrome DevTools 面板，用于调试 Paper.js 应用：

### 状态管理 (Zustand)
核心状态存储在 `packages/extension/src/panel/store/index.ts`：
- **连接状态**: 检测页面中的 Paper.js 实例
- **场景树**: Paper.js 对象层次结构
- **节点选择**: 当前选中的场景对象
- **属性编辑**: 实时修改对象属性

### 面板组件
- **SceneTreeView**: 显示 Paper.js 场景树层次结构
- **PropertiesPanel**: 显示和编辑选中对象的属性
- **App**: 主面板容器组件

### 通信机制
通过 `chrome.tabs.sendMessage` 与页面中的 Content Script 通信：
- `DETECT_PAPER_JS`: 检测页面中是否存在 Paper.js
- `GET_SCENE_TREE`: 获取场景对象树
- `SELECT_NODE`: 选择特定节点
- `TOGGLE_NODE_VISIBILITY`: 切换节点可见性
- `UPDATE_NODE_PROPERTY`: 更新节点属性

## Paper.js 示例应用 (packages/example)

### 功能特点
- **Canvas 容器**: 基于 Paper.js 的绘图画布
- **工具面板**: 多种绘图工具 (矩形、圆形、线条、自由绘制等)
- **头部导航**: 应用标题和工具栏
- **底部信息**: 状态信息显示

### 绘图工具系统
位于 `packages/example/src/utils/tools/`：
- **BaseTool**: 工具基类，定义通用接口
- **具体工具**: RectangleTool, CircleTool, LineTool, FreehandTool 等
- **ToolManager**: 工具管理器，处理工具切换和事件

### Paper.js 集成
- **paperSetup.ts**: Paper.js 初始化和配置
- **paperShapes.ts**: 预定义形状和绘图辅助函数
- **paperTools.ts**: Paper.js 工具事件处理

## 当前实现状态

- ✅ pnpm workspaces 结构
- ✅ Chrome 扩展基础架构
- ✅ DevTools 面板 (React + Zustand + Ant Design)
- ✅ Paper.js 场景树检测和显示
- ✅ 节点选择和属性编辑功能
- ✅ Paper.js 示例应用 (完整绘图工具)
- ✅ 多种绘图工具 (矩形、圆形、线条、自由绘制等)
- ⚠️ Background script 目录存在但为空
- ⚠️ Content Script 实现需要完善
- ⚠️ 场景树数据结构需要优化