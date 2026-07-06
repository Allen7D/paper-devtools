import type { Bridge, RuntimeEvent } from '@/shared/bridge';
import { INJECT_EVENT, PANEL_ACTION, RUNTIME_ACTION } from '@/shared/constants';

/**
 * 本地模式 Bridge 实现。
 *
 * 在同一页面内通过 CustomEvent 与 Injected Script 通信，
 * 绕过 Content Script 中继和 chrome.* API。
 *
 * - send：复用 Content Script 的 sendToInjectScript 逻辑（dispatchEvent + messageId 匹配）
 * - onEvent：监听 Injected 派发的 CustomEvent，映射为 RuntimeEvent 转发给 Panel Store
 */
export class LocalBridge implements Bridge {
  send(message: any, callback: (response: any, error?: string) => void): void {
    // DETECT_PAPER_JS：local 模式下 Paper.js 同页面加载，直接检查全局引用
    if (message.action === PANEL_ACTION.DETECT_PAPER_JS) {
      callback({ detected: !!globalThis.__PAPER_SCOPE__ });
      return;
    }

    // 其它消息走 CustomEvent 中继（与 Content Script 的 sendToInjectScript 一致）
    const messageId = Date.now().toString() + Math.random().toString(36).slice(2);

    const listener = (event: CustomEvent) => {
      const data = event.detail;
      if (data && data.id === messageId) {
        window.removeEventListener(INJECT_EVENT.PAPER_DEVTOOLS_RESPONSE, listener as EventListener);
        callback(data.response);
      }
    };

    window.addEventListener(INJECT_EVENT.PAPER_DEVTOOLS_RESPONSE, listener as EventListener);

    window.dispatchEvent(
      new CustomEvent(INJECT_EVENT.PAPER_DEVTOOLS_MESSAGE, {
        detail: { ...message, id: messageId },
      }),
    );
  }

  onEvent(handler: (event: RuntimeEvent) => void): () => void {
    // Injected 派发的 CustomEvent → RuntimeEvent 映射（对应 Content Script 的中继逻辑）
    const mapping: Array<{ dom: string; runtime: string }> = [
      { dom: INJECT_EVENT.PAPER_SCOPE_CHANGE, runtime: RUNTIME_ACTION.SCOPE_CHANGE },
      { dom: INJECT_EVENT.PAPER_SCENE_CHANGED, runtime: RUNTIME_ACTION.SCENE_CHANGE },
      { dom: INJECT_EVENT.PAPER_PICKER_RESULT, runtime: RUNTIME_ACTION.PICKER_RESULT },
      { dom: INJECT_EVENT.PAPER_EXPLODE_FACTOR, runtime: RUNTIME_ACTION.EXPLODE_FACTOR },
    ];

    const listeners = mapping.map(({ dom, runtime }) => {
      const l = (event: CustomEvent) => {
        handler({ action: runtime, ...(event.detail || {}) } as RuntimeEvent);
      };
      window.addEventListener(dom, l as EventListener);
      return l;
    });

    return () => {
      mapping.forEach(({ dom }, i) => {
        window.removeEventListener(dom, listeners[i] as EventListener);
      });
    };
  }
}
