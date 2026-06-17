import { extractItemProperties, extractProjectProperties } from "./extra";
import { ScopeProjectNode, ScopeTreeNode } from "types";

function buildScopeProject(project: paper.Project) {
  const nodeId = "root";
  const node: ScopeProjectNode = {
    id: nodeId,
    name: "Project",
    type: "Project",
    children: [],
    properties: {},
    visible: true,
    selected: false
  };
  node.properties = extractProjectProperties(project);
  const children = project.layers;
  if (children && children.length > 0) {
    children.forEach((child, index) => {
      const childNode = buildScopeTree(child, `${nodeId}_${index}`);
      if (childNode) {
        node.children?.push(childNode);
      }
    });
  }
  return node;
}

function buildScopeTree(item: paper.Item, id = "") {
  const nodeId = id;

  let node: ScopeTreeNode = {
    id: nodeId,
    name: item.name || "",
    type: item.className || "Item",
    children: [],
    properties: {},
    visible: item.visible ?? true,
    selected: item.selected ?? false,
  };

  node.properties = extractItemProperties(item);
  let children = item.children;

  if (children && children.length > 0) {
    children.forEach((child, index) => {
      const childNode = buildScopeTree(child, `${nodeId}_${index}`);
      if (childNode) {
        node.children.push(childNode);
      }
    });
  }
  return node;
}

function getActiveScope() {
  if (!window.__PAPER_SCOPES__ || !window.__PAPER_SCOPES__.getActiveScope) {
    return null;
  }
  return window.__PAPER_SCOPES__.getActiveScope();
}

function getActiveProject(): paper.Project | null {
  const activeScope = getActiveScope();
  return activeScope && activeScope.project ? activeScope.project : null;
}

function getActiveView(): paper.View | null {
  const activeScope = getActiveScope();
  return activeScope && activeScope.view ? activeScope.view : null;
}

function findPaperItemById(id: string): paper.Item | null {
  const project = getActiveProject();
  if (!project) return null;

  if (id === "root") {
    return project as unknown as paper.Item;
  }
  const parts = id.split("_");
  let current: any = project;

  for (let i = 1; i < parts.length; i++) {
    const index = parseInt(parts[i], 10);
    let children = null;

    const isProject =
      current.className === "Project" ||
      (current.activeLayer && current.layers);
    if (isProject) {
      children = current.layers;
    } else {
      children = current.children;
    }

    if (children && index < children.length) {
      current = children[index];
    } else {
      return null;
    }
  }
  return current;
}

let selectedOverlay: HTMLDivElement | null = null;
let hoverOverlay: HTMLDivElement | null = null;
let overlayContainer: HTMLDivElement | null = null;
let highlightedNodeId: string | null = null;
let hoveredNodeId: string | null = null;
let overlayEnabled = true;
let pickerActive = false;
let autoSwitchScope = true;
let canvasClickHandlers = new WeakMap<HTMLCanvasElement, (e: MouseEvent) => void>();
let pickerMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let pickerClickHandler: ((e: MouseEvent) => void) | null = null;

function getOverlayContainer(): HTMLDivElement {
  if (overlayContainer && overlayContainer.parentNode) {
    return overlayContainer;
  }

  overlayContainer = document.createElement('div');
  overlayContainer.id = '__paper_devtools_overlay_container__';
  overlayContainer.style.cssText =
    'position:absolute;pointer-events:none;z-index:99999;top:0;left:0;width:100%;height:100%;overflow:hidden;';

  const project = getActiveProject();
  const canvas = project?.view?.element as HTMLCanvasElement | undefined;
  if (canvas && canvas.parentNode) {
    const parent = canvas.parentNode as HTMLElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.insertBefore(overlayContainer, canvas.nextSibling);
  }

  return overlayContainer;
}

function getItemScreenBounds(item: paper.Item): { left: number; top: number; width: number; height: number } | null {
  const view = getActiveView();
  const canvas = view?.element as HTMLCanvasElement | undefined;
  if (!canvas || !item.bounds) return null;

  const canvasRect = canvas.getBoundingClientRect();
  const bounds = item.bounds;

  const scaleX = canvasRect.width / (canvas.offsetWidth || 1);
  const scaleY = canvasRect.height / (canvas.offsetHeight || 1);

  return {
    left: canvasRect.left + bounds.x * scaleX,
    top: canvasRect.top + bounds.y * scaleY,
    width: bounds.width * scaleX,
    height: bounds.height * scaleY,
  };
}

