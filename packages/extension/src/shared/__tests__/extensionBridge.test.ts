import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExtensionBridge } from '../extensionBridge';

/**
 * ExtensionBridge 测试。
 *
 * 重点验证 DevTools Panel 上下文下通过 chrome.devtools.inspectedWindow.tabId
 * 获取被检查标签页的逻辑，覆盖回归场景：原先使用 chrome.tabs.query({ currentWindow: true })
 * 在 DevTools 窗口下会返回 "no active tab"。
 */

interface SendMessageCall {
  tabId: number;
  message: any;
}

function setupChromeMock(tabId: number | undefined, lastErrorMessage?: string) {
  const sendCalls: SendMessageCall[] = [];
  const chromeMock: any = {
    devtools: {
      inspectedWindow: { tabId },
    },
    tabs: {
      sendMessage: vi.fn((id: number, message: any, cb: (resp: any) => void) => {
        sendCalls.push({ tabId: id, message });
        cb({ ok: true });
      }),
    },
    runtime: {
      lastError: lastErrorMessage ? { message: lastErrorMessage } : undefined,
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  };
  // @ts-expect-error 注入全局 chrome mock
  globalThis.chrome = chromeMock;
  return { sendCalls, chromeMock };
}

describe('ExtensionBridge', () => {
  const originalChrome = (globalThis as any).chrome;

  beforeEach(() => {
    (globalThis as any).chrome = undefined;
  });

  afterEach(() => {
    (globalThis as any).chrome = originalChrome;
  });

  it('使用 inspectedWindow.tabId 发送消息到对应标签页', () => {
    const { sendCalls } = setupChromeMock(42);

    const bridge = new ExtensionBridge();
    bridge.send({ action: 'DETECT_PAPER_JS' }, (response, error) => {
      expect(response).toEqual({ ok: true });
      expect(error).toBeUndefined();
    });

    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0].tabId).toBe(42);
    expect(sendCalls[0].message).toEqual({ action: 'DETECT_PAPER_JS' });
  });

  it('tabId 不存在时返回 "no active tab" 错误', () => {
    setupChromeMock(undefined);
    const sendMessageSpy = (globalThis as any).chrome.tabs.sendMessage;

    const bridge = new ExtensionBridge();
    bridge.send({ action: 'DETECT_PAPER_JS' }, (response, error) => {
      expect(response).toBeUndefined();
      expect(error).toBe('no active tab');
    });

    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it('sendMessage 的 lastError 透传到回调', () => {
    setupChromeMock(7, 'Could not establish connection');

    const bridge = new ExtensionBridge();
    bridge.send({ action: 'GET_SCENE_TREE' }, (response, error) => {
      expect(error).toBe('Could not establish connection');
    });
  });

  it('onEvent 注册 runtime.onMessage 监听器并返回取消订阅函数', () => {
    setupChromeMock(1);
    const addSpy = (globalThis as any).chrome.runtime.onMessage.addListener;
    const removeSpy = (globalThis as any).chrome.runtime.onMessage.removeListener;

    const bridge = new ExtensionBridge();
    const handler = vi.fn();
    const unsubscribe = bridge.onEvent(handler);

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).not.toHaveBeenCalled();

    unsubscribe();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
