import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setBridge, type Bridge } from '@/shared/bridge';
import { usePaperStore } from '../index';
import type { PaperNode } from '../index';

// Mock Bridge：SELECT_NODE 返回模拟节点，其它 action 返回空
function setupBridgeMock() {
  const mockBridge: Bridge = {
    send: vi.fn((message: any, cb: any) => {
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
    }),
    onEvent: vi.fn(() => () => {}),
  };
  setBridge(mockBridge);
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

describe('selection history stack', () => {
  beforeEach(() => {
    resetStore();
    setupBridgeMock();
  });

  it('选中节点 A 后再选中 B，历史栈为 [A, B]', () => {
    const store = usePaperStore.getState();
    store.selectNode('root_0');
    store.selectNode('root_1');
    const state = usePaperStore.getState();
    expect(state.selectionHistory).toEqual(['root_0', 'root_1']);
    expect(state.historyIndex).toBe(1);
    expect(state.canGoBack).toBe(true);
    expect(state.canGoForward).toBe(false);
  });

  it('后退后选中新节点，截断后续历史', () => {
    const store = usePaperStore.getState();
    store.selectNode('root_0');     // history: [root_0], index 0
    store.selectNode('root_0_0');   // history: [root_0, root_0_0], index 1
    store.goBack();                 // index 0, selectedNode = root_0
    store.selectNode('root_1');     // history: [root_0, root_1], index 1 (截断 root_0_0)
    const state = usePaperStore.getState();
    expect(state.selectionHistory).toEqual(['root_0', 'root_1']);
    expect(state.historyIndex).toBe(1);
  });

  it('重复选中同一节点不压栈，触发取消选中', () => {
    const store = usePaperStore.getState();
    store.selectNode('root_0');     // 选中 root_0
    store.selectNode('root_0');     // 再次选中 root_0 → 取消选中
    const state = usePaperStore.getState();
    expect(state.selectedNode).toBeNull();
    expect(state.selectionHistory).toEqual(['root_0']); // 历史不变
    expect(state.historyIndex).toBe(0);
  });

  it('goBack 在起点时无操作', () => {
    const store = usePaperStore.getState();
    store.selectNode('root_0');     // history: [root_0], index 0
    store.goBack();                 // index 0, 无操作（已在起点）
    const state = usePaperStore.getState();
    expect(state.historyIndex).toBe(0);
    expect(state.canGoBack).toBe(false);
  });

  it('goForward 在末尾时无操作', () => {
    const store = usePaperStore.getState();
    store.selectNode('root_0');
    store.goForward();              // 已在末尾，无操作
    const state = usePaperStore.getState();
    expect(state.historyIndex).toBe(0);
    expect(state.canGoForward).toBe(false);
  });

  it('clearSelectionHistory 清空历史栈', () => {
    const store = usePaperStore.getState();
    store.selectNode('root_0');
    store.selectNode('root_1');
    store.clearSelectionHistory();
    const state = usePaperStore.getState();
    expect(state.selectionHistory).toEqual([]);
    expect(state.historyIndex).toBe(-1);
    expect(state.canGoBack).toBe(false);
    expect(state.canGoForward).toBe(false);
  });

  it('goBack 后 goForward 可前进到原节点', () => {
    const store = usePaperStore.getState();
    store.selectNode('root_0');     // index 0
    store.selectNode('root_1');     // index 1
    store.goBack();                 // index 0, selected = root_0
    expect(usePaperStore.getState().selectedNode?.id).toBe('root_0');
    store.goForward();              // index 1, selected = root_1
    expect(usePaperStore.getState().selectedNode?.id).toBe('root_1');
  });

  it('goBack/goForward 不压入历史栈', () => {
    const store = usePaperStore.getState();
    store.selectNode('root_0');     // [root_0]
    store.selectNode('root_1');     // [root_0, root_1]
    store.goBack();                 // 历史不变 [root_0, root_1]
    let state = usePaperStore.getState();
    expect(state.selectionHistory).toEqual(['root_0', 'root_1']);
    expect(state.historyIndex).toBe(0);
    store.goForward();              // 历史不变
    state = usePaperStore.getState();
    expect(state.selectionHistory).toEqual(['root_0', 'root_1']);
    expect(state.historyIndex).toBe(1);
  });
});
