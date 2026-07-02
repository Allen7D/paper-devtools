import { create } from 'zustand';
import { HIGHLIGHT_TYPE, PANEL_ACTION, RUNTIME_ACTION } from '@/shared/constants';

/**
 * 场景树节点。
 *
 * 对应 Paper.js 中 `Item` / `Layer` / `Group` / `Project` 等对象在 DevTools 中的镜像表示，
 * 由 Injected Script 从 Paper.js 运行时提取并序列化后回传。
 *
 * `id` 采用路径式编码（如 `root_Layer_Path_Group`），便于在树中定位祖先链。
 */
export interface PaperNode {
  /** 节点唯一标识，路径式编码 */
  id: string;
  /** 节点显示名称，取自 Paper.js `item.name` */
  name: string;
  /** 节点类型，如 `Project` / `Layer` / `Group` / `Path` 等 */
  type: string;
  /** 子节点列表 */
  children: PaperNode[];
  /** 节点属性快照，供属性面板编辑使用 */
  properties: Record<string, any>;
  /** 节点是否可见 */
  visible: boolean;
  /** 节点是否处于选中状态 */
  selected: boolean;
}

/**
 * Scope 信息。
 *
 * 一个 Paper.js `PaperScope` 对应一个 Canvas 上下文，多 Canvas 应用会注册多个 Scope。
 */
export interface ScopeInfo {
  /** Scope 唯一标识 */
  id: string;
  /** 关联的 Canvas 元素 ID */
  canvasId: string;
  /** 是否为当前激活的 Scope */
  active: boolean;
}

/**
 * DevTools Panel 全局状态。
 *
 * 通过 Zustand 管理，包含连接状态、场景树、选中节点、UI 交互开关等状态，
 * 以及与 Content Script / Injected Script 通信的 Action。
 *
 * 通信路径：Panel ──chrome.tabs.sendMessage──▶ Content Script ──CustomEvent──▶ Injected Script
 */
interface PaperStore {
  /** 是否已连接到 Paper.js 页面 */
  connected: boolean;
  /** 连接状态描述文案，用于顶部状态栏展示 */
  connectionStatus: string;
  /** 当前激活 Scope 的场景树根节点 */
  sceneTree: PaperNode | null;
  /** 当前选中的节点（属性面板展示对象） */
  selectedNode: PaperNode | null;
  /** 鼠标悬停的节点（用于高亮预览） */
  hoveredNode: PaperNode | null;
  /** 展开的节点 ID 集合 */
  expandedNodes: Set<string>;
  /** 所有已注册的 Scope 列表 */
  availableScopes: ScopeInfo[];
  /** 当前激活的 Scope ID */
  activeScopeId: string | null;
  /** 高亮覆盖层是否启用（选中/悬停边框） */
  overlayEnabled: boolean;
  /** 拾取器是否启用（点击 Canvas 选中图元） */
  pickerEnabled: boolean;
  /** 节点搜索关键字 */
  searchQuery: string;
  /** 节点类型过滤列表 */
  typeFilter: string[];
  /** 可见性过滤模式 */
  visibilityFilter: 'all' | 'visible' | 'hidden';
  /** 点击 Canvas 时是否自动切换到对应 Scope */
  autoSwitchScope: boolean;

  /** 初始化连接：检测 Paper.js 并注册消息监听 */
  initialize: () => void;
  /** 刷新场景树（从页面重新拉取） */
  refreshSceneTree: () => void;
  /** 选中或取消选中指定节点 */
  selectNode: (nodeId: string) => void;
  /** 切换节点可见性 */
  toggleNodeVisibility: (nodeId: string) => void;
  /** 切换节点展开/折叠状态（纯本地操作，不涉及通信） */
  toggleNodeExpanded: (nodeId: string) => void;
  /** 更新节点属性并刷新场景树 */
  updateNodeProperty: (nodeId: string, property: string, value: any) => void;
  /** 获取所有可用 Scope 列表 */
  getAvailableScopes: () => void;
  /** 切换激活的 Scope */
  setActiveScope: (scopeId: string) => void;
  /** 刷新当前选中节点的最新信息 */
  refreshSelectedNode: () => void;
  /** 悬停高亮指定节点 */
  hoverNode: (nodeId: string) => void;
  /** 清除悬停高亮 */
  clearHover: () => void;
  /** 启用/禁用高亮覆盖层 */
  setOverlayEnabled: (enabled: boolean) => void;
  /** 切换拾取器模式开关 */
  togglePicker: () => void;
  /** 设置搜索关键字并自动展开匹配节点的祖先链 */
  setSearchQuery: (query: string) => void;
  /** 设置节点类型过滤 */
  setTypeFilter: (types: string[]) => void;
  /** 设置可见性过滤模式 */
  setVisibilityFilter: (filter: 'all' | 'visible' | 'hidden') => void;
  /** 启用/禁用点击 Canvas 自动切换 Scope */
  setAutoSwitchScope: (enabled: boolean) => void;
}

