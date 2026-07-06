import { extractItemProperties, extractProjectProperties } from "./extra";
import { computeExplodePositions, dragToFactor, type Point } from "./explodeMath";
import { collectVisibilitySnapshot, restoreVisibility, applyFocusPath } from "./focusTree";
import { ScopeProjectNode, ScopeTreeNode } from "types";
import {
  HIGHLIGHT_TYPE,
  type HighlightType,
  INJECT_EVENT,
  PANEL_ACTION,
} from "@/shared/constants";

/**
 * 根据 paper.js Project 实例构建场景树根节点。
 *
 * 遍历 Project 的所有图层（layers），递归调用 {@link buildScopeTree} 构建子节点，
 * 最终生成包含项目属性和完整子树结构的 {@link ScopeProjectNode}。
 *
 * @param project - paper.js Project 实例
 * @returns 场景树根节点，id 固定为 `"root"`
 */
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

/**
 * 递归构建 paper.js 图元的场景树节点。
 *
 * 从 Item 实例中提取名称、类型、可见性、选中状态等基本信息，
 * 并递归处理所有子图元（children），生成完整的树形结构。
 * 节点 ID 采用路径格式（如 `"root_0_1_2"`），用于后续定位。
 *
 * @param item - paper.js 图元实例
 * @param id - 节点 ID，由父节点 ID 和子索引拼接而成
 * @returns 场景树节点
 */
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

/**
 * 获取当前激活的 PaperScope 实例。
 *
 * @returns 激活的 PaperScope 实例，若无激活项或全局接口不存在则返回 `null`
 */
function getActiveScope() {
  if (!window.__PAPER_SCOPES__ || !window.__PAPER_SCOPES__.getActiveScope) {
    return null;
  }
  return window.__PAPER_SCOPES__.getActiveScope();
}

/**
 * 获取当前激活 Scope 的 Project 实例。
 *
 * @returns 激活的 Project 实例，若无则返回 `null`
 */
function getActiveProject(): paper.Project | null {
  const activeScope = getActiveScope();
  return activeScope && activeScope.project ? activeScope.project : null;
}

/**
 * 获取当前激活 Scope 的 View 实例。
 *
 * @returns 激活的 View 实例，若无则返回 `null`
 */
function getActiveView(): paper.View | null {
  const activeScope = getActiveScope();
  return activeScope && activeScope.view ? activeScope.view : null;
}

/**
 * 根据节点 ID 路径在当前 Project 中查找对应的 paper.js 图元。
 *
 * 节点 ID 格式为 `"root_0_1_2"`，其中 `root` 表示 Project 根节点，
 * 后续数字表示在各层级子元素中的索引位置。
 *
 * @param id - 节点 ID 路径
 * @returns 匹配的图元实例，未找到则返回 `null`
 */
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

/** 选中节点的高亮覆盖层元素 */
let selectedOverlay: HTMLDivElement | null = null;
/** 悬停节点的高亮覆盖层元素（用于拾取器模式） */
let hoverOverlay: HTMLDivElement | null = null;
/** 覆盖层容器元素，用于承载所有高亮覆盖层 */
let overlayContainer: HTMLDivElement | null = null;
/** 当前高亮选中节点的 ID */
let highlightedNodeId: string | null = null;
/** 当前悬停节点的 ID */
let hoveredNodeId: string | null = null;
/**
 * 当前悬停是否来自拾取器（Canvas 命中测试）。
 *
 * 拾取器悬停的图元若已隐藏则不显示蓝色虚线边框；场景树 hover
 * （经 HIGHLIGHT_NODE 进入）不受此限制，仍对隐藏节点显示边框。
 */
let hoverFromPicker = false;
/** 是否启用选中高亮覆盖层 */
let overlayEnabled = true;
/** 拾取器模式是否激活 */
let pickerActive = false;
/** 是否启用点击 Canvas 自动切换 Scope */
let autoSwitchScope = true;
/** Canvas 点击事件处理器映射，用于自动切换 Scope */
let canvasClickHandlers = new WeakMap<HTMLCanvasElement, (e: MouseEvent) => void>();
/** 拾取器模式的 mousemove 事件处理器 */
let pickerMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
/** 拾取器模式的 click 事件处理器 */
let pickerClickHandler: ((e: MouseEvent) => void) | null = null;

// ===== 聚焦模式状态 =====
/** 聚焦前所有图元的可见性快照（nodeId -> visible），null 表示未聚焦 */
let focusSnapshot: Map<string, boolean> | null = null;
/** 当前聚焦的节点 ID，null 表示未聚焦 */
let focusedNodeId: string | null = null;