function positionOverlay(overlay: HTMLDivElement, item: paper.Item) {
  const screenBounds = getItemScreenBounds(item);
  if (!screenBounds) {
    overlay.style.display = 'none';
    return;
  }

  const container = getOverlayContainer();
  const containerRect = container.getBoundingClientRect();

  overlay.style.display = 'block';
  overlay.style.left = (screenBounds.left - containerRect.left) + 'px';
  overlay.style.top = (screenBounds.top - containerRect.top) + 'px';
  overlay.style.width = screenBounds.width + 'px';
  overlay.style.height = screenBounds.height + 'px';
}

function createOverlayElement(type: 'selected' | 'hover'): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `__paper_devtools_overlay_${type}__`;

  if (type === 'selected') {
    el.style.cssText =
      'position:absolute;pointer-events:none;border:2px solid rgba(245,80,60,0.9);background:rgba(245,80,60,0.08);border-radius:2px;transition:left 0.05s,top 0.05s,width 0.05s,height 0.05s;display:none;';
  } else {
    el.style.cssText =
      'position:absolute;pointer-events:none;border:1.5px dashed rgba(66,133,244,0.8);background:rgba(66,133,244,0.06);border-radius:2px;transition:left 0.05s,top 0.05s,width 0.05s,height 0.05s;display:none;';
  }

  getOverlayContainer().appendChild(el);
  return el;
}

function updateOverlayPosition(type: 'selected' | 'hover', nodeId: string) {
  const item = findPaperItemById(nodeId);
  if (!item) return;

  const overlay = type === 'selected' ? selectedOverlay : hoverOverlay;
  if (!overlay) return;

  positionOverlay(overlay, item);
}

function syncAllOverlays() {
  if (!overlayEnabled) return;
  if (highlightedNodeId) updateOverlayPosition('selected', highlightedNodeId);
  if (hoveredNodeId) updateOverlayPosition('hover', hoveredNodeId);
}

function showHighlight(nodeId: string, type: 'selected' | 'hover') {
  if (!overlayEnabled) return;

  const item = findPaperItemById(nodeId);
  if (!item) return;

  if (type === 'selected') {
    if (!selectedOverlay) selectedOverlay = createOverlayElement('selected');
    positionOverlay(selectedOverlay, item);
    highlightedNodeId = nodeId;
  } else {
    if (!hoverOverlay) hoverOverlay = createOverlayElement('hover');
    positionOverlay(hoverOverlay, item);
    hoveredNodeId = nodeId;
  }
}

function hideHighlight(type: 'selected' | 'hover') {
  if (type === 'selected' && selectedOverlay) {
    selectedOverlay.style.display = 'none';
    highlightedNodeId = null;
  }
  if (type === 'hover' && hoverOverlay) {
    hoverOverlay.style.display = 'none';
    hoveredNodeId = null;
  }
}

function clearAllOverlays() {
  if (selectedOverlay) {
    selectedOverlay.remove();
    selectedOverlay = null;
  }
  if (hoverOverlay) {
    hoverOverlay.remove();
    hoverOverlay = null;
  }
  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
  }
  highlightedNodeId = null;
  hoveredNodeId = null;
}

function setOverlayEnabled(enabled: boolean) {
  overlayEnabled = enabled;
  if (!enabled) {
    clearAllOverlays();
  }
}

function setupCanvasClickListeners() {
  if (!window.__PAPER_SCOPES__) return;

  for (const [scopeId, data] of window.__PAPER_SCOPES__.scopes) {
    const canvas = data.canvas as HTMLCanvasElement;
    if (!canvas || canvasClickHandlers.has(canvas)) continue;

    const handler = () => {
      if (!autoSwitchScope) return;
      if (pickerActive) return;

      const currentActive = window.__PAPER_SCOPES__?.activeScope;
      if (currentActive === scopeId) return;

      window.__PAPER_SCOPES__?.switchScope(scopeId);
    };

    canvas.addEventListener('click', handler);
    canvasClickHandlers.set(canvas, handler);
  }
}

