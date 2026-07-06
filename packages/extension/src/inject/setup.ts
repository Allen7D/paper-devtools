/// <reference path="../../global.d.ts" />

/** Scope 变化类型常量 */
const SCOPE_CHANGE_TYPE = {
  ADDED: 'added',
  REMOVED: 'removed',
  ACTIVATED: 'activated',
} as const;

type ScopeChangeType = (typeof SCOPE_CHANGE_TYPE)[keyof typeof SCOPE_CHANGE_TYPE];

/**
 * 初始化 Paper.js 检测与 Scope 管理逻辑。
 *
 * 负责：
 * - 轮询检测页面是否加载了 Paper.js
 * - 发现 Paper.js 后，将所有 PaperScope 实例注册到 `window.__PAPER_SCOPES__`
 * - 通过 MutationObserver 监听 Canvas 增删，动态注册/注销 Scope
 * - 代理 PaperScope.View.update 方法，场景变化时派发节流事件
 * - 派发 `PAPER_JS_DETECTED`、`PAPER_SCENE_CHANGED`、`PAPER_SCOPE_CHANGE` 等自定义事件
 *
 * 扩展模式：由 `inject/index.ts` IIFE 入口调用（注入到页面上下文）。
 * 本地模式：由 `devtool-local` 入口直接调用。
 */