// ===== 爆炸预览模式状态 =====
/** 当前处于爆炸模式的 Group 节点 ID */
let explodeGroupId: string | null = null;
/** 爆炸模式对应的 paper.js Group item */
let explodeGroupItem: paper.Group | null = null;
/** 子图元原始位置缓存（进入爆炸模式时记录，退出时用于恢复） */
let explodeOrigins: Point[] = [];
/** Group 中心点（Paper.js 坐标系） */
let explodeCenter: Point = { x: 0, y: 0 };
/** 子图元最大远离距离（Paper.js 坐标系单位） */
let explodeMaxDist = 0;
/** 满爆炸所需拖拽距离（像素） */
let explodeMaxDrag = 0;
/** 当前爆炸程度 ∈ [0, 1] */
let explodeFactor = 0;
/** 爆炸拖拽手柄 DOM 元素 */
let explodeHandle: HTMLDivElement | null = null;
/** 手柄拖拽起始屏幕坐标 */
let explodeDragStart: { x: number; y: number } | null = null;
/** 拖拽起始时手柄中心位置（锚点，mousemove 时手柄 = 锚点 + 限幅 delta） */
let explodeHandleAnchor: { x: number; y: number } = { x: 0, y: 0 };
/** Group 中心在 overlay 容器坐标系中的固定位置（factor 计算参考点） */
let explodeCenterOverlay: { x: number; y: number } = { x: 0, y: 0 };
/** 手柄中心在 overlay 容器内的坐标（拖拽时更新） */
let explodeHandlePos: { x: number; y: number } = { x: 0, y: 0 };

/**
 * 获取或创建覆盖层容器元素。
 *
 * 容器是一个绝对定位的 div，插入到当前激活 Canvas 的后面。
 * 若 Canvas 父元素是静态定位，会自动改为相对定位以确保覆盖层正确叠加。
 *
 * @returns 覆盖层容器元素
 */
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

/**
 * 计算图元在屏幕坐标系中的边界矩形。
 *
 * 将图元的 Paper.js 坐标系边界转换为屏幕像素坐标，
 * 考虑 Canvas 元素的实际显示尺寸与内部坐标系的比例缩放。
 *
 * @param item - paper.js 图元实例
 * @returns 屏幕坐标边界 `{ left, top, width, height }`，无法计算时返回 `null`
 */
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

/**
 * 将覆盖层元素定位到指定图元的屏幕边界位置。
 *
 * @param overlay - 要定位的覆盖层 div 元素
 * @param item - 目标图元实例
 */
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

/**
 * 创建高亮覆盖层元素并添加到容器中。
 *
 * - `SELECTED` 类型：红色实线边框，用于标记当前选中的图元
 * - `HOVER` 类型：蓝色虚线边框，用于拾取器模式下的悬停预览
 *
 * @param type - 覆盖层类型
 * @returns 创建的覆盖层 div 元素
 */
function createOverlayElement(type: HighlightType): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `__paper_devtools_overlay_${type}__`;

  if (type === HIGHLIGHT_TYPE.SELECTED) {
    el.style.cssText =
      'position:absolute;pointer-events:none;border:2px solid rgba(245,80,60,0.9);background:rgba(245,80,60,0.08);border-radius:2px;transition:left 0.05s,top 0.05s,width 0.05s,height 0.05s;display:none;';
  } else {
    el.style.cssText =
      'position:absolute;pointer-events:none;border:1.5px dashed rgba(66,133,244,0.8);background:rgba(66,133,244,0.06);border-radius:2px;transition:left 0.05s,top 0.05s,width 0.05s,height 0.05s;display:none;';
  }

  getOverlayContainer().appendChild(el);
  return el;
}

/**
 * 更新指定类型覆盖层的位置，使其跟随对应节点图元。
 *
 * @param type - 覆盖层类型
 * @param nodeId - 目标节点 ID
 */
function updateOverlayPosition(type: HighlightType, nodeId: string) {
  const item = findPaperItemById(nodeId);
  if (!item) return;

  const overlay = type === HIGHLIGHT_TYPE.SELECTED ? selectedOverlay : hoverOverlay;
  if (!overlay) return;

  positionOverlay(overlay, item);
}

/**
 * 同步更新所有覆盖层的位置。
 *
 * 在场景变化、窗口缩放或滚动时调用，确保选中高亮和悬停高亮
 * 覆盖层始终与图元位置保持一致。
 */
