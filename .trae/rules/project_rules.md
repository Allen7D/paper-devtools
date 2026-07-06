# paper-devtools 项目规则

## 项目概览

Chrome DevTools 扩展，为 Paper.js 应用提供调试环境。pnpm monorepo。

**技术栈**: Vite 7 + React 19 + Ant Design 6 + Zustand 5 + CRXJS (Chrome MV3) + Paper.js 0.12 + TypeScript 5.8

## 核心命令

```bash
pnpm run dev              # 启动扩展开发服务器
pnpm run build            # 构建扩展生产版本
pnpm run dev:example      # 启动示例应用
pnpm run build:example    # 构建示例应用
pnpm run dev:all          # 并行启动所有子项目
pnpm run build:all        # 构建所有子项目
pnpm run test:e2e         # 运行 E2E 测试（devtool-local，自动起 dev server）
pnpm --filter <name> <cmd>  # 单项目操作
```

> **严禁自行安装依赖**。如需 `pnpm install`，让用户手动操作。

## 子项目

| 子项目 | 路径 | 说明 |
|--------|------|------|
| extension | `packages/extension/` | Chrome 扩展（DevTools Panel + Popup + Content Script） |
| devtool-local | `packages/devtool-local/` | 本地运行版（脱离扩展，LocalBridge 同页面通信，用于开发/测试） |
| example | `packages/example/` | Paper.js 示例应用（多 Canvas 绘图工具） |

## 项目架构

### 三层通信架构

```
DevTools Panel (React) ──chrome.tabs.sendMessage──▶ Content Script ──CustomEvent──▶ Injected Scripts ──直接访问──▶ Paper.js API
```

- **Panel → Bridge → Content Script**: Panel Store 通过 `Bridge` 接口（`shared/bridge.ts`）发消息，扩展模式由 `ExtensionBridge` 封装 `chrome.tabs.sendMessage`。消息格式 `{ action, ...params }`
- **Content Script → Injected Script**: `CustomEvent('PAPER_DEVTOOLS_MESSAGE')`，携带 `messageId` 用于异步响应匹配
- **Injected Script → Content Script**: `CustomEvent('PAPER_DEVTOOLS_RESPONSE')`，携带相同 `messageId`

### 消息协议 (Action 列表)

| Action | 方向 | 用途 |
|--------|------|------|
| `DETECT_PAPER_JS` | Panel → Content | 检测页面是否有 Paper.js |
| `GET_SCENE_TREE` | Panel → Content → Inject | 获取当前激活 Scope 的场景树 |
| `SELECT_NODE` | Panel → Content → Inject | 选中指定节点 |
| `TOGGLE_NODE_VISIBILITY` | Panel → Content → Inject | 切换节点可见性 |
| `UPDATE_NODE_PROPERTY` | Panel → Content → Inject | 更新节点属性 |
| `GET_AVAILABLE_SCOPES` | Panel → Content → Inject | 获取所有可用 Scope 列表 |
| `SET_ACTIVE_SCOPE` | Panel → Content → Inject | 切换激活的 Scope |
| `SCOPE_ADDED` | Inject → Content → Panel (runtime.sendMessage) | 通知 Scope 新增 |
| `SCOPE_REMOVED` | Inject → Content → Panel (runtime.sendMessage) | 通知 Scope 移除 |

### 入口点速查

