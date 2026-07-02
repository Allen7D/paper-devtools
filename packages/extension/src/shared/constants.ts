/**
 * Paper DevTools 共享常量
 *
 * 定义跨文件、跨上下文通信使用的字符串常量，避免拼写错误并集中维护。
 * 适用于 Content Script、Injected Script 和 DevTools Panel Store。
 *
 * 注意：Inject 脚本以 IIFE 格式独立构建，这些常量在构建时会被内联到产物中，
 * 不产生运行时对扩展上下文的依赖。
 */

/**
 * DevTools Panel 与 Content Script 之间的消息 Action。
 *
 * 通信路径：Panel ──chrome.tabs.sendMessage──▶ Content Script ──CustomEvent──▶ Injected Script
 * 响应路径：Injected Script ──CustomEvent──▶ Content Script ──sendResponse──▶ Panel
 */
export const PANEL_ACTION = {
  /** 检测页面是否加载了 Paper.js */
  DETECT_PAPER_JS: 'DETECT_PAPER_JS',
  /** 获取当前激活 Scope 的场景树 */
  GET_SCENE_TREE: 'GET_SCENE_TREE',
  /** 选中指定节点 */
  SELECT_NODE: 'SELECT_NODE',
  /** 切换节点可见性 */
  TOGGLE_NODE_VISIBILITY: 'TOGGLE_NODE_VISIBILITY',
  /** 更新节点属性 */
  UPDATE_NODE_PROPERTY: 'UPDATE_NODE_PROPERTY',
  /** 获取所有可用 Scope 列表 */
  GET_AVAILABLE_SCOPES: 'GET_AVAILABLE_SCOPES',
  /** 切换激活的 Scope */
  SET_ACTIVE_SCOPE: 'SET_ACTIVE_SCOPE',
  /** 获取指定节点的详细信息 */
  GET_NODE_INFO: 'GET_NODE_INFO',
  /** 高亮指定节点 */
  HIGHLIGHT_NODE: 'HIGHLIGHT_NODE',
  /** 清除高亮覆盖层 */
  CLEAR_HIGHLIGHT: 'CLEAR_HIGHLIGHT',
  /** 启用/禁用选中高亮覆盖层 */
  SET_OVERLAY_ENABLED: 'SET_OVERLAY_ENABLED',
  /** 启用拾取器模式 */
  ENABLE_PICKER: 'ENABLE_PICKER',
  /** 禁用拾取器模式 */
  DISABLE_PICKER: 'DISABLE_PICKER',
  /** 启用/禁用点击 Canvas 自动切换 Scope */
  SET_AUTO_SWITCH_SCOPE: 'SET_AUTO_SWITCH_SCOPE',
  /** 获取自动切换 Scope 的启用状态 */
  GET_AUTO_SWITCH_SCOPE: 'GET_AUTO_SWITCH_SCOPE',
  /** DevTools 关闭时清理资源 */
  DEVTOOLS_CLEANUP: 'DEVTOOLS_CLEANUP',
} as const;

/**
 * Injected Script 与 Content Script 之间的 CustomEvent 事件名。
 *
 * 通信方式：window.dispatchEvent(new CustomEvent(name, { detail }))
 */
export const INJECT_EVENT = {
  /** Paper.js 已检测到（Inject → Content） */
  PAPER_JS_DETECTED: 'PAPER_JS_DETECTED',
  /** DevTools 消息请求（Content → Inject） */
  PAPER_DEVTOOLS_MESSAGE: 'PAPER_DEVTOOLS_MESSAGE',
  /** DevTools 消息响应（Inject → Content） */
  PAPER_DEVTOOLS_RESPONSE: 'PAPER_DEVTOOLS_RESPONSE',
  /** 场景树发生变化（Inject → Content） */
  PAPER_SCENE_CHANGED: 'PAPER_SCENE_CHANGED',
  /** Scope 列表发生变化（Inject → Content） */
  PAPER_SCOPE_CHANGE: 'PAPER_SCOPE_CHANGE',
  /** 拾取器选中结果（Inject → Content） */
  PAPER_PICKER_RESULT: 'PAPER_PICKER_RESULT',
} as const;

/**
 * Content Script 通过 chrome.runtime.sendMessage 向 Panel 转发的事件 Action。
 *
 * 通信路径：Content Script ──chrome.runtime.sendMessage──▶ Panel (chrome.runtime.onMessage)
 */
export const RUNTIME_ACTION = {
  /** Scope 列表变化通知 */
  SCOPE_CHANGE: 'SCOPE_CHANGE',
  /** 场景树变化通知 */
  SCENE_CHANGE: 'SCENE_CHANGE',
  /** 拾取器选中结果通知 */
  PICKER_RESULT: 'PICKER_RESULT',
} as const;

/**
 * 高亮覆盖层类型。
 *
 * - `SELECTED`：红色实线边框，标记当前选中的图元
 * - `HOVER`：蓝色虚线边框，用于拾取器模式下的悬停预览
 */
export const HIGHLIGHT_TYPE = {
  SELECTED: 'selected',
  HOVER: 'hover',
} as const;

/** 高亮覆盖层类型联合（`'selected' | 'hover'`） */
export type HighlightType = (typeof HIGHLIGHT_TYPE)[keyof typeof HIGHLIGHT_TYPE];