function syncAllOverlays() {
  if (overlayEnabled && highlightedNodeId) updateOverlayPosition(HIGHLIGHT_TYPE.SELECTED, highlightedNodeId);
  if (hoveredNodeId) {
    // 拾取器悬停的图元若已隐藏，则清除蓝色虚线边框
    // （场景树 hover 不受此限制，仍对隐藏节点显示边框）
    if (hoverFromPicker) {
      const item = findPaperItemById(hoveredNodeId);
      if (item && !item.visible) {
        hideHighlight(HIGHLIGHT_TYPE.HOVER);
        return;
      }
    }
    updateOverlayPosition(HIGHLIGHT_TYPE.HOVER, hoveredNodeId);
  }
}

/**
 * 显示指定节点的高亮覆盖层。
 *
 * - `SELECTED` 类型受 `overlayEnabled` 开关控制
 * - `HOVER` 类型用于拾取器模式，独立于 `overlayEnabled` 开关
 *
 * @param nodeId - 要高亮的节点 ID
 * @param type - 高亮类型
 */
function showHighlight(nodeId: string, type: HighlightType) {
  // overlayEnabled only controls the selected overlay; hover overlay is for picker
  if (type === HIGHLIGHT_TYPE.SELECTED && !overlayEnabled) return;

  const item = findPaperItemById(nodeId);
  if (!item) return;

  if (type === HIGHLIGHT_TYPE.SELECTED) {
    if (!selectedOverlay) selectedOverlay = createOverlayElement(HIGHLIGHT_TYPE.SELECTED);
    positionOverlay(selectedOverlay, item);
    highlightedNodeId = nodeId;
  } else {
    if (!hoverOverlay) hoverOverlay = createOverlayElement(HIGHLIGHT_TYPE.HOVER);
    positionOverlay(hoverOverlay, item);
    hoveredNodeId = nodeId;
  }
}

/**
 * 隐藏指定类型的高亮覆盖层。
 *
 * @param type - 要隐藏的覆盖层类型
 */
function hideHighlight(type: HighlightType) {
  if (type === HIGHLIGHT_TYPE.SELECTED && selectedOverlay) {
    selectedOverlay.style.display = 'none';
    highlightedNodeId = null;
  }
  if (type === HIGHLIGHT_TYPE.HOVER && hoverOverlay) {
    hoverOverlay.style.display = 'none';
    hoveredNodeId = null;
    hoverFromPicker = false;
  }
}

/**
 * 清除所有覆盖层元素并重置相关状态。
 *
 * 移除选中覆盖层、悬停覆盖层和容器元素，并清空所有节点 ID 引用。
 * 通常在 Scope 切换或 DevTools 清理时调用。
 */
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
  hoverFromPicker = false;
}

/**
 * 设置选中高亮覆盖层的启用/禁用状态。
 *
 * 禁用时隐藏当前选中覆盖层；重新启用时若有高亮节点则恢复显示。
 * 注意：此开关仅影响 `SELECTED` 类型覆盖层，不影响拾取器的 `HOVER` 覆盖层。
 *
 * @param enabled - 是否启用选中高亮覆盖层
 */
function setOverlayEnabled(enabled: boolean) {
  overlayEnabled = enabled;
  if (!enabled) {
    // Only hide selected overlay; hover overlay is for picker and works independently
    if (selectedOverlay) {
      selectedOverlay.style.display = 'none';
    }
  } else if (highlightedNodeId) {
    // Re-show selected overlay if there's a highlighted node
    if (!selectedOverlay) selectedOverlay = createOverlayElement(HIGHLIGHT_TYPE.SELECTED);
    updateOverlayPosition(HIGHLIGHT_TYPE.SELECTED, highlightedNodeId);
  }
}

/**
 * 为所有已注册 Scope 的 Canvas 元素绑定点击事件监听器。
 *
 * 点击 Canvas 时自动切换到对应的 Scope（受 `autoSwitchScope` 开关控制）。
 * 使用 WeakMap 避免重复绑定，拾取器模式激活时跳过自动切换。
 */
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

/**
 * 设置是否启用点击 Canvas 自动切换 Scope 功能。
 *
 * @param enabled - 是否启用自动切换
 */
function setAutoSwitchScope(enabled: boolean) {
  autoSwitchScope = enabled;
  if (enabled) {
    setupCanvasClickListeners();
  }
}

