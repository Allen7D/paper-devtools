import type { PaperNode } from '../store';

/**
 * 根据路径式节点 ID 从场景树中提取祖先链。
 *
 * 节点 ID 格式为 "root_0_1_2"，其中 root 是 Project 根节点，
 * 后续数字表示在各层级子元素中的索引。
 *
 * @param nodeId - 目标节点 ID
 * @param sceneTree - 场景树根节点
 * @returns 祖先链数组，从根到当前节点顺序排列；末尾为当前节点本身。无法匹配时返回已匹配部分。
 */
export function getAncestorChain(
  nodeId: string,
  sceneTree: PaperNode | null
): Array<{ id: string; name: string; type: string }> {
  if (!sceneTree) return [];

  const parts = nodeId.split('_');
  const result: Array<{ id: string; name: string; type: string }> = [];
  let current: PaperNode | null = sceneTree;

  for (let i = 0; i < parts.length; i++) {
    if (!current) break;

    const id = parts.slice(0, i + 1).join('_');
    result.push({ id, name: current.name, type: current.type });

    // 根据下一层级的索引数字在 children 中查找对应子节点
    if (i + 1 < parts.length) {
      const index = Number(parts[i + 1]);
      if (Number.isNaN(index) || index < 0 || index >= current.children.length) {
        break;
      }
      current = current.children[index];
    }
  }

  return result;
}

/**
 * 深度优先遍历场景树，返回所有可见（已展开）节点的 ID 扁平数组。
 *
 * 折叠节点的自身 ID 包含在结果中，但其子节点不包含。
 * 顺序为深度优先前序遍历（父节点在前，子节点在后）。
 *
 * @param node - 场景树根节点或子树根节点（通常是过滤后的 filteredTree）
 * @param expandedNodes - 当前展开的节点 ID 集合
 * @returns 可见节点 ID 的扁平数组
 */
export function getVisibleNodeIds(
  node: PaperNode,
  expandedNodes: Set<string>
): string[] {
  const result: string[] = [];

  const walk = (n: PaperNode) => {
    result.push(n.id);
    if (expandedNodes.has(n.id)) {
      n.children.forEach(walk);
    }
  };

  walk(node);
  return result;
}

/**
 * 在场景树中深度优先查找指定 ID 的节点。
 *
 * @param node - 子树根节点
 * @param id - 目标节点 ID
 * @returns 匹配的节点，未找到返回 `null`
 */
export function findNodeInTree(node: PaperNode, id: string): PaperNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNodeInTree(child, id);
    if (found) return found;
  }
  return null;
}