export function initInject(): void {
  /** Paper.js 轮询检测最大尝试次数 */
  const MAX_TRIES = 10;
  /** 轮询检测间隔（毫秒） */
  const POLLING_INTERVAL_MS = 1000;
  /** 场景变化事件节流间隔（毫秒） */
  const SCENE_CHANGE_THROTTLE_MS = 500;

  /** 轮询定时器 ID */
  let paperPollingInterval: number | undefined;
  /** 当前已尝试检测的次数 */
  let tryCount = 0;
  /** 上一次派发场景变化事件的时间戳，用于节流 */
  let lastSceneChangeTime = 0;
  /** 是否已检测到 Paper.js 并派发过 `PAPER_JS_DETECTED` 事件 */
  let paperJsDetected = false;

  /**
   * 扫描 `globalThis.__PAPER_SCOPE__` 上的 PaperScope 类，
   * 将所有未注册的 Scope 实例注册到 `window.__PAPER_SCOPES__`。
   */
  function discoverScopes(): boolean {
    const scopeRef = globalThis.__PAPER_SCOPE__;
    if (!scopeRef) return false;

    let PaperScopeClass = null;

    if (scopeRef.PaperScope && scopeRef.PaperScope._scopes) {
      PaperScopeClass = scopeRef.PaperScope;
    } else if (scopeRef.constructor && scopeRef.constructor._scopes) {
      PaperScopeClass = scopeRef.constructor;
    } else if (scopeRef.paperScope) {
      const inner = scopeRef.paperScope;
      if (inner.PaperScope && inner.PaperScope._scopes) {
        PaperScopeClass = inner.PaperScope;
      } else if (inner.constructor && inner.constructor._scopes) {
        PaperScopeClass = inner.constructor;
      }
    }

    if (!PaperScopeClass) return false;

    let discovered = false;
    for (const [id, paperScope] of Object.entries(PaperScopeClass._scopes) as [string, any][]) {
      const canvas = paperScope.view?.element;
      if (canvas && !globalThis.__PAPER_SCOPES__?.scopes.has(id)) {
        globalThis.__PAPER_SCOPES__?.register(id, paperScope, canvas);
        discovered = true;
      }
    }
    return discovered;
  }

  /** 派发 `PAPER_SCENE_CHANGED` 事件，内置节流。 */
  function dispatchSceneChange() {
    const now = Date.now();
    if (now - lastSceneChangeTime < SCENE_CHANGE_THROTTLE_MS) {
      return;
    }
    lastSceneChangeTime = now;
    discoverScopes();
    window.dispatchEvent(new CustomEvent('PAPER_SCENE_CHANGED'));
  }

  /** 代理指定 PaperScope 的 `view.update` 方法，视图更新后派发场景变化事件。 */
  function proxyViewUpdate(paperScope: any) {
    const view = paperScope?.view;
    if (!view || !view.update) return;

    const originalUpdate = view.update.bind(view);

    view.update = function () {
      const result = originalUpdate();
      dispatchSceneChange();
      return result;
    };
  }

  /** 派发 `PAPER_SCOPE_CHANGE` 事件。 */
  function dispatchScopeChange(type: ScopeChangeType, scopeId: string) {
    window.dispatchEvent(
      new CustomEvent('PAPER_SCOPE_CHANGE', {
        detail: {
          type,
          scopeId,
          scopes: globalThis.__PAPER_SCOPES__
            ? globalThis.__PAPER_SCOPES__.getAllScopes().map((s) => ({
              id: s.id,
              canvasId: s.canvas?.id || '',
              active: s.active,
            }))
            : [],
          activeScopeId: globalThis.__PAPER_SCOPES__?.activeScope || null,
        },
      }),
    );
  }

  /**
   * 初始化全局 Scope 管理接口 `window.__PAPER_SCOPES__`。
   * 提供 register/unregister/getActiveScope/switchScope/getAllScopes 方法。
   */
  if (!globalThis.__PAPER_SCOPES__) {
    globalThis.__PAPER_SCOPES__ = {
      scopes: new Map(),
      activeScope: null,

      register(scopeId, paperScope, canvas) {
        if (this.scopes.has(scopeId)) return;

        this.scopes.set(scopeId, {
          scope: paperScope,
          canvas: canvas,
          id: scopeId,
        });

        if (!this.activeScope) {
          this.activeScope = scopeId;
        }

        proxyViewUpdate(paperScope);
        dispatchScopeChange(SCOPE_CHANGE_TYPE.ADDED, scopeId);
      },

      unregister(scopeId) {
        if (!this.scopes.has(scopeId)) return false;

        this.scopes.delete(scopeId);

        if (this.activeScope === scopeId) {
          const remaining = Array.from(this.scopes.keys());
          this.activeScope = remaining.length > 0 ? remaining[0] : null;
        }

        dispatchScopeChange(SCOPE_CHANGE_TYPE.REMOVED, scopeId);
        return true;
      },

      getActiveScope() {
        if (!this.activeScope) return null;
        const scopeData = this.scopes.get(this.activeScope);
        return scopeData ? scopeData.scope : null;
      },

      switchScope(scopeId) {
        if (this.scopes.has(scopeId)) {
          this.activeScope = scopeId;
          dispatchScopeChange(SCOPE_CHANGE_TYPE.ACTIVATED, scopeId);
          return true;
        }
        return false;
      },

      getAllScopes() {
        return Array.from(this.scopes.entries()).map(([id, data]) => ({
          id,
          canvas: data.canvas,
          active: id === this.activeScope,
        }));
      },
    };
  }

  /** 根据 Canvas 元素查找其关联的 Scope ID。 */
  function findScopeIdByCanvas(canvasEl: HTMLCanvasElement): string | null {
    if (!globalThis.__PAPER_SCOPES__) return null;
    for (const [id, data] of globalThis.__PAPER_SCOPES__.scopes) {
      if (data.canvas === canvasEl) return id;
    }
    return null;
  }

  /** 启动 MutationObserver 监听 DOM 中 Canvas 元素的增删。 */
  function startScopeWatcher() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLCanvasElement) {
            const discovered = discoverScopes();
            if (discovered && !paperJsDetected && globalThis.__PAPER_SCOPES__?.getActiveScope()) {
              paperJsDetected = true;
              window.dispatchEvent(new CustomEvent('PAPER_JS_DETECTED'));
            }
          } else if (node instanceof HTMLElement) {
            const canvases = node.querySelectorAll('canvas');
            if (canvases.length > 0) {
              const discovered = discoverScopes();
              if (discovered && !paperJsDetected && globalThis.__PAPER_SCOPES__?.getActiveScope()) {
                paperJsDetected = true;
                window.dispatchEvent(new CustomEvent('PAPER_JS_DETECTED'));
              }
            }
          }
        }
        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLCanvasElement) {
            const scopeId = findScopeIdByCanvas(node);
            if (scopeId) {
              globalThis.__PAPER_SCOPES__?.unregister(scopeId);
            }
          }
          if (node instanceof HTMLElement) {
            const canvases = node.querySelectorAll('canvas');
            for (const canvas of canvases) {
              const scopeId = findScopeIdByCanvas(canvas);
              if (scopeId) {
                globalThis.__PAPER_SCOPES__?.unregister(scopeId);
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /** 启动 Paper.js 轮询检测，超过 MAX_TRIES 次停止。 */
  function startPolling() {
    // 立即检查一次（不等第一个间隔），加速 local 模式发现
    if (globalThis.__PAPER_SCOPE__) {
      const discovered = discoverScopes();
      if (discovered && globalThis.__PAPER_SCOPES__?.getActiveScope()) {
        paperJsDetected = true;
        window.dispatchEvent(new CustomEvent('PAPER_JS_DETECTED'));
        stopPolling();
        return;
      }
    }

    paperPollingInterval = window.setInterval(() => {
      if (tryCount > MAX_TRIES) {
        stopPolling();
        return;
      }

      if (globalThis.__PAPER_SCOPE__) {
        const discovered = discoverScopes();

        if (discovered && globalThis.__PAPER_SCOPES__?.getActiveScope()) {
          paperJsDetected = true;
          window.dispatchEvent(new CustomEvent('PAPER_JS_DETECTED'));
          stopPolling();
          return;
        }
      }

      tryCount++;
    }, POLLING_INTERVAL_MS);
  }

  /** 停止 Paper.js 轮询检测。 */
  function stopPolling() {
    if (paperPollingInterval) {
      window.clearInterval(paperPollingInterval);
    }
  }

  startPolling();

  if (document.body) {
    startScopeWatcher();
  } else {
    document.addEventListener('DOMContentLoaded', startScopeWatcher);
  }
}