/**
 * 在当前 Project 的场景树中查找指定图元对应的节点 ID。
 *
 * 从 Project 根节点开始深度优先搜索，比较图元引用是否匹配。
 *
 * @param targetItem - 要查找的图元实例
 * @returns 匹配的节点 ID，未找到则返回 `null`
 */
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

/**
 * 将鼠标事件的屏幕坐标转换为当前激活 Scope 的 Canvas 坐标系中的点。
 *
 * 考虑 Canvas 元素的显示尺寸与内部坐标系的比例缩放，
 * 使用当前激活 Scope 的 `Point` 构造函数创建点对象。
 *
 * @param e - 鼠标事件
 * @returns Canvas 坐标系中的 Point 实例，无法计算时返回 `null`
 */
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

/**
 * 启用拾取器模式。
 *
 * 拾取器模式允许用户通过鼠标在 Canvas 上直接点选图元：
 * - 鼠标移动时进行命中测试，显示悬停高亮覆盖层
 * - 点击时选中命中的图元，派发 `PAPER_PICKER_RESULT` 事件
 * - Ctrl/Cmd + 点击时选中父级图元
 * - 再次点击已选中图元时取消选中
 *
 * 激活后 Canvas 鼠标光标变为十字准星样式。
 */
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
        // 标记悬停来自拾取器：syncAllOverlays 会据此对隐藏图元清除边框
        hoverFromPicker = true;
        showHighlight(nodeId, HIGHLIGHT_TYPE.HOVER);
      }
    } else {
      hideHighlight(HIGHLIGHT_TYPE.HOVER);
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
            window.dispatchEvent(new CustomEvent(INJECT_EVENT.PAPER_PICKER_RESULT, {
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
        window.dispatchEvent(new CustomEvent(INJECT_EVENT.PAPER_PICKER_RESULT, {
          detail: { nodeId, deselect: nodeId === highlightedNodeId },
        }));
      }
    }
  };

  canvas.addEventListener('mousemove', pickerMouseMoveHandler);
  canvas.addEventListener('click', pickerClickHandler, true);
}

/**
 * 禁用拾取器模式。
 *
 * 移除 Canvas 上的 mousemove 和 click 事件监听器，
 * 恢复鼠标光标样式，并隐藏悬停高亮覆盖层。
 */
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

  hideHighlight(HIGHLIGHT_TYPE.HOVER);
}

// ===== 爆炸预览模式 =====

/**
 * 注入爆炸手柄的 CSS 样式（默认小尺寸，hover 放大）。
 *
 * 使用 id 守卫确保只注入一次。手柄默认 8px 仅作视觉标记，鼠标悬停时
 * 放大到 18px 便于抓取，transition 平滑过渡。
 */
function ensureExplodeHandleStyle() {
  if (document.getElementById('__paper_devtools_explode_style__')) return;
  const style = document.createElement('style');
  style.id = '__paper_devtools_explode_style__';
  style.textContent =
    '.__paper_devtools_explode_handle__{width:8px;height:8px;transition:width .15s,height .15s}' +
    '.__paper_devtools_explode_handle__:hover{width:18px;height:18px}';
  document.head.appendChild(style);
}

/**
 * 计算 Group 中心点在 overlay 容器坐标系（相对 canvas 父元素原点）中的位置。
 *
 * 使用 `view.projectToView` 完成 Paper.js 坐标 → canvas 像素的变换，
 * 再叠加 canvas 在父元素中的偏移，得到手柄应放置的 left/top。
 */
function getGroupCenterOverlayPos(group: paper.Group): { x: number; y: number } | null {
  const view = getActiveView();
  const canvas = view?.element as HTMLCanvasElement | undefined;
  if (!view || !canvas) return null;
  const projected = view.projectToView(group.position);
  return {
    x: canvas.offsetLeft + projected.x,
    y: canvas.offsetTop + projected.y,
  };
}

/** rAF 节流标志：确保每帧最多通知 Panel 一次 factor 变化 */
let explodeNotifyScheduled = false;

/**
 * 用 requestAnimationFrame 节流地向 Panel 通知当前 factor。
 *
 * 拖拽 mousemove 频率高（约 60fps），rAF 合并确保跨上下文消息每帧最多一条。
 */
function notifyExplodeFactor() {
  if (explodeNotifyScheduled || !explodeGroupId) return;
  explodeNotifyScheduled = true;
  requestAnimationFrame(() => {
    explodeNotifyScheduled = false;
    if (!explodeGroupId) return;
    window.dispatchEvent(new CustomEvent(INJECT_EVENT.PAPER_EXPLODE_FACTOR, {
      detail: { groupId: explodeGroupId, factor: explodeFactor },
    }));
  });
}

