import { findPaperItemById, getActiveProject, getActiveView } from "./sceneTreeBuilder";
import {
  HIGHLIGHT_TYPE,
  type HighlightType,
} from "@/shared/constants";

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

/**
 * 获取或创建覆盖层容器元素。
 *
 * 容器是一个绝对定位的 div，插入到当前激活 Canvas 的后面。
 * 若 Canvas 父元素是静态定位，会自动改为相对定位以确保覆盖层正确叠加。
 *
 * @returns 覆盖层容器元素
 */
export function getOverlayContainer(): HTMLDivElement {
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
export function syncAllOverlays() {
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
export function showHighlight(nodeId: string, type: HighlightType) {
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
export function hideHighlight(type: HighlightType) {
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
export function clearAllOverlays() {
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
export function setOverlayEnabled(enabled: boolean) {
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

/** 获取当前高亮选中的节点 ID。 */
export function getHighlightedNodeId(): string | null {
  return highlightedNodeId;
}

/**
 * 设置悬停是否来自拾取器。
 *
 * 拾取器悬停的图元若已隐藏则不显示蓝色虚线边框；场景树 hover 不受此限制。
 */
export function setHoverFromPicker(value: boolean) {
  hoverFromPicker = value;
}
