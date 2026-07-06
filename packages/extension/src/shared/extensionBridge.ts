import type { Bridge, RuntimeEvent } from './bridge';

/**
 * 基于 Chrome 扩展 API 的 Bridge 实现。
 *
 * 通信路径：Panel ──chrome.tabs.sendMessage──▶ Content Script ──CustomEvent──▶ Injected Script
 * 响应路径：Injected ──CustomEvent──▶ Content Script ──sendResponse──▶ Panel
 * 事件路径：Injected ──chrome.runtime.sendMessage──▶ Panel (chrome.runtime.onMessage)
 */
export class ExtensionBridge implements Bridge {
  send(message: any, callback: (response: any, error?: string) => void): void {
    // DevTools Panel 运行在 DevTools 窗口上下文，chrome.tabs.query({ currentWindow: true })
    // 查询的是 DevTools 窗口而非被调试页面，无法取到目标标签页。
    // 使用 chrome.devtools.inspectedWindow.tabId 获取当前被检查的标签页 ID。
    const tabId = chrome.devtools?.inspectedWindow?.tabId;
    if (typeof tabId !== 'number') {
      callback(undefined, 'no active tab');
      return;
    }
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError?.message;
      callback(response, error);
    });
  }

  onEvent(handler: (event: RuntimeEvent) => void): () => void {
    const listener = (message: any) => handler(message as RuntimeEvent);
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }
}
