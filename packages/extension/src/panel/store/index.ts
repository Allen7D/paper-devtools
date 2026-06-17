import { create } from 'zustand';

export interface PaperNode {
  id: string;
  name: string;
  type: string;
  children: PaperNode[];
  properties: Record<string, any>;
  visible: boolean;
  selected: boolean;
}

export interface ScopeInfo {
  id: string;
  canvasId: string;
  active: boolean;
}

interface PaperStore {
  connected: boolean;
  connectionStatus: string;
  sceneTree: PaperNode | null;
  selectedNode: PaperNode | null;
  expandedNodes: Set<string>;
  availableScopes: ScopeInfo[];
  activeScopeId: string | null;

  initialize: () => void;
  refreshSceneTree: () => void;
  selectNode: (nodeId: string) => void;
  toggleNodeVisibility: (nodeId: string) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  updateNodeProperty: (nodeId: string, property: string, value: any) => void;
  getAvailableScopes: () => void;
  setActiveScope: (scopeId: string) => void;
  refreshSelectedNode: () => void;
}

let scopeChangeListenerAdded = false;

export const usePaperStore = create<PaperStore>((set, get) => ({
  connected: false,
  connectionStatus: '等待连接...',
  sceneTree: null,
  selectedNode: null,
  expandedNodes: new Set<string>(),
  availableScopes: [],
  activeScopeId: null,

  initialize: async () => {
    set({ connectionStatus: '正在连接...' });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log('>>> tabs', tabs);
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, { action: 'DETECT_PAPER_JS' }, (response) => {
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
        if (message.action === 'SCOPE_CHANGE') {
          set({
            availableScopes: message.scopes || [],
            activeScopeId: message.activeScopeId || null,
          });

          if (message.type === 'removed' || message.type === 'activated') {
            set({ selectedNode: null });
            get().refreshSceneTree();
          }

          if (message.scopes && message.scopes.length === 0) {
            set({
              connected: false,
              connectionStatus: '所有画布已移除',
              sceneTree: null,
              selectedNode: null,
            });
          } else if (message.type === 'added' && !get().connected) {
            set({
              connected: true,
              connectionStatus: '已连接',
            });
            get().refreshSceneTree();
          }
        }

        if (message.action === 'SCENE_CHANGE') {
          get().refreshSceneTree();
          get().refreshSelectedNode();
        }
      });
    }
  },

  refreshSceneTree: () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, { action: 'GET_SCENE_TREE' }, (response) => {
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
    });
  },

  selectNode: (nodeId: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, {
        action: 'SELECT_NODE',
        nodeId
      }, (response) => {
        if (response && response.node) {
          set({ selectedNode: response.node });
        }
      });
    });
  },

  toggleNodeVisibility: (nodeId: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, {
        action: 'TOGGLE_NODE_VISIBILITY',
        nodeId
      }, (response) => {
        if (response && response.sceneTree) {
          set({ sceneTree: response.sceneTree });
        }
      });
    });
  },

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

  updateNodeProperty: (nodeId: string, property: string, value: any) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, {
        action: 'UPDATE_NODE_PROPERTY',
        nodeId,
        property,
        value
      }, (response) => {
        if (response && response.node) {
          set({ selectedNode: response.node });
          get().refreshSceneTree();
        }
      });
    });
  },

  getAvailableScopes: () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, { action: 'GET_AVAILABLE_SCOPES' }, (response) => {
        if (response && response.scopes) {
          set({
            availableScopes: response.scopes,
            activeScopeId: response.activeScopeId || null,
          });
        }
      });
    });
  },

  setActiveScope: (scopeId: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, {
        action: 'SET_ACTIVE_SCOPE',
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
    });
  },

  refreshSelectedNode: () => {
    const { selectedNode } = get();
    if (!selectedNode) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, {
        action: 'GET_NODE_INFO',
        nodeId: selectedNode.id,
      }, (response) => {
        if (response && response.node) {
          set({ selectedNode: response.node });
        }
      });
    });
  },
}));
