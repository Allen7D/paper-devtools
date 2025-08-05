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
        node.children.push(childNode);
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

// 查找 Paper.js 中的项目
function findPaperItemById(id: string): paper.Item | null {
  if (!window.__PAPER_SCOPES__ || !window.__PAPER_SCOPES__.getActiveScope)
    return null;

  const activeScope = window.__PAPER_SCOPES__.getActiveScope();
  if (!activeScope || !activeScope.project) return null;

  // 如果是根节点
  if (id === "root") {
    return activeScope.project;
  }
  // 解析 ID 路径
  const parts = id.split("_");
  let current = activeScope.project;

  // 跳过 'root'，从第一个子级开始
  for (let i = 1; i < parts.length; i++) {
    const index = parseInt(parts[i], 10);
    let children = null;

    // 根据当前对象类型获取子项
    const isProject =
      current.className === "Project" ||
      (current.activeLayer && current.layers);
    if (isProject) {
      // Project 对象：使用所有 layers
      children = current.layers;
    } else {
      // 普通 Item 对象：使用 children 属性
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
  const message = event.detail;
  if (!message || !message.action) return;
  let response = null;
  switch (message.action) {
    case "GET_SCENE_TREE":
      if (window.__PAPER_SCOPES__ && window.__PAPER_SCOPES__.getActiveScope) {
        const activeScope = window.__PAPER_SCOPES__.getActiveScope();
        if (activeScope && activeScope.project) {
          const sceneTree = buildScopeProject(activeScope.project);
          response = { sceneTree };
        }
      }
      break;
    case "SELECT_NODE":
      if (message.nodeId) {
        const item = findPaperItemById(message.nodeId);
        if (item) {
          // 取消所有选择
          if (
            window.__PAPER_SCOPES__ &&
            window.__PAPER_SCOPES__.getActiveScope
          ) {
            const activeScope = window.__PAPER_SCOPES__.getActiveScope();
            if (activeScope && activeScope.project) {
              activeScope.project.deselectAll();
            }
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
          // 重新构建作用域树
          if (
            window.__PAPER_SCOPES__ &&
            window.__PAPER_SCOPES__.getActiveScope
          ) {
            const activeScope = window.__PAPER_SCOPES__.getActiveScope();
            if (activeScope && activeScope.project) {
              const sceneTree = buildScopeProject(activeScope.project);
              response = { sceneTree };
            }
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
              // 直接设置属性
              item[message.property] = message.value;
            }
            // 如果有视图，重绘
            if (
              window.__PAPER_SCOPES__ &&
              window.__PAPER_SCOPES__.getActiveScope
            ) {
              const activeScope = window.__PAPER_SCOPES__.getActiveScope();
              if (activeScope && activeScope.view) {
                activeScope.view.update();
              }
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
