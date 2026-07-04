/**
 * 聚焦图元的纯逻辑工具。
 *
 * 这些函数不依赖 Paper.js 运行时或 DOM，操作类 paper.js 的树结构
 * （节点具有 `visible`、`children`/`layers`、`className` 等字段），
 * 便于在 node 环境下单元测试。parse.ts 在 Inject 上下文中调用它们。
 */

/** 类 paper.js 节点的最小结构（Project 或 Item） */
export interface FocusableItem {
  visible?: boolean;
  className?: string;
  activeLayer?: unknown;
  layers?: FocusableItem[];
  children?: FocusableItem[];
}

/**
 * 判断节点是否为 Project（拥有 layers）。
 */
function isProject(item: FocusableItem): boolean {
  return item.className === 'Project' || !!(item.activeLayer && item.layers);
}

/** 获取节点的子节点列表（Project 取 layers，其余取 children）。 */
function getChildren(item: FocusableItem): FocusableItem[] | null {
  return isProject(item) ? (item.layers ?? null) : (item.children ?? null);
}

/**
 * 采集整棵树的可见性快照。
 *
 * 深度优先遍历，以路径式 ID 为 key 记录每个节点的 `visible`，供退出聚焦时恢复。
 *
 * @param root - 根节点（Project）
 * @returns 节点 ID 到 visible 的映射
 */
export function collectVisibilitySnapshot(root: FocusableItem): Map<string, boolean> {
  const snapshot = new Map<string, boolean>();
  const walk = (item: FocusableItem, id: string) => {
    snapshot.set(id, item.visible ?? true);
    const children = getChildren(item);
    if (children) {
      for (let i = 0; i < children.length; i++) {
        walk(children[i], `${id}_${i}`);
      }
    }
  };
  walk(root, 'root');
  return snapshot;
}

/**
 * 按快照恢复每个节点的 `visible`。
 *
 * @param root - 根节点（Project）
 * @param snapshot - 聚焦前采集的可见性快照
 */
export function restoreVisibility(root: FocusableItem, snapshot: Map<string, boolean>): void {
  const walk = (item: FocusableItem, id: string) => {
    if (snapshot.has(id)) {
      item.visible = snapshot.get(id);
    }
    const children = getChildren(item);
    if (children) {
      for (let i = 0; i < children.length; i++) {
        walk(children[i], `${id}_${i}`);
      }
    }
  };
  walk(root, 'root');
}

/**
 * 按节点 ID 路径隐藏目标节点各层祖先的兄弟分支。
 *
 * 从 root 的子节点起，逐层将路径索引对应的节点设为可见、其余兄弟设为隐藏，
 * 直到抵达目标节点（目标节点自身设为可见，其后代不触碰）。
 *
 * @param root - 根节点（Project）
 * @param nodeId - 目标节点 ID（如 `root_0_1_2`），`root` 时不隐藏任何节点
 * @returns 成功返回 true；路径索引越界返回 false
 */
export function applyFocusPath(root: FocusableItem, nodeId: string): boolean {
  if (nodeId === 'root') return true;
  const parts = nodeId.split('_'); // ['root', '0', '1', '2']
  let currentChildren = getChildren(root);
  for (let i = 1; i < parts.length; i++) {
    const idx = parseInt(parts[i], 10);
    if (!currentChildren || idx < 0 || idx >= currentChildren.length) {
      return false;
    }
    for (let j = 0; j < currentChildren.length; j++) {
      currentChildren[j].visible = j === idx;
    }
    currentChildren = getChildren(currentChildren[idx]);
  }
  return true;
}