/**
 * 根据 factor 移动所有直接子图元到爆炸位置，并刷新视图，同时实时通知 Panel。
 */
function applyExplodeFactor(factor: number) {
  if (!explodeGroupItem) return;
  explodeFactor = factor;
  const positions = computeExplodePositions(explodeOrigins, explodeCenter, factor, explodeMaxDist);
  explodeGroupItem.children.forEach((child, i) => {
    const p = positions[i];
    if (p) {
      child.position.x = p.x;
      child.position.y = p.y;
    }
  });
  const view = getActiveView();
  if (view) view.update();
  notifyExplodeFactor();
}

/** 将手柄定位到当前 `explodeHandlePos`。 */
function positionExplodeHandle() {
  if (!explodeHandle) return;
  explodeHandle.style.left = `${explodeHandlePos.x}px`;
  explodeHandle.style.top = `${explodeHandlePos.y}px`;
}

/** 手柄 mousedown：进入拖拽，记录起始屏幕坐标与手柄锚点位置。 */
function onExplodeHandleMouseDown(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  explodeDragStart = { x: e.clientX, y: e.clientY };
  explodeHandleAnchor = { ...explodeHandlePos };
  document.addEventListener('mousemove', onExplodeHandleMouseMove);
  document.addEventListener('mouseup', onExplodeHandleMouseUp);
}

/**
 * 手柄 mousemove：移动子图元、手柄跟随。
 *
 * factor = 手柄到 Group 中心的距离 / maxDrag（而非拖拽距离），这样无论从哪个方向
 * 拖拽，手柄靠近中心 = 收回，远离中心 = 爆炸。手柄被限制在以中心为圆心、maxDrag
 * 为半径的圆内。
 */
function onExplodeHandleMouseMove(e: MouseEvent) {
  if (!explodeDragStart) return;
  const dx = e.clientX - explodeDragStart.x;
  const dy = e.clientY - explodeDragStart.y;

  // 手柄目标位置 = 锚点 + 拖拽 delta
  let nx = explodeHandleAnchor.x + dx;
  let ny = explodeHandleAnchor.y + dy;

  // 限制在以 Group 中心为圆心、maxDrag 为半径的圆内
  const cx = nx - explodeCenterOverlay.x;
  const cy = ny - explodeCenterOverlay.y;
  const distToCenter = Math.hypot(cx, cy);
  if (explodeMaxDrag > 0 && distToCenter > explodeMaxDrag) {
    const ratio = explodeMaxDrag / distToCenter;
    nx = explodeCenterOverlay.x + cx * ratio;
    ny = explodeCenterOverlay.y + cy * ratio;
  }

  explodeHandlePos = { x: nx, y: ny };
  // factor 由手柄到中心的距离决定
  const finalDist = Math.hypot(nx - explodeCenterOverlay.x, ny - explodeCenterOverlay.y);
  const factor = dragToFactor(finalDist, explodeMaxDrag);
  applyExplodeFactor(factor);
  positionExplodeHandle();
}

/** 手柄 mouseup：结束拖拽（factor 已在 mousemove 中实时通知 Panel）。 */
function onExplodeHandleMouseUp() {
  document.removeEventListener('mousemove', onExplodeHandleMouseMove);
  document.removeEventListener('mouseup', onExplodeHandleMouseUp);
  explodeDragStart = null;
}

/**
 * 进入 Group 爆炸预览模式。
 *
 * 1. 记录每个直接子图元的原始 position 到 `child.data.__explodeOrigin__`；
 * 2. 计算 Group 中心、最大远离距离、满爆炸拖拽距离；
 * 3. 创建拖拽手柄并定位到 Group 中心。
 *
 * 若 Group 无子图元或 bounds 不可用，返回失败。
 */
