import { buildScopeProject, buildScopeTree, findPaperItemById, getActiveProject, getActiveView } from "./sceneTreeBuilder";
import { showHighlight, hideHighlight, clearAllOverlays, setOverlayEnabled, setHoverFromPicker } from "./overlayManager";
import { enablePicker, disablePicker, setAutoSwitchScope, getAutoSwitchScope } from "./pickerMode";
import { enableExplodeMode, disableExplodeMode, resetExplode } from "./explodeMode";
import { focusNode, exitFocus, clearFocusState } from "./focusMode";
import {
  HIGHLIGHT_TYPE,
  INJECT_EVENT,
  PANEL_ACTION,
} from "@/shared/constants";

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
export function initMessageRouter() {
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
            setHoverFromPicker(false);
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
        clearFocusState();
        (window as any).$paper = undefined;
        response = { success: true };
        break;
      case PANEL_ACTION.SET_AUTO_SWITCH_SCOPE:
        setAutoSwitchScope(message.enabled);
        response = { success: true };
        break;
      case PANEL_ACTION.GET_AUTO_SWITCH_SCOPE:
        response = { enabled: getAutoSwitchScope() };
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
}