function setAutoSwitchScope(enabled: boolean) {
  autoSwitchScope = enabled;
  if (enabled) {
    setupCanvasClickListeners();
  }
}

function findNodeIdByItem(targetItem: paper.Item): string | null {
  const project = getActiveProject();
  if (!project) return null;

  function search(item: any, id: string): string | null {
    if (item === targetItem) return id;

    const isProject =
      item.className === "Project" ||
      (item.activeLayer && item.layers);

    const children = isProject ? item.layers : item.children;
    if (children) {
      for (let i = 0; i < children.length; i++) {
        const result = search(children[i], `${id}_${i}`);
        if (result) return result;
      }
    }
    return null;
  }

  return search(project, "root");
}

function getCanvasPoint(e: MouseEvent): any | null {
  const scope = getActiveScope();
  const view = getActiveView();
  const canvas = view?.element as HTMLCanvasElement | undefined;
  if (!canvas || !scope) return null;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.offsetWidth / rect.width;
  const scaleY = canvas.offsetHeight / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  return new scope.Point(x, y);
}

function enablePicker() {
  if (pickerActive) return;
  pickerActive = true;

  const view = getActiveView();
  const canvas = view?.element as HTMLCanvasElement | undefined;
  if (!canvas) return;

  canvas.style.cursor = 'crosshair';

  pickerMouseMoveHandler = (e: MouseEvent) => {
    const point = getCanvasPoint(e);
    if (!point) return;

    const project = getActiveProject();
    if (!project) return;

    const hitResult = project.hitTest(point, {
      fill: true,
      stroke: true,
      segments: true,
      tolerance: 5,
    });

    if (hitResult && hitResult.item) {
      const nodeId = findNodeIdByItem(hitResult.item);
      if (nodeId) {
        showHighlight(nodeId, 'hover');
      }
    } else {
      hideHighlight('hover');
    }
  };

  pickerClickHandler = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      if (highlightedNodeId) {
        const currentItem = findPaperItemById(highlightedNodeId);
        if (currentItem && currentItem.parent) {
          const parentItemId = findNodeIdByItem(currentItem.parent);
          if (parentItemId) {
            window.dispatchEvent(new CustomEvent('PAPER_PICKER_RESULT', {
              detail: { nodeId: parentItemId, deselect: false },
            }));
          }
        }
      }
      return;
    }

    const point = getCanvasPoint(e);
    if (!point) return;

    const project = getActiveProject();
    if (!project) return;

    const hitResult = project.hitTest(point, {
      fill: true,
      stroke: true,
      segments: true,
      tolerance: 5,
    });

    if (hitResult && hitResult.item) {
      const nodeId = findNodeIdByItem(hitResult.item);
      if (nodeId) {
        window.dispatchEvent(new CustomEvent('PAPER_PICKER_RESULT', {
          detail: { nodeId, deselect: nodeId === highlightedNodeId },
        }));
      }
    }
  };

  canvas.addEventListener('mousemove', pickerMouseMoveHandler);
  canvas.addEventListener('click', pickerClickHandler, true);
}

function disablePicker() {
  if (!pickerActive) return;
  pickerActive = false;

  const view = getActiveView();
  const canvas = view?.element as HTMLCanvasElement | undefined;
  if (!canvas) return;

  canvas.style.cursor = '';

  if (pickerMouseMoveHandler) {
    canvas.removeEventListener('mousemove', pickerMouseMoveHandler);
    pickerMouseMoveHandler = null;
  }
  if (pickerClickHandler) {
    canvas.removeEventListener('click', pickerClickHandler, true);
    pickerClickHandler = null;
  }

  hideHighlight('hover');
}

window.addEventListener('PAPER_SCENE_CHANGED', () => {
  syncAllOverlays();
});

window.addEventListener('resize', () => {
  syncAllOverlays();
});

window.addEventListener('scroll', () => {
  syncAllOverlays();
}, true);