function enableExplodeMode(nodeId: string): { success: boolean; reason?: string } {
  try {
    if (explodeGroupId) {
      // 已有爆炸模式进行中，先清理
      disableExplodeMode();
    }
    const item = findPaperItemById(nodeId);
    if (!item || item.className !== 'Group') {
      return { success: false, reason: '所选节点不是 Group' };
    }
    const group = item as paper.Group;
    if (!group.children || group.children.length === 0) {
      return { success: false, reason: 'Group 无子图元' };
    }
    if (!group.bounds) {
      return { success: false, reason: 'Group bounds 不可用' };
    }

    explodeGroupId = nodeId;
    explodeGroupItem = group;
    explodeFactor = 0;

    // 记录子图元原始位置
    explodeOrigins = group.children.map(child => {
      const pos = child.position;
      (child as any).data.__explodeOrigin__ = { x: pos.x, y: pos.y };
      return { x: pos.x, y: pos.y };
    });

    // 中心与最大远离距离
    explodeCenter = { x: group.position.x, y: group.position.y };
    const diag = Math.hypot(group.bounds.width, group.bounds.height);
    explodeMaxDist = diag * 0.5;

    // 满爆炸拖拽距离（屏幕像素）
    const view = getActiveView();
    const zoom = view ? view.zoom : 1;
    explodeMaxDrag = Math.max(60, diag * 0.8 * zoom); // 最小 60px 保证可拖

    // 创建手柄（默认小尺寸，hover 时放大便于抓取）
    ensureExplodeHandleStyle();
    const container = getOverlayContainer();
    explodeHandle = document.createElement('div');
    explodeHandle.className = '__paper_devtools_explode_handle__';
    explodeHandle.style.cssText =
      'position:absolute;border-radius:50%;' +
      'background:rgba(245,80,60,0.9);border:2px solid #fff;cursor:grab;' +
      'transform:translate(-50%,-50%);box-shadow:0 0 4px rgba(0,0,0,0.5);' +
      'z-index:100000;pointer-events:auto;';
    explodeHandle.title = '拖拽控制 Group 拆开程度';
    explodeHandle.addEventListener('mousedown', onExplodeHandleMouseDown);

    const centerPos = getGroupCenterOverlayPos(group);
    if (centerPos) {
      explodeHandlePos = centerPos;
      explodeCenterOverlay = centerPos;
    }
    positionExplodeHandle();
    container.appendChild(explodeHandle);

    return { success: true };
  } catch (error) {
    console.error('[Paper DevTools] 启用爆炸模式失败:', error);
    return { success: false, reason: String(error) };
  }
}

/**
 * 重置爆炸程度为 0：子图元回到原始位置，手柄归位到 Group 中心。
 *
 * 保留爆炸模式（手柄仍存在），用户可继续拖拽。
 */
function resetExplode(): { success: boolean } {
  if (!explodeGroupItem || !explodeGroupId) return { success: false };
  applyExplodeFactor(0);
  const centerPos = getGroupCenterOverlayPos(explodeGroupItem);
  if (centerPos) {
    explodeHandlePos = centerPos;
    positionExplodeHandle();
  }
  // factor=0 已由 applyExplodeFactor 通过 rAF 通知 Panel
  return { success: true };
}

/**
 * 退出爆炸预览模式：恢复所有子图元到原始位置，移除手柄，清空状态。
 */
function disableExplodeMode(): { success: boolean } {
  if (!explodeGroupItem) return { success: false };
  // 恢复子图元位置
  explodeGroupItem.children.forEach(child => {
    const origin = (child as any).data.__explodeOrigin__;
    if (origin) {
      child.position.x = origin.x;
      child.position.y = origin.y;
      delete (child as any).data.__explodeOrigin__;
    }
  });
  const view = getActiveView();
  if (view) view.update();

  // 移除手柄
  if (explodeHandle && explodeHandle.parentNode) {
    explodeHandle.parentNode.removeChild(explodeHandle);
  }
  explodeHandle = null;
  explodeGroupItem = null;
  explodeGroupId = null;
  explodeOrigins = [];
  explodeFactor = 0;
  explodeDragStart = null;
  return { success: true };
}

/**
 * 监听 `PAPER_SCENE_CHANGED` 事件，场景变化时同步更新所有覆盖层位置。
 */
window.addEventListener(INJECT_EVENT.PAPER_SCENE_CHANGED, () => {
  syncAllOverlays();
});

/**
 * 监听窗口 `resize` 事件，窗口尺寸变化时同步更新覆盖层位置。
 */
window.addEventListener('resize', () => {
  syncAllOverlays();
});

/**
 * 监听窗口 `scroll` 事件（捕获阶段），页面滚动时同步更新覆盖层位置。
 */
window.addEventListener('scroll', () => {
  syncAllOverlays();
}, true);

/**
 * 监听 `PAPER_SCOPE_CHANGE` 事件，Scope 切换时清除所有覆盖层并重新绑定 Canvas 点击监听。
 */
