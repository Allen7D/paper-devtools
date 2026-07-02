/// <reference path="../../global.d.ts" />

/**
 * Paper.js 检测与 Scope 管理注入脚本
 *
 * 该脚本运行在页面上下文（非扩展隔离环境），负责：
 * - 轮询检测页面是否加载了 Paper.js
 * - 发现 Paper.js 后，将所有 PaperScope 实例注册到 `window.__PAPER_SCOPES__` 全局接口
 * - 通过 MutationObserver 持续监听 Canvas 元素的增删，动态注册/注销 Scope
 * - 代理 PaperScope.View.update 方法，在场景变化时派发节流事件
 * - 派发 `PAPER_JS_DETECTED`、`PAPER_SCENE_CHANGED`、`PAPER_SCOPE_CHANGE` 等自定义事件
 *
 * 该脚本以 IIFE 格式独立构建（见 `vite.inject.config.ts`），避免全局污染。
 */
(function () {
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
   *
   * 该函数会尝试多种方式获取 PaperScope 构造函数：
   * - `scopeRef.PaperScope`（直接引用）
   * - `scopeRef.constructor`（实例自身构造函数）
   * - `scopeRef.paperScope.PaperScope`（嵌套引用）
   *
   * @returns 是否发现了新的 Scope 并完成了注册
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

  /**
   * 派发 `PAPER_SCENE_CHANGED` 事件，通知场景树已发生变化。
   *
   * 内置节流机制：若距离上次派发不足 {@link SCENE_CHANGE_THROTTLE_MS} 毫秒，
   * 则跳过本次派发。每次派发前会先调用 {@link discoverScopes} 确保新 Scope 已注册。
   */
  function dispatchSceneChange() {
    const now = Date.now();
    if (now - lastSceneChangeTime < SCENE_CHANGE_THROTTLE_MS) {
      return;
    }
    lastSceneChangeTime = now;
    discoverScopes();
    window.dispatchEvent(new CustomEvent('PAPER_SCENE_CHANGED'));
  }

  /**
   * 代理指定 PaperScope 的 `view.update` 方法，
   * 使其在每次视图更新后自动派发 {@link dispatchSceneChange} 场景变化事件。
   *
   * @param paperScope - 要代理视图更新的 PaperScope 实例
   */
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

  /**
   * 派发 `PAPER_SCOPE_CHANGE` 事件，通知 Scope 列表发生变化。
   *
   * @param type - 变化类型：`'added'`（新增）、`'removed'`（移除）、`'activated'`（激活切换）
   * @param scopeId - 发生变化的 Scope ID
   */
  function dispatchScopeChange(type: string, scopeId: string) {
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
   *
   * 该接口提供多 Scope 管理能力，包含以下方法：
   * - `register(scopeId, paperScope, canvas)` — 注册新 Scope
   * - `unregister(scopeId)` — 注销 Scope
   * - `getActiveScope()` — 获取当前激活的 PaperScope 实例
   * - `switchScope(scopeId)` — 切换激活的 Scope
   * - `getAllScopes()` — 获取所有已注册 Scope 的摘要信息
   *
   * 注册时会自动代理视图更新方法，并派发 `'added'` 类型的 Scope 变化事件。
   * 注销时会自动切换激活 Scope（若注销的是当前激活项），并派发 `'removed'` 事件。
   */
  if (!globalThis.__PAPER_SCOPES__) {
    globalThis.__PAPER_SCOPES__ = {
      scopes: new Map(),
      activeScope: null,

      /**
       * 注册一个新的 PaperScope 实例。
       *
       * @param scopeId - Scope 的唯一标识符
       * @param paperScope - PaperScope 实例
       * @param canvas - 该 Scope 关联的 Canvas 元素
       */
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
        dispatchScopeChange('added', scopeId);
      },

      /**
       * 注销指定的 PaperScope 实例。
       *
       * 若注销的是当前激活的 Scope，会自动将第一个剩余 Scope 设为激活项。
       *
       * @param scopeId - 要注销的 Scope ID
       * @returns 是否成功注销
       */
      unregister(scopeId) {
        if (!this.scopes.has(scopeId)) return false;

        this.scopes.delete(scopeId);

        if (this.activeScope === scopeId) {
          const remaining = Array.from(this.scopes.keys());
          this.activeScope = remaining.length > 0 ? remaining[0] : null;
        }

        dispatchScopeChange('removed', scopeId);
        return true;
      },

      /**
       * 获取当前激活的 PaperScope 实例。
       *
       * @returns 激活的 PaperScope 实例，若无激活项则返回 `null`
       */
      getActiveScope() {
        if (!this.activeScope) return null;
        const scopeData = this.scopes.get(this.activeScope);
        return scopeData ? scopeData.scope : null;
      },

      /**
       * 切换当前激活的 Scope。
       *
       * @param scopeId - 要激活的 Scope ID
       * @returns 是否切换成功
       */
      switchScope(scopeId) {
        if (this.scopes.has(scopeId)) {
          this.activeScope = scopeId;
          dispatchScopeChange('activated', scopeId);
          return true;
        }
        return false;
      },

      /**
       * 获取所有已注册 Scope 的摘要信息列表。
       *
       * @returns Scope 摘要数组，每项包含 `id`、`canvas` 和 `active` 字段
       */
      getAllScopes() {
        return Array.from(this.scopes.entries()).map(([id, data]) => ({
          id,
          canvas: data.canvas,
          active: id === this.activeScope,
        }));
      },
    };
  }

  /**
   * 根据 Canvas 元素查找其关联的 Scope ID。
   *
   * @param canvasEl - 要查找的 Canvas 元素
   * @returns 匹配的 Scope ID，未找到则返回 `null`
   */
  function findScopeIdByCanvas(canvasEl: HTMLCanvasElement): string | null {
    if (!globalThis.__PAPER_SCOPES__) return null;
    for (const [id, data] of globalThis.__PAPER_SCOPES__.scopes) {
      if (data.canvas === canvasEl) return id;
    }
    return null;
  }

  /**
   * 启动 MutationObserver 监听 DOM 中 Canvas 元素的增删。
   *
   * - 检测到新增 Canvas 时，调用 {@link discoverScopes} 注册新 Scope，
   *   并在首次发现时派发 `PAPER_JS_DETECTED` 事件。
   * - 检测到移除 Canvas 时，查找关联的 Scope 并调用 `unregister` 注销。
   *
   * 监听目标为 `document.body`，配置 `childList` 和 `subtree` 以捕获整棵 DOM 树的变化。
   */
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

  /**
   * 启动 Paper.js 轮询检测。
   *
   * 每隔 {@link POLLING_INTERVAL_MS} 毫秒检查一次 `globalThis.__PAPER_SCOPE__` 是否存在，
   * 若发现则调用 {@link discoverScopes} 注册 Scope，并派发 `PAPER_JS_DETECTED` 事件。
   * 超过 {@link MAX_TRIES} 次仍未检测到则停止轮询。
   */
  function startPolling() {
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

  /**
   * 停止 Paper.js 轮询检测，清除定时器。
   */
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
})();
