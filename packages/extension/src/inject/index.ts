/// <reference path="../../global.d.ts" />

(function () {
  const MAX_TRIES = 10;
  const POLLING_INTERVAL_MS = 1000;
  const SCENE_CHANGE_THROTTLE_MS = 200;

  let paperPollingInterval: number | undefined;
  let tryCount = 0;
  let sceneChangeTimer: number | undefined;

  function dispatchSceneChange() {
    if (sceneChangeTimer) return;
    sceneChangeTimer = window.setTimeout(() => {
      sceneChangeTimer = undefined;
      window.dispatchEvent(new CustomEvent('PAPER_SCENE_CHANGED'));
    }, SCENE_CHANGE_THROTTLE_MS);
  }

  function proxyViewUpdate(paperScope: any) {
    const view = paperScope?.view;
    if (!view || !view.update) return;

    const originalUpdate = view.update.bind(view);
    let proxied = false;

    view.update = function () {
      const result = originalUpdate();
      if (!proxied) {
        proxied = true;
        dispatchSceneChange();
        window.setTimeout(() => { proxied = false; }, SCENE_CHANGE_THROTTLE_MS);
      }
      return result;
    };
  }

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
        dispatchScopeChange('added', scopeId);
      },

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

      getActiveScope() {
        if (!this.activeScope) return null;
        const scopeData = this.scopes.get(this.activeScope);
        return scopeData ? scopeData.scope : null;
      },

      switchScope(scopeId) {
        if (this.scopes.has(scopeId)) {
          this.activeScope = scopeId;
          dispatchScopeChange('activated', scopeId);
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

  function findScopeIdByCanvas(canvasEl: HTMLCanvasElement): string | null {
    if (!globalThis.__PAPER_SCOPES__) return null;
    for (const [id, data] of globalThis.__PAPER_SCOPES__.scopes) {
      if (data.canvas === canvasEl) return id;
    }
    return null;
  }

  function startScopeWatcher() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
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

  function startPolling() {
    paperPollingInterval = window.setInterval(() => {
      console.log('>>> 检测 Paper.js 是否存在:', tryCount + 1, '次');

      if (tryCount > MAX_TRIES) {
        stopPolling();
        return;
      }

      if (globalThis.__PAPER_SCOPE__ && globalThis.__PAPER_SCOPE__.paperScope) {
        const paperScope = {
          paperScope: globalThis.__PAPER_SCOPE__.paperScope,
          canvas: globalThis.__PAPER_SCOPE__.paperScope?.view?.element,
          scopeId: globalThis.__PAPER_SCOPE__.paperScope?.view?.element?.id,
          ...globalThis.__PAPER_SCOPE__,
        };

        globalThis.__PAPER_SCOPES__?.register(paperScope.scopeId, paperScope.paperScope, paperScope.canvas);

        if (globalThis.__PAPER_SCOPES__?.getActiveScope()) {
          window.dispatchEvent(new CustomEvent('PAPER_JS_DETECTED'));
          console.log('>>> Paper.js 检测成功，对应 Canvas 上的 scope 为:', paperScope.scopeId);
          stopPolling();
          return;
        }
      }

      tryCount++;
    }, POLLING_INTERVAL_MS);
  }

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