window.addEventListener(INJECT_EVENT.PAPER_SCOPE_CHANGE, () => {
  clearAllOverlays();
  focusSnapshot = null;
  focusedNodeId = null;
  if (autoSwitchScope) {
    setupCanvasClickListeners();
  }
});

/**
 * 进入/切换聚焦指定节点。
 *
 * - 首次聚焦：采集所有图元的可见性快照；
 * - 切换聚焦目标：先按快照恢复到聚焦前状态；
 * - 然后解析 nodeId 路径，从 project.layers 起逐层将路径索引对应的子图元设为可见、
 *   其余兄弟设为隐藏，直到抵达目标节点（目标节点自身设为可见，其后代不触碰）。
 * - `nodeId === 'root'` 时不隐藏任何节点（仅采集快照进入聚焦态）。
 *
 * @param nodeId - 目标节点 ID
 * @returns `{ success, sceneTree? }`，失败时含 `reason`
 */
function focusNode(nodeId: string): { success: boolean; sceneTree?: any; reason?: string } {
  const project = getActiveProject();
  if (!project) return { success: false, reason: '无激活 Project' };

  // 切换聚焦目标时先按快照恢复；首次聚焦则采集快照
  if (focusSnapshot) {
    restoreVisibility(project, focusSnapshot);
  } else {
    focusSnapshot = collectVisibilitySnapshot(project);
  }

  if (!applyFocusPath(project, nodeId)) {
    return { success: false, reason: '节点路径无效' };
  }

  const view = getActiveView();
  if (view) view.update();
  focusedNodeId = nodeId;
  const sceneTree = buildScopeProject(project);
  return { success: true, sceneTree };
}

/**
 * 退出聚焦：按聚焦前快照逐图元恢复可见性，清空快照与 focusedNodeId。
 *
 * @returns `{ success, sceneTree? }`
 */
function exitFocus(): { success: boolean; sceneTree?: any } {
  const project = getActiveProject();
  if (!project || !focusSnapshot) {
    focusSnapshot = null;
    focusedNodeId = null;
    return { success: false };
  }
  restoreVisibility(project, focusSnapshot);
  const view = getActiveView();
  if (view) view.update();
  focusSnapshot = null;
  focusedNodeId = null;
  const sceneTree = buildScopeProject(project);
  return { success: true, sceneTree };
}

/**
 * DevTools 面板消息处理入口。
 *
 * 监听 `PAPER_DEVTOOLS_MESSAGE` 自定义事件，根据 `action` 字段分发到对应的处理逻辑。
 * 处理完成后通过 `PAPER_DEVTOOLS_RESPONSE` 事件返回响应，携带与请求相同的 `id` 用于异步匹配。
 *
 * 支持的 Action 列表：
 * | Action | 说明 |
 * |--------|------|
 * | `GET_SCENE_TREE` | 获取当前激活 Scope 的场景树 |
 * | `SELECT_NODE` | 选中指定节点并显示高亮覆盖层 |
 * | `TOGGLE_NODE_VISIBILITY` | 切换节点可见性 |
 * | `UPDATE_NODE_PROPERTY` | 更新节点属性（position/fillColor/strokeColor 等） |
 * | `GET_AVAILABLE_SCOPES` | 获取所有可用 Scope 列表 |
 * | `SET_ACTIVE_SCOPE` | 切换激活的 Scope |
 * | `GET_NODE_INFO` | 获取指定节点的信息 |
 * | `HIGHLIGHT_NODE` | 高亮指定节点 |
 * | `CLEAR_HIGHLIGHT` | 清除高亮覆盖层 |
 * | `SET_OVERLAY_ENABLED` | 启用/禁用选中高亮覆盖层 |
 * | `ENABLE_PICKER` | 启用拾取器模式 |
 * | `DISABLE_PICKER` | 禁用拾取器模式 |
 * | `DEVTOOLS_CLEANUP` | DevTools 关闭时清理资源 |
 * | `SET_AUTO_SWITCH_SCOPE` | 启用/禁用点击 Canvas 自动切换 Scope |
 * | `GET_AUTO_SWITCH_SCOPE` | 获取自动切换 Scope 的启用状态 |
 */
