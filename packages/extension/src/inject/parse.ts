import { syncAllOverlays, clearAllOverlays } from "./overlayManager";
import { setupCanvasClickListeners, getAutoSwitchScope } from "./pickerMode";
import { clearFocusState } from "./focusMode";
import { initMessageRouter } from "./messageRouter";
import { INJECT_EVENT } from "@/shared/constants";

/**
 * Injected Script 入口模块。
 *
 * 负责注册全局事件监听器（场景变化、窗口缩放/滚动、Scope 切换），
 * 并初始化消息路由器以处理来自 DevTools Panel 的消息。
 *
 * 场景树构建、覆盖层管理、拾取器、爆炸预览、聚焦模式等逻辑
 * 分别拆分到独立模块中，由本文件组装。
 */

/**
 * 监听 `PAPER_SCENE_CHANGED` 事件，场景变化时同步更新所有覆盖层位置。
 */
window.addEventListener(INJECT_EVENT.PAPER_SCENE_CHANGED, () => {
  syncAllOverlays();
});

/**
 * 监听窗口 `resize` 事件，窗口尺寸变化时同步更新覆盖层位置。
 */
window.addEventListener('resize', () => {
  syncAllOverlays();
});

/**
 * 监听窗口 `scroll` 事件（捕获阶段），页面滚动时同步更新覆盖层位置。
 */
window.addEventListener('scroll', () => {
  syncAllOverlays();
}, true);

/**
 * 监听 `PAPER_SCOPE_CHANGE` 事件，Scope 切换时清除所有覆盖层并重新绑定 Canvas 点击监听。
 */
window.addEventListener(INJECT_EVENT.PAPER_SCOPE_CHANGE, () => {
  clearAllOverlays();
  clearFocusState();
  if (getAutoSwitchScope()) {
    setupCanvasClickListeners();
  }
});

// 初始化消息路由器，处理 DevTools Panel 发来的消息
initMessageRouter();
