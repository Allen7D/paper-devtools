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

/**
 * 递归构建作用域的图元树
 * @param {paper.Item} item 
 * @param id 
 * @returns 
 */
function buildScopeTree(item: paper.Item, id = "") {
  const nodeId = id;

  // 构建基本节点信息
  let node: ScopeTreeNode = {
    id: nodeId,
    name: item.name || "",
    type: item.className || "Item",
    children: [],
    properties: {},
    visible: item.visible ?? true,
    selected: item.selected ?? false,
  };


  // 添加属性 - 根据对象类型处理
  node.properties = extractItemProperties(item);
  // 处理子项 - 根据对象类型获取子项
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
// 监听来自内容脚本的消息
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
          // 选择当前项目
          if (item.selected !== undefined) {
            item.selected = true;
          }
          // 构建节点信息
          console.log("Click:", item);
          const node = buildScopeTree(item, message.nodeId);
          response = { node };
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
            // 处理特殊属性
            console.log("Update Property:", message.property, message.value);
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
            // 构建更新后的节点信息
            const node = buildScopeTree(item, message.nodeId);
            response = { node };
          } catch (error) {
            console.error("更新属性失败:", error);
          }
        }
      }
      break;
  }
  // 发送响应
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
