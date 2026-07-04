import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePaperStore } from '../index';
import type { PaperNode } from '../index';

// Mock chrome API
const mockQuery = vi.fn();
const mockSendMessage = vi.fn();
globalThis.chrome = {
  tabs: { query: mockQuery, sendMessage: mockSendMessage },
  runtime: { onMessage: { addListener: vi.fn() }, lastError: undefined as any },
} as any;

// chrome.tabs.query 同步调用回调，返回 [{ id: 1 }]
mockQuery.mockImplementation((_query: any, cb: any) => cb([{ id: 1 }]));

// 辅助：让 sendMessage 根据 message.nodeId 返回模拟节点
function setupSendMessageMock() {
  mockSendMessage.mockImplementation((_tabId: number, message: any, cb: any) => {
    if (message.action === 'SELECT_NODE') {
      cb({
        node: {
          id: message.nodeId,
          name: `Node-${message.nodeId}`,
          type: 'Path',
          children: [],
          properties: {},
          visible: true,
          selected: false,
        } as PaperNode,
      });
    } else {
      // CLEAR_HIGHLIGHT 等其他 action，返回空
      cb({});
    }
  });
}

function resetStore() {
  usePaperStore.setState({
    selectedNode: null,
    selectionHistory: [],
    historyIndex: -1,
    canGoBack: false,
    canGoForward: false,
    expandedNodes: new Set(),
  });
}

describe('selectNode: 纯选中不改变展开状态', () => {
  beforeEach(() => {
    resetStore();
    mockQuery.mockClear();
    mockSendMessage.mockClear();
    setupSendMessageMock();
  });

  it('选中折叠的父节点，不将其加入 expandedNodes', () => {
    const store = usePaperStore.getState();
    store.selectNode('root_0'); // 假设 root_0 是一个折叠的父节点
    const state = usePaperStore.getState();
    expect(state.selectedNode?.id).toBe('root_0');
    expect(state.expandedNodes.has('root_0')).toBe(false);
  });

  it('选中深层节点，不展开任何祖先', () => {
    const store = usePaperStore.getState();
    store.selectNode('root_0_0_1');
    const state = usePaperStore.getState();
    expect(state.selectedNode?.id).toBe('root_0_0_1');
    // 纯选中：祖先链不应被展开
    expect(state.expandedNodes.has('root')).toBe(false);
    expect(state.expandedNodes.has('root_0')).toBe(false);
    expect(state.expandedNodes.has('root_0_0')).toBe(false);
    expect(state.expandedNodes.has('root_0_0_1')).toBe(false);
    expect(state.expandedNodes.size).toBe(0);
  });

  it('已选中状态下重复点击同一节点触发取消选中，不改变展开状态', () => {
    const store = usePaperStore.getState();
    // 预置：手动展开某节点，选中目标
    usePaperStore.setState({ expandedNodes: new Set(['root_0']) });
    store.selectNode('root_0');
    expect(usePaperStore.getState().selectedNode?.id).toBe('root_0');
    // 再次选中 → 取消选中
    store.selectNode('root_0');
    const state = usePaperStore.getState();
    expect(state.selectedNode).toBeNull();
    // 展开状态保持不变
    expect(state.expandedNodes.has('root_0')).toBe(true);
  });
});

describe('selectAndReveal: 选中并展开严格祖先链（不含自身）', () => {
  beforeEach(() => {
    resetStore();
    mockQuery.mockClear();
    mockSendMessage.mockClear();
    setupSendMessageMock();
  });

  it('选中深层节点，展开所有严格祖先但不展开目标自身', () => {
    const store = usePaperStore.getState();
    store.selectAndReveal('root_0_0_1');
    const state = usePaperStore.getState();
    expect(state.selectedNode?.id).toBe('root_0_0_1');
    // 严格祖先被展开
    expect(state.expandedNodes.has('root')).toBe(true);
    expect(state.expandedNodes.has('root_0')).toBe(true);
    expect(state.expandedNodes.has('root_0_0')).toBe(true);
    // 目标自身不被展开（避免折叠的父节点被副作用展开）
    expect(state.expandedNodes.has('root_0_0_1')).toBe(false);
  });

  it('选中顶层子节点 root_0，只展开 root', () => {
    const store = usePaperStore.getState();
    store.selectAndReveal('root_0');
    const state = usePaperStore.getState();
    expect(state.expandedNodes.has('root')).toBe(true);
    expect(state.expandedNodes.has('root_0')).toBe(false);
  });

  it('重复选中同一节点不额外展开（避免取消选中时的展开副作用）', () => {
    const store = usePaperStore.getState();
    store.selectAndReveal('root_0_0');
    const expandedAfterFirst = new Set(usePaperStore.getState().expandedNodes);
    // 再次调用 selectAndReveal 同一节点
    store.selectAndReveal('root_0_0');
    const state = usePaperStore.getState();
    // 选中被取消（selectNode 的重复选中逻辑）
    expect(state.selectedNode).toBeNull();
    // 展开集合不应在第二次调用时增长
    expect(state.expandedNodes.size).toBe(expandedAfterFirst.size);
  });

  it('切换到新节点时追加展开祖先，保留既有展开状态', () => {
    const store = usePaperStore.getState();
    // 预置：用户手动展开了 root_1
    usePaperStore.setState({ expandedNodes: new Set(['root_1']) });
    store.selectAndReveal('root_0_0');
    const state = usePaperStore.getState();
    // 既有展开保留
    expect(state.expandedNodes.has('root_1')).toBe(true);
    // 新祖先链展开
    expect(state.expandedNodes.has('root')).toBe(true);
    expect(state.expandedNodes.has('root_0')).toBe(true);
    expect(state.expandedNodes.has('root_0_0')).toBe(false);
  });
});