window.addEventListener('PAPER_SCOPE_CHANGE', () => {
  clearAllOverlays();
  if (autoSwitchScope) {
    setupCanvasClickListeners();
  }
});

window.addEventListener("PAPER_DEVTOOLS_MESSAGE", function (event) {
  const message = (event as any).detail;
  if (!message || !message.action) return;
  let response = null;
  switch (message.action) {
    case "GET_SCENE_TREE":
      {
        const project = getActiveProject();
        if (project) {
          const sceneTree = buildScopeProject(project);
          response = { sceneTree };
        }
      }
      break;
    case "SELECT_NODE":
      if (message.nodeId) {
        const item = findPaperItemById(message.nodeId);
        if (item) {
          const project = getActiveProject();
          if (project) {
            project.deselectAll();
          }
          const node = buildScopeTree(item, message.nodeId);
          response = { node };
          showHighlight(message.nodeId, 'selected');
        }
      }
      break;
    case "TOGGLE_NODE_VISIBILITY":
      if (message.nodeId) {
        const item = findPaperItemById(message.nodeId);
        if (item && item.visible !== undefined) {
          item.visible = !item.visible;
          const project = getActiveProject();
          if (project) {
            const sceneTree = buildScopeProject(project);
            response = { sceneTree };
          }
        }
      }
      break;
    case "UPDATE_NODE_PROPERTY":
      if (message.nodeId && message.property) {
        const item = findPaperItemById(message.nodeId);
        if (item) {
          try {
            if (
              message.property === "position" &&
              typeof message.value === "object"
            ) {
              item.position.x = message.value.x;
              item.position.y = message.value.y;
            } else if (message.property === "fillColor") {
              item.fillColor = message.value;
            } else if (message.property === "strokeColor") {
              item.strokeColor = message.value;
            } else {
              item.set({
                [message.property]: message.value
              });
            }
            const view = getActiveView();
            if (view) {
              view.update();
            }
            const node = buildScopeTree(item, message.nodeId);
            response = { node };
          } catch (error) {
            console.error("更新属性失败:", error);
          }
        }
      }
      break;
    case "GET_AVAILABLE_SCOPES":
      if (window.__PAPER_SCOPES__ && window.__PAPER_SCOPES__.getAllScopes) {
        const rawScopes = window.__PAPER_SCOPES__.getAllScopes();
        const scopes = rawScopes.map((item) => ({
          id: item.id,
          canvasId: item.canvas?.id || "",
          active: item.active,
        }));
        response = {
          scopes,
          activeScopeId: window.__PAPER_SCOPES__.activeScope || null,
        };
      }
      break;
    case "SET_ACTIVE_SCOPE":
      if (message.scopeId && window.__PAPER_SCOPES__ && window.__PAPER_SCOPES__.switchScope) {
        const success = window.__PAPER_SCOPES__.switchScope(message.scopeId);
        response = { success };
      }
      break;
    case "GET_NODE_INFO":
      if (message.nodeId) {
        const item = findPaperItemById(message.nodeId);
        if (item) {
          const node = buildScopeTree(item, message.nodeId);
          response = { node };
        }
      }
      break;
    case "HIGHLIGHT_NODE":
      if (message.nodeId) {
        showHighlight(message.nodeId, message.type || 'selected');
        response = { success: true };
      }
      break;
    case "CLEAR_HIGHLIGHT":
      hideHighlight(message.type || 'hover');
      response = { success: true };
      break;
    case "SET_OVERLAY_ENABLED":
      setOverlayEnabled(message.enabled);
      response = { success: true };
      break;
    case "ENABLE_PICKER":
      enablePicker();
      response = { success: true };
      break;
    case "DISABLE_PICKER":
      disablePicker();
      response = { success: true };
      break;
    case "SET_AUTO_SWITCH_SCOPE":
      setAutoSwitchScope(message.enabled);
      response = { success: true };
      break;
    case "GET_AUTO_SWITCH_SCOPE":
      response = { enabled: autoSwitchScope };
      break;
  }
  if (response) {
    window.dispatchEvent(
      new CustomEvent("PAPER_DEVTOOLS_RESPONSE", {
        detail: {
          id: message.id,
          response,
        },
      })
    );
  }
});
