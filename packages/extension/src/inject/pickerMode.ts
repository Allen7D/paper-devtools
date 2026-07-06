import { getActiveScope, getActiveView, getActiveProject, findNodeIdByItem, findPaperItemById } from "./sceneTreeBuilder";
import { showHighlight, hideHighlight, getHighlightedNodeId, setHoverFromPicker } from "./overlayManager";
import { HIGHLIGHT_TYPE, INJECT_EVENT } from "@/shared/constants";

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
 * 为所有已注册 Scope 的 Canvas 元素绑定点击事件监听器。
 *
 * 点击 Canvas 时自动切换到对应的 Scope（受 `autoSwitchScope` 开关控制）。
 * 使用 WeakMap 避免重复绑定，拾取器模式激活时跳过自动切换。
 */
export function setupCanvasClickListeners() {
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
export function setAutoSwitchScope(enabled: boolean) {
  autoSwitchScope = enabled;
  if (enabled) {
    setupCanvasClickListeners();
  }
}

/** 获取自动切换 Scope 的启用状态。 */
export function getAutoSwitchScope(): boolean {
  return autoSwitchScope;
}

/** 拾取器模式是否激活。 */
export function isPickerActive(): boolean {
  return pickerActive;
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
export function enablePicker() {
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
        setHoverFromPicker(true);
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
      const currentHighlighted = getHighlightedNodeId();
      if (currentHighlighted) {
        const currentItem = findPaperItemById(currentHighlighted);
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
          detail: { nodeId, deselect: nodeId === getHighlightedNodeId() },
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
export function disablePicker() {
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