/** 确保运行时消息监听只注册一次的守卫标志 */
let scopeChangeListenerAdded = false;

/**
 * 向当前激活标签页发送消息。
 *
 * 封装 `chrome.tabs.query` + `chrome.tabs.sendMessage` 两步操作，
 * 自动定位当前窗口的激活标签页并转发消息到 Content Script。
 *
 * @param message 消息体，需包含 `action` 字段
 * @param callback 响应回调
 */
function sendToTab(message: any, callback: (response: any) => void) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, message, callback);
  });
}

export const usePaperStore = create<PaperStore>((set, get) => ({
  connected: false,
  connectionStatus: '等待连接...',
  sceneTree: null,
  selectedNode: null,
  hoveredNode: null,
  expandedNodes: new Set<string>(),
  availableScopes: [],
  activeScopeId: null,
  overlayEnabled: false,
  pickerEnabled: true,
  searchQuery: '',
  typeFilter: [],
  visibilityFilter: 'all',
  autoSwitchScope: true,

  /**
   * 初始化连接。
   *
   * 1. 向当前标签页发送 `DETECT_PAPER_JS` 检测 Paper.js 是否存在；
   * 2. 检测成功后拉取场景树、Scope 列表，并同步 `overlayEnabled` / `pickerEnabled` 初始状态到页面；
   * 3. 注册 `chrome.runtime.onMessage` 监听器，处理 Scope 变化、场景树变化、拾取器结果等运行时事件。
   *
   * 监听器通过 `scopeChangeListenerAdded` 守卫，确保仅注册一次。
   */
  initialize: async () => {
    set({ connectionStatus: '正在连接...' });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, { action: PANEL_ACTION.DETECT_PAPER_JS }, (response) => {
        if (chrome.runtime.lastError) {
          set({
            connected: false,
            connectionStatus: '无法连接, 错误信息(' + chrome.runtime.lastError.message + ')'
          });
          return;
        }

        if (response && response.detected) {
          set({
            connected: true,
            connectionStatus: '已连接',
          });
          get().refreshSceneTree();
          get().getAvailableScopes();
          // 同步初始状态到页面
          const { overlayEnabled, pickerEnabled } = get();
          sendToTab({ action: PANEL_ACTION.SET_OVERLAY_ENABLED, enabled: overlayEnabled }, () => { });
          sendToTab({ action: pickerEnabled ? PANEL_ACTION.ENABLE_PICKER : PANEL_ACTION.DISABLE_PICKER }, () => { });
        } else {
          set({
            connected: false,
            connectionStatus: '未检测到 Paper.js'
          });
        }
      });
    });

    if (!scopeChangeListenerAdded) {
      scopeChangeListenerAdded = true;
      chrome.runtime.onMessage.addListener((message) => {
        // Scope 列表变化：更新 Scope 列表，处理新增/移除/激活场景
        if (message.action === RUNTIME_ACTION.SCOPE_CHANGE) {
          set({
            availableScopes: message.scopes || [],
            activeScopeId: message.activeScopeId || null,
          });

          // Scope 被移除或激活切换时，清空选中节点并刷新场景树
          if (message.type === 'removed' || message.type === 'activated') {
            set({ selectedNode: null });
            get().refreshSceneTree();
          }

          // 所有画布已移除：标记断开连接
          if (message.scopes && message.scopes.length === 0) {
            set({
              connected: false,
              connectionStatus: '所有画布已移除',
              sceneTree: null,
              selectedNode: null,
            });
          } else if (message.type === 'added' && !get().connected) {
            // 首次检测到 Scope 新增：恢复连接状态
            set({
              connected: true,
              connectionStatus: '已连接',
            });
            get().refreshSceneTree();
          }
        }

        // 场景树变化：刷新场景树和选中节点信息
        if (message.action === RUNTIME_ACTION.SCENE_CHANGE) {
          get().refreshSceneTree();
          get().refreshSelectedNode();
        }

        // 拾取器选中结果：根据 deselect 标志决定选中或取消选中
        if (message.action === RUNTIME_ACTION.PICKER_RESULT && message.nodeId) {
          if (message.deselect) {
            set({ selectedNode: null });
            sendToTab({ action: PANEL_ACTION.CLEAR_HIGHLIGHT, type: HIGHLIGHT_TYPE.SELECTED }, () => { });
          } else {
            get().selectNode(message.nodeId);
          }
        }
      });
    }
  },

  /** 从页面重新拉取场景树并更新本地状态，失败时标记为断开连接。 */
  refreshSceneTree: () => {
    sendToTab({ action: PANEL_ACTION.GET_SCENE_TREE }, (response) => {
      if (chrome.runtime.lastError || !response) {
        set({
          connected: false,
          connectionStatus: '获取场景树失败'
        });
        return;
      }

      set({
        sceneTree: response.sceneTree,
        connected: true
      });
    });
  },

  /**
   * 选中或取消选中节点。
   *
   * 若该节点已选中则取消选中并清除高亮；否则发送 `SELECT_NODE` 请求，
   * 成功后更新 `selectedNode` 并自动展开其所有祖先节点。
   */
  selectNode: (nodeId: string) => {
    const { selectedNode } = get();
    if (selectedNode?.id === nodeId) {
      set({ selectedNode: null });
      sendToTab({ action: PANEL_ACTION.CLEAR_HIGHLIGHT, type: HIGHLIGHT_TYPE.SELECTED }, () => { });
      return;
    }

    sendToTab({
      action: PANEL_ACTION.SELECT_NODE,
      nodeId
    }, (response) => {
      if (response && response.node) {
        set(state => {
          const expandedNodes = new Set(state.expandedNodes);
          const parts = nodeId.split('_');
          for (let i = 1; i < parts.length; i++) {
            const ancestorId = parts.slice(0, i + 1).join('_');
            expandedNodes.add(ancestorId);
          }
          expandedNodes.add('root');
          return { selectedNode: response.node, expandedNodes };
        });
      }
    });
  },

  /** 切换节点可见性，成功后用返回的场景树更新本地状态。 */
  toggleNodeVisibility: (nodeId: string) => {
    sendToTab({
      action: PANEL_ACTION.TOGGLE_NODE_VISIBILITY,
      nodeId
    }, (response) => {
      if (response && response.sceneTree) {
        set({ sceneTree: response.sceneTree });
      }
    });
  },

  /**
   * 切换节点展开/折叠状态。
   *
   * 纯本地操作，不涉及与页面的通信，仅修改 `expandedNodes` 集合。
   */
  toggleNodeExpanded: (nodeId: string) => {
    set(state => {
      const expandedNodes = new Set(state.expandedNodes);
      if (expandedNodes.has(nodeId)) {
        expandedNodes.delete(nodeId);
      } else {
        expandedNodes.add(nodeId);
      }
      return { expandedNodes };
    });
  },

  /** 更新指定节点的属性值，成功后刷新选中节点信息和场景树。 */
  updateNodeProperty: (nodeId: string, property: string, value: any) => {
    sendToTab({
      action: PANEL_ACTION.UPDATE_NODE_PROPERTY,
      nodeId,
      property,
      value
    }, (response) => {
      if (response && response.node) {
        set({ selectedNode: response.node });
        get().refreshSceneTree();
      }
    });
  },

  /** 获取所有可用 Scope 列表及当前激活的 Scope ID。 */
  getAvailableScopes: () => {
    sendToTab({ action: PANEL_ACTION.GET_AVAILABLE_SCOPES }, (response) => {
      if (response && response.scopes) {
        set({
          availableScopes: response.scopes,
          activeScopeId: response.activeScopeId || null,
        });
      }
    });
  },

  /** 切换激活的 Scope，成功后清空选中节点并刷新场景树。 */
  setActiveScope: (scopeId: string) => {
    sendToTab({
      action: PANEL_ACTION.SET_ACTIVE_SCOPE,
      scopeId,
    }, (response) => {
      if (response && response.success) {
        set({
          activeScopeId: scopeId,
          selectedNode: null,
        });
        get().refreshSceneTree();
      }
    });
  },

  /** 重新拉取当前选中节点的最新信息（场景树变化后同步）。 */
  refreshSelectedNode: () => {
    const { selectedNode } = get();
    if (!selectedNode) return;

    sendToTab({
      action: PANEL_ACTION.GET_NODE_INFO,
      nodeId: selectedNode.id,
    }, (response) => {
      if (response && response.node) {
        set({ selectedNode: response.node });
      }
    });
  },

  /** 悬停高亮指定节点（HOVER 类型），同时更新本地 `hoveredNode`。 */
  hoverNode: (nodeId: string) => {
    set({ hoveredNode: { id: nodeId } as PaperNode });
    sendToTab({
      action: PANEL_ACTION.HIGHLIGHT_NODE,
      nodeId,
      type: HIGHLIGHT_TYPE.HOVER,
    }, () => { });
  },

  /** 清除悬停高亮（HOVER 类型）。 */
  clearHover: () => {
    set({ hoveredNode: null });
    sendToTab({
      action: PANEL_ACTION.CLEAR_HIGHLIGHT,
      type: HIGHLIGHT_TYPE.HOVER,
    }, () => { });
  },

  /** 启用/禁用高亮覆盖层，并同步状态到页面。 */
  setOverlayEnabled: (enabled: boolean) => {
    set({ overlayEnabled: enabled });
    sendToTab({
      action: PANEL_ACTION.SET_OVERLAY_ENABLED,
      enabled,
    }, () => { });
  },

  /** 切换拾取器模式开关，并同步状态到页面。 */
  togglePicker: () => {
    const { pickerEnabled } = get();
    const nextEnabled = !pickerEnabled;
    set({ pickerEnabled: nextEnabled });
    sendToTab({
      action: nextEnabled ? PANEL_ACTION.ENABLE_PICKER : PANEL_ACTION.DISABLE_PICKER,
    }, () => { });
  },

  /**
   * 设置搜索关键字。
   *
   * 同时遍历场景树，将名称或类型匹配关键字的节点及其所有祖先节点加入 `expandedNodes`，
   * 确保搜索结果在树中可见。
   */
  setSearchQuery: (query: string) => {
    set(state => {
      const expandedNodes = new Set(state.expandedNodes);
      if (query) {
        const collectMatchIds = (node: PaperNode) => {
          const lowerQuery = query.toLowerCase();
          const nameMatch = node.name.toLowerCase().includes(lowerQuery);
          const typeMatch = node.type.toLowerCase().includes(lowerQuery);
          if (nameMatch || typeMatch) {
            expandedNodes.add(node.id);
            const parts = node.id.split('_');
            for (let i = 1; i < parts.length; i++) {
              expandedNodes.add(parts.slice(0, i + 1).join('_'));
            }
            expandedNodes.add('root');
          }
          node.children.forEach(collectMatchIds);
        };
        if (state.sceneTree) {
          collectMatchIds(state.sceneTree);
        }
      }
      return { searchQuery: query, expandedNodes };
    });
  },

  /** 设置节点类型过滤列表（纯本地操作）。 */
  setTypeFilter: (types: string[]) => {
    set({ typeFilter: types });
  },

  /** 设置可见性过滤模式（全部 / 仅可见 / 仅隐藏）。 */
  setVisibilityFilter: (filter: 'all' | 'visible' | 'hidden') => {
    set({ visibilityFilter: filter });
  },

  /** 启用/禁用点击 Canvas 自动切换 Scope，并同步状态到页面。 */
  setAutoSwitchScope: (enabled: boolean) => {
    set({ autoSwitchScope: enabled });
    sendToTab({
      action: PANEL_ACTION.SET_AUTO_SWITCH_SCOPE,
      enabled,
    }, () => { });
  },
}));