| 入口 | 文件 | 说明 |
|------|------|------|
| Content Script | `packages/extension/src/content/index.ts` | 注入检测脚本 + 消息中继 |
| DevTools | `packages/extension/src/devtools/index.ts` | 创建 DevTools 面板 |
| Panel | `packages/extension/src/panel/index.tsx` | React 面板入口 |
| Panel Store | `packages/extension/src/panel/store/index.ts` | Zustand 状态管理 |
| Inject (检测) | `packages/extension/src/inject/index.ts` | Paper.js 轮询检测 + MutationObserver |
| Inject (入口) | `packages/extension/src/inject/parse.ts` | 全局事件监听注册 + 消息路由器初始化 |
| Inject (场景树) | `packages/extension/src/inject/sceneTreeBuilder.ts` | 场景树构建 + 节点查找 |
| Inject (覆盖层) | `packages/extension/src/inject/overlayManager.ts` | 高亮覆盖层管理 |
| Inject (拾取器) | `packages/extension/src/inject/pickerMode.ts` | 拾取器模式 + Canvas 点击切换 Scope |
| Inject (爆炸预览) | `packages/extension/src/inject/explodeMode.ts` | Group 爆炸预览模式 |
| Inject (聚焦) | `packages/extension/src/inject/focusMode.ts` | 聚焦模式 |
| Inject (消息路由) | `packages/extension/src/inject/messageRouter.ts` | DevTools 消息分发 |
| Inject (属性提取) | `packages/extension/src/inject/extra.ts` | 属性提取函数 |
| Inject (初始化) | `packages/extension/src/inject/setup.ts` | initInject()：__PAPER_SCOPES__ 初始化 + 轮询 + Observer |
| 通信桥接接口 | `packages/extension/src/shared/bridge.ts` | Bridge 接口 + setBridge/getBridge 依赖注入 |
| 扩展桥接实现 | `packages/extension/src/shared/extensionBridge.ts` | ExtensionBridge：封装 chrome.tabs.sendMessage + onMessage |
| Background | `packages/extension/src/background/index.ts` | 骨架代码，仅监听安装事件 |
| MV3 清单 | `packages/extension/manifest.config.ts` | CRXJS defineManifest |
| Vite 配置 | `packages/extension/vite.config.ts` | 主构建配置 |
| Inject 构建 | `packages/extension/vite.inject.config.ts` | 注入脚本独立构建（IIFE 格式） |
| 示例入口 | `packages/example/src/index.ts` | 多 Canvas + PaperScope 管理 |
| 示例绘图 | `packages/example/src/draw.ts` | 绘图函数 createShapes |
| Local 入口 | `packages/devtool-local/src/main.tsx` | 本地运行版入口（Paper.js 场景 + Panel UI + LocalBridge） |
| Local 桥接 | `packages/devtool-local/src/localBridge.ts` | LocalBridge：同页面 CustomEvent 通信 |

### 组件树

```
App (packages/extension/src/panel/App.tsx)
├── 顶部状态栏: 标题 + 连接状态
└── Ant Design Splitter (左右分栏)
    ├── SceneTreeView (左面板)
    │   ├── Select (Scope 切换下拉框)
    │   ├── Button (刷新按钮)
    │   └── TreeNode (递归组件)
    └── PropertiesPanel (右面板)
        └── PropertyEditor (智能编辑器，8 种类型)
```

### 状态管理 (usePaperStore)

核心状态: `connected`, `connectionStatus`, `sceneTree`, `selectedNode`, `expandedNodes`, `availableScopes`, `activeScope`

核心 Actions: `initialize`, `refreshSceneTree`, `selectNode`, `toggleNodeVisibility`, `toggleNodeExpanded`, `updateNodeProperty`, `setActiveScope`, `getAvailableScopes`, `handleScopeAdded`, `handleScopeRemoved`

> `toggleNodeExpanded` 是唯一纯本地操作，不涉及 chrome API 通信。

### Paper.js 检测流程

```
inject/index.ts 轮询检测 (10次 × 1秒)
  → 检查 globalThis.__PAPER_SCOPE__
  → 发现 Paper.js → registerScopes() → 注册到 window.__PAPER_SCOPES__
  → dispatchEvent('PAPER_JS_DETECTED')
  → Content Script 监听到 → 注入 parse.js
  → 启动 MutationObserver 持续监听 Canvas 增删
  → Panel initialize() → DETECT_PAPER_JS → 确认连接
```

### 全局接口

`window.__PAPER_SCOPES__` 是多 Scope 管理核心数据结构:
- `scopes: Map<string, { scope, canvas, id }>` — 所有已注册的 Scope
- `activeScope: string | null` — 当前激活的 Scope ID
- `getActiveScope()` / `switchScope(scopeId)` / `getAllScopes()`

> `window.__PAPER_JS__` 已废弃，统一使用 `window.__PAPER_SCOPES__`。

## 构建配置要点

- **Inject 脚本独立构建**: `vite.inject.config.ts`，输出 IIFE 格式到 `dist/inject/`，避免全局污染
- **自定义插件 `inject-manifest-plugin`**: 构建后自动更新 manifest.json 的 `web_accessible_resources`
- **路径别名**: `@/` → `src/`
- **CRXJS**: 提供 HMR，修改代码后自动重载
- **Less**: `javascriptEnabled: true` 用于 Ant Design 主题编译

## 代码规范

| 类别 | 规范 | 示例 |
|------|------|------|
| React 组件 | PascalCase | `SceneTreeView`, `PropertiesPanel` |
| Store | `useXxxStore` | `usePaperStore` |
| 工具函数 | camelCase | `extractItemProperties` |
| 类型/接口 | PascalCase | `PaperNode`, `PaperStore` |
| 常量 | UPPER_SNAKE_CASE | `MAX_TRIES`, `POLLING_INTERVAL_MS` |
| 事件名 | UPPER_SNAKE_CASE | `PAPER_JS_DETECTED` |
| CSS 类名 | kebab-case | `scene-tree-container` |
| 组件文件与样式 | 同目录 | `TreeNode.tsx` + `TreeNode.less` |

