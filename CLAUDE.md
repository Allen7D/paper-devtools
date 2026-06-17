# paper-devtools

Chrome DevTools 扩展，为 Paper.js 应用提供调试环境。pnpm monorepo。

## 技术栈

Vite 7 + React 19 + Ant Design 5 + Zustand 5 + CRXJS (Chrome MV3) + Paper.js 0.12 + TypeScript 5.8

## 核心命令

```bash
pnpm run dev              # 启动扩展开发服务器
pnpm run build            # 构建扩展生产版本
pnpm run dev:example      # 启动示例应用
pnpm run build:example    # 构建示例应用
pnpm run dev:all          # 并行启动所有子项目
pnpm run build:all        # 构建所有子项目
pnpm --filter <name> <cmd>  # 单项目操作
```

> **严禁自行安装依赖**。如需 `pnpm install`，让用户手动操作。

## 子项目

| 子项目 | 路径 | 说明 |
|--------|------|------|
| extension | `packages/extension/` | Chrome 扩展（DevTools Panel + Popup + Content Script） |
| example | `packages/example/` | Paper.js 示例应用（多 Canvas 绘图工具） |

## 上下文加载规则

根据任务关键词，按需读取 `.claude/context/` 下的上下文文件：

| 任务关键词 | 加载文件 |
|------------|----------|
| 通信、消息、Content Script、CustomEvent、chrome.runtime、sendMessage | `.claude/context/communication.md` |
| 组件、UI、面板、属性编辑、TreeNode、SceneTree、PropertiesPanel | `.claude/context/components.md` |
| 状态、store、Zustand、数据流、usePaperStore | `.claude/context/state.md` |
| Paper.js、Scope、Canvas、检测、parse、inject、PaperScope | `.claude/context/paper-integration.md` |
| 构建、Vite、CRXJS、TypeScript、配置、tsconfig、pnpm | `.claude/context/build-config.md` |
| 扩展、入口、权限、Manifest、popup、devtools、background | `.claude/context/extension-arch.md` |
| 规范、风格、约定、设计决策、技术债务、命名 | `.claude/context/conventions.md` |

**使用方式**: Agent 在理解任务后、动手操作前，先 Read 匹配的上下文文件。多个关键词匹配时，读取所有匹配的文件。

## 项目入口点速查

| 入口 | 文件 |
|------|------|
| Content Script | `packages/extension/src/content/index.ts` |
| DevTools Panel | `packages/extension/src/panel/index.tsx` |
| Panel Store | `packages/extension/src/panel/store/index.ts` |
| Inject (检测) | `packages/extension/src/inject/index.ts` |
| Inject (解析) | `packages/extension/src/inject/parse.ts` |
| Inject (属性提取) | `packages/extension/src/inject/extra.ts` |
| 示例入口 | `packages/example/src/index.ts` |
| 示例绘图 | `packages/example/src/draw.ts` |
| MV3 清单 | `packages/extension/manifest.config.ts` |
| Vite 配置 | `packages/extension/vite.config.ts` |
| Inject 构建 | `packages/extension/vite.inject.config.ts` |
