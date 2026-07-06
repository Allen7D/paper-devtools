/**
 * 通信桥接接口。
 *
 * 解耦 Panel UI 与底层通信层（扩展模式走 Content Script 中继，本地模式走同页面直接调用）。
 * Panel Store 仅依赖此接口，由入口处通过 {@link setBridge} 注入具体实现。
 */

/** 运行时事件（Injected → Content → Panel），对应原 chrome.runtime.onMessage 收到的消息 */
export interface RuntimeEvent {
  action: string;
  /** Scope 变化类型：'added' | 'removed' | 'activated' */
  type?: string;
  /** 拾取器/聚焦/爆炸相关节点 ID */
  nodeId?: string;
  /** Scope 列表（SCOPE_CHANGE 事件） */
  scopes?: Array<{ id: string; canvasId: string; active: boolean }>;
  /** 当前激活 Scope ID */
  activeScopeId?: string | null;
  /** 拾取器是否取消选中 */
  deselect?: boolean;
  /** 爆炸程度 ∈ [0, 1] */
  factor?: number;
  /** 爆炸模式 Group ID */
  groupId?: string;
}

export interface Bridge {
  /**
   * 发送消息到 Injected Script。
   *
   * @param message 消息体，需包含 `action` 字段
   * @param callback 响应回调；`error` 存在表示通信失败（如 Content Script 未注入）
   */
  send(message: any, callback: (response: any, error?: string) => void): void;

  /**
   * 注册运行时事件监听器（Scope 变化、场景树变化、拾取器结果、爆炸程度等）。
   *
   * @returns 取消订阅函数
   */
  onEvent(handler: (event: RuntimeEvent) => void): () => void;
}

/** 当前注入的 Bridge 实例 */
let currentBridge: Bridge | null = null;

/** 注入 Bridge 实现（扩展模式用 ExtensionBridge，本地模式用 LocalBridge） */
export function setBridge(bridge: Bridge): void {
  currentBridge = bridge;
}

/** 获取当前 Bridge 实例，未初始化时抛错 */
export function getBridge(): Bridge {
  if (!currentBridge) {
    throw new Error('Bridge 未初始化，请先调用 setBridge()');
  }
  return currentBridge;
}
