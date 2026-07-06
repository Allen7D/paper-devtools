import { getActiveProject, getActiveView, buildScopeProject } from "./sceneTreeBuilder";
import { collectVisibilitySnapshot, restoreVisibility, applyFocusPath } from "./focusTree";

/** 聚焦前所有图元的可见性快照（nodeId -> visible），null 表示未聚焦 */
let focusSnapshot: Map<string, boolean> | null = null;
/** 当前聚焦的节点 ID，null 表示未聚焦 */
let focusedNodeId: string | null = null;

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
export function focusNode(nodeId: string): { success: boolean; sceneTree?: any; reason?: string } {
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
export function exitFocus(): { success: boolean; sceneTree?: any } {
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

/** 获取当前聚焦的节点 ID（null 表示未聚焦）。 */
export function getFocusedNodeId(): string | null {
  return focusedNodeId;
}

/** 清空聚焦状态（用于 Scope 切换或 DevTools 清理）。 */
export function clearFocusState(): void {
  focusSnapshot = null;
  focusedNodeId = null;
}