window.addEventListener(INJECT_EVENT.PAPER_DEVTOOLS_MESSAGE, function (event) {
  const message = (event as any).detail;
  if (!message || !message.action) return;
  let response = null;
  switch (message.action) {
    case PANEL_ACTION.GET_SCENE_TREE:
      {
        const project = getActiveProject();
        if (project) {
          const sceneTree = buildScopeProject(project);
          response = { sceneTree };
        }
      }
      break;
    case PANEL_ACTION.SELECT_NODE:
      if (message.nodeId) {
        const item = findPaperItemById(message.nodeId);
        if (item) {
          const project = getActiveProject();
          if (project) {
            project.deselectAll();
          }
          const node = buildScopeTree(item, message.nodeId);
          response = { node };
          showHighlight(message.nodeId, HIGHLIGHT_TYPE.SELECTED);
          (window as any).$paper = item;
          console.log('%c[Paper DevTools]%c 选中图元:', 'color:#f5503c;font-weight:bold', 'color:inherit', item);
        }
      }
      break;
    case PANEL_ACTION.TOGGLE_NODE_VISIBILITY:
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
    case PANEL_ACTION.UPDATE_NODE_PROPERTY:
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
            } else if (
              message.property === "bounds" &&
              typeof message.value === "object"
            ) {
              // Paper.js bounds setter 通过缩放/平移来匹配新边界
              item.bounds = {
                x: message.value.x,
                y: message.value.y,
                width: message.value.width,
                height: message.value.height,
              } as any;
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
    case PANEL_ACTION.GET_AVAILABLE_SCOPES:
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
    case PANEL_ACTION.SET_ACTIVE_SCOPE:
      if (message.scopeId && window.__PAPER_SCOPES__ && window.__PAPER_SCOPES__.switchScope) {
        const success = window.__PAPER_SCOPES__.switchScope(message.scopeId);
        response = { success };
      }
      break;
    case PANEL_ACTION.GET_NODE_INFO:
      if (message.nodeId) {
        const item = findPaperItemById(message.nodeId);
        if (item) {
          const node = buildScopeTree(item, message.nodeId);
          response = { node };
        }
      }
      break;
    case PANEL_ACTION.HIGHLIGHT_NODE:
      if (message.nodeId) {
        // 场景树 hover 来自 HIGHLIGHT_NODE，标记为非拾取器来源，
        // 使 syncAllOverlays 不对隐藏节点清除蓝色虚线边框
        if ((message.type || HIGHLIGHT_TYPE.SELECTED) === HIGHLIGHT_TYPE.HOVER) {
          hoverFromPicker = false;
        }
        showHighlight(message.nodeId, message.type || HIGHLIGHT_TYPE.SELECTED);
        response = { success: true };
      }
      break;
    case PANEL_ACTION.CLEAR_HIGHLIGHT:
      hideHighlight(message.type || HIGHLIGHT_TYPE.HOVER);
      response = { success: true };
      break;
    case PANEL_ACTION.SET_OVERLAY_ENABLED:
      setOverlayEnabled(message.enabled);
      response = { success: true };
      break;
    case PANEL_ACTION.ENABLE_PICKER:
      enablePicker();
      response = { success: true };
      break;
    case PANEL_ACTION.DISABLE_PICKER:
      disablePicker();
      response = { success: true };
      break;
    case PANEL_ACTION.DEVTOOLS_CLEANUP:
      disablePicker();
      disableExplodeMode();
      clearAllOverlays();
      focusSnapshot = null;
      focusedNodeId = null;
      (window as any).$paper = undefined;
      response = { success: true };
      break;
    case PANEL_ACTION.SET_AUTO_SWITCH_SCOPE:
      setAutoSwitchScope(message.enabled);
      response = { success: true };
      break;
    case PANEL_ACTION.GET_AUTO_SWITCH_SCOPE:
      response = { enabled: autoSwitchScope };
      break;
    case PANEL_ACTION.ENABLE_EXPLODE_MODE:
      if (message.nodeId) {
        response = enableExplodeMode(message.nodeId);
      }
      break;
    case PANEL_ACTION.DISABLE_EXPLODE_MODE:
      response = disableExplodeMode();
      break;
    case PANEL_ACTION.RESET_EXPLODE:
      response = resetExplode();
      break;
    case PANEL_ACTION.FOCUS_NODE:
      if (message.nodeId) {
        response = focusNode(message.nodeId);
      }
      break;
    case PANEL_ACTION.EXIT_FOCUS:
      response = exitFocus();
      break;
  }
  if (response) {
    window.dispatchEvent(
      new CustomEvent(INJECT_EVENT.PAPER_DEVTOOLS_RESPONSE, {
        detail: {
          id: message.id,
          response,
        },
      })
    );
  }
});
