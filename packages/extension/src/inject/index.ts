// 检测 Paper.js 是否存在
(function () {
  // 常量
  const MAX_TRIES = 10;
  const POLLING_INTERVAL_MS = 1000;

  let paperPollingInterval;
  let tryCount = 0;

  /**
   * 开始轮询检测 Paper.js 是否存在
   */

  if (!globalThis.__PAPER_SCOPES__) {
    globalThis.__PAPER_SCOPES__ = {
      scopes: new Map(),
      activeScope: null,

      // 注册一个 paperScope
      register(scopeId, paperScope, canvas) {
        this.scopes.set(scopeId, {
          scope: paperScope,
          canvas: canvas,
          id: scopeId,
        });

        // 如果是第一个 scope，设为激活状态
        if (!this.activeScope) {
          this.activeScope = scopeId;
        }
      },

      // 获取当前激活的 scope
      getActiveScope() {
        if (!this.activeScope) return null;
        const scopeData = this.scopes.get(this.activeScope);
        return scopeData ? scopeData.scope : null;
      },

      // 切换激活的 scope
      switchScope(scopeId) {
        if (this.scopes.has(scopeId)) {
          this.activeScope = scopeId;
          return true;
        }
        return false;
      },

      // 获取所有 scope
      getAllScopes() {
        return Array.from(this.scopes.entries()).map(([id, data]) => ({
          id,
          canvas: data.canvas,
          active: id === this.activeScope,
        }));
      },
    };
  }

  function startPolling() {
    paperPollingInterval = window.setInterval(() => {
      console.log(">>> 检测 Paper.js 是否存在:", tryCount + 1, "次");
      if (tryCount > MAX_TRIES) {
        stopPolling();
      }
      const paperScope = {
        paperScope: globalThis.__PAPER_SCOPE__.paperScope,
        canvas: globalThis.__PAPER_SCOPE__.paperScope?.view?.element,
        scopeId: globalThis.__PAPER_SCOPE__.paperScope?.view?.element?.id,
        ...globalThis.__PAPER_SCOPE__,
      };
      globalThis.__PAPER_SCOPES__.register(
        paperScope.scopeId,
        paperScope.paperScope,
        paperScope.canvas
      );
      if (window.__PAPER_SCOPES__ && window.__PAPER_SCOPES__.getActiveScope) {
        // 通知内容脚本 Paper.js 已检测到
        window.dispatchEvent(new CustomEvent("PAPER_JS_DETECTED"));

        stopPolling();
      }
      tryCount++;
    }, POLLING_INTERVAL_MS);
  }

  /**
   * 停止轮询检测 Paper.js 是否存在
   */
  function stopPolling() {
    window.clearInterval(paperPollingInterval);
  }

  startPolling();
})();