## 设计决策

1. **CustomEvent 而非 postMessage**: 注入脚本和 Content Script 通过 DOM 事件通信，无需序列化，支持 `detail` 携带任意结构化数据
2. **run_at: document_start**: 必须在 Paper.js 初始化之前开始监听
3. **Inject 独立构建**: 运行在页面上下文（非扩展隔离环境），需 IIFE 格式，无法使用 `chrome.runtime` API

## 测试验证

每次代码修改完成后，必须运行 `npx vitest run` 确保所有测试通过；如果测试失败，必须修复问题直到测试全部通过。

### 测试文件组织约定

- 测试文件与源文件**命名一一对应**：源文件 `src/xxx/yyy.ts` → 测试文件 `src/xxx/__tests__/yyy.test.ts`。
- 测试文件统一放源文件同目录的 `__tests__/` 子目录下，便于按文件名快速定位被测模块。
- 禁止在源文件旁直接建 `.test.ts`（避免与 `__tests__/` 重复）。
- 修改源文件后，同步检查对应 `__tests__/yyy.test.ts` 是否需要更新。

### 测试影响评估（改动后必做）

每次改动后，按以下决策树判断是否需要新增/改进单元测试，并对照 `docs/PROJECT_KNOWLEDGE.md` 的"模块可测性地图"：

1. **判断改动类型**
   - 纯函数 / 工具函数 / 类型定义 → 必须补单测
   - 核心可测逻辑（`sceneTreeBuilder` / `messageRouter` / `extra` 等高可测性模块）→ 必须补单测
   - Bug 修复 → 先写复现测试（红），再修复（绿）
   - UI 组件渲染 / 交互 → 补组件测试（引入 `@testing-library` 后）
   - Chrome API / Paper.js 上下文调用 → 用 mock 补集成测试；无法 mock 的标注"需手动验证"
   - 样式 / 类型 / 文档 / 配置 → 跳过

2. **检查是否改变已有测试覆盖的行为** → 是则更新对应测试

3. **跑 `npx vitest run`**，全绿才算完成

### 测试文档同步

补测后，更新 `docs/PROJECT_KNOWLEDGE.md` 的"模块可测性地图"中对应模块的"当前覆盖"列。

## 项目知识文档维护

每次 Agent 完成会改变项目结构、模块职责、数据流、技术栈、设计决策或技术债务的改动后，必须同步更新 [docs/PROJECT_KNOWLEDGE.md](../../docs/PROJECT_KNOWLEDGE.md) 对应章节，确保该文件始终反映项目当前真实状态。

- **结构性改动**（新增模块、重构架构、更换技术栈、关键决策变更）：额外在文档"近期重要变更"表追加一行（日期、类型、摘要、涉及模块、关联文件）。
- **纯 Bug 修复 / 样式微调**：无需更新变更表，但若改变了文档已描述的行为，仍需修正对应章节。
- **发现过时内容**：直接修正，不保留历史。

> 该文档是人和 Agent 了解项目的入口，定位为"活文档"，与本项目规则文件互补。

## 已知技术债务

| 项目 | 状态 |
|------|------|
| 测试架构 | ⚠️ 部分建立（inject 全层 + panel store/utils 已覆盖，content/UI 未覆盖） |
| Background Script | ⚠️ 空实现 |
| Extension ESLint | ⚠️ 未配置（仅 example 项目有） |
| 错误处理 | ⚠️ 基础级别，缺少统一错误处理机制 |
| 多 Scope 边界情况 | ⚠️ 部分实现 |

## 上下文加载规则

根据任务关键词，按需读取 `.claude/context/` 下的上下文文件：

| 任务关键词 | 加载文件 |
|------------|----------|
| 通信、消息、Content Script、CustomEvent | `.claude/context/communication.md` |
| 组件、UI、面板、属性编辑、TreeNode | `.claude/context/components.md` |
| 状态、store、Zustand、数据流 | `.claude/context/state.md` |
| Paper.js、Scope、Canvas、检测、parse、inject | `.claude/context/paper-integration.md` |
| 构建、Vite、CRXJS、TypeScript、配置 | `.claude/context/build-config.md` |
| 扩展、入口、权限、Manifest | `.claude/context/extension-arch.md` |
| 规范、风格、约定、设计决策 | `.claude/context/conventions.md` |

**使用方式**: Agent 在理解任务后、动手操作前，先 Read 匹配的上下文文件。多个关键词匹配时，读取所有匹配的文件。
