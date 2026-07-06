import { extractItemProperties, extractProjectProperties } from "./extra";
import type { ScopeProjectNode, ScopeTreeNode } from "types";

/**
 * 根据 paper.js Project 实例构建场景树根节点。
 *
 * 遍历 Project 的所有图层（layers），递归调用 {@link buildScopeTree} 构建子节点，
 * 最终生成包含项目属性和完整子树结构的 {@link ScopeProjectNode}。
 *
 * @param project - paper.js Project 实例
 * @returns 场景树根节点，id 固定为 `"root"`
 */
export function buildScopeProject(project: paper.Project): ScopeProjectNode {
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
export function buildScopeTree(item: paper.Item, id = ""): ScopeTreeNode {
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
export function getActiveScope() {
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
export function getActiveProject(): paper.Project | null {
  const activeScope = getActiveScope();
  return activeScope && activeScope.project ? activeScope.project : null;
}

/**
 * 获取当前激活 Scope 的 View 实例。
 *
 * @returns 激活的 View 实例，若无则返回 `null`
 */
export function getActiveView(): paper.View | null {
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
export function findPaperItemById(id: string): paper.Item | null {
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

/**
 * 在当前 Project 的场景树中查找指定图元对应的节点 ID。
 *
 * 从 Project 根节点开始深度优先搜索，比较图元引用是否匹配。
 *
 * @param targetItem - 要查找的图元实例
 * @returns 匹配的节点 ID，未找到则返回 `null`
 */
export function findNodeIdByItem(targetItem: paper.Item): string | null {
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
