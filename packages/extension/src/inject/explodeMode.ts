import { findPaperItemById, getActiveView } from "./sceneTreeBuilder";
import { getOverlayContainer } from "./overlayManager";
import { computeExplodePositions, dragToFactor, type Point } from "./explodeMath";
import { INJECT_EVENT } from "@/shared/constants";

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
export function enableExplodeMode(nodeId: string): { success: boolean; reason?: string } {
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
export function resetExplode(): { success: boolean } {
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
export function disableExplodeMode(): { success: boolean } {
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
