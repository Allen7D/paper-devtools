/// <reference path="../../global.d.ts" />

(function () {
  const MAX_TRIES = 10;
  const POLLING_INTERVAL_MS = 1000;
  const SCENE_CHANGE_THROTTLE_MS = 500;

  let paperPollingInterval: number | undefined;
  let tryCount = 0;
  let lastSceneChangeTime = 0;
  let paperJsDetected = false;

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

  function dispatchSceneChange() {
    const now = Date.now();
    if (now - lastSceneChangeTime < SCENE_CHANGE_THROTTLE_MS) {
      return;
    }
    lastSceneChangeTime = now;
    discoverScopes();
    window.dispatchEvent(new CustomEvent('PAPER_SCENE_CHANGED'));
  }

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
