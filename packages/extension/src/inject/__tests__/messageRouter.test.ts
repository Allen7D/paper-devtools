import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// mock 所有被路由的子模块
vi.mock('../sceneTreeBuilder', () => ({
  buildScopeProject: vi.fn(() => ({ id: 'root' })),
  buildScopeTree: vi.fn(() => ({ id: 'node' })),
  findPaperItemById: vi.fn(),
  getActiveProject: vi.fn(),
  getActiveView: vi.fn(() => null),
}));
vi.mock('../overlayManager', () => ({
  showHighlight: vi.fn(),
  hideHighlight: vi.fn(),
  clearAllOverlays: vi.fn(),
  setOverlayEnabled: vi.fn(),
  setHoverFromPicker: vi.fn(),
}));
vi.mock('../pickerMode', () => ({
  enablePicker: vi.fn(),
  disablePicker: vi.fn(),
  setAutoSwitchScope: vi.fn(),
  getAutoSwitchScope: vi.fn(() => true),
}));
vi.mock('../explodeMode', () => ({
  enableExplodeMode: vi.fn(() => ({ success: true })),
  disableExplodeMode: vi.fn(() => ({ success: true })),
  resetExplode: vi.fn(() => ({ success: true })),
}));
vi.mock('../focusMode', () => ({
  focusNode: vi.fn(() => ({ success: true })),
  exitFocus: vi.fn(() => ({ success: true })),
  clearFocusState: vi.fn(),
}));

import { initMessageRouter } from '../messageRouter';
import { PANEL_ACTION, HIGHLIGHT_TYPE } from '@/shared/constants';
import { buildScopeProject, findPaperItemById, getActiveProject } from '../sceneTreeBuilder';
import { showHighlight, hideHighlight, clearAllOverlays, setOverlayEnabled, setHoverFromPicker } from '../overlayManager';
import { enablePicker, disablePicker, setAutoSwitchScope, getAutoSwitchScope } from '../pickerMode';
import { enableExplodeMode, disableExplodeMode, resetExplode } from '../explodeMode';
import { focusNode, exitFocus, clearFocusState } from '../focusMode';

let messageHandler: (event: any) => void;
const mockDispatchEvent = vi.fn();

function stubWindow(extra: any = {}) {
  vi.stubGlobal('window', {
    addEventListener: vi.fn((_, handler) => { messageHandler = handler; }),
    dispatchEvent: mockDispatchEvent,
    __PAPER_SCOPES__: undefined,
    ...extra,
  });
}

describe('messageRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubWindow();
    vi.stubGlobal('CustomEvent', function (name: string, opts: any) {
      return { type: name, detail: opts?.detail };
    });
    initMessageRouter();
  });

  afterEach(() => vi.unstubAllGlobals());

  function sendMessage(detail: any) {
    messageHandler({ detail });
  }

  function lastResponse() {
    const call = mockDispatchEvent.mock.calls[mockDispatchEvent.mock.calls.length - 1];
    return call?.[0]?.detail;
  }

  it('GET_SCENE_TREE 返回场景树', () => {
    vi.mocked(getActiveProject).mockReturnValue({ layers: [] } as any);
    sendMessage({ action: PANEL_ACTION.GET_SCENE_TREE, id: '1' });
    expect(buildScopeProject).toHaveBeenCalled();
    expect(lastResponse()).toEqual({ id: '1', response: { sceneTree: { id: 'root' } } });
  });

  it('SELECT_NODE 选中节点并高亮', () => {
    vi.mocked(findPaperItemById).mockReturnValue({ className: 'Path' } as any);
    vi.mocked(getActiveProject).mockReturnValue({ deselectAll: vi.fn() } as any);
    sendMessage({ action: PANEL_ACTION.SELECT_NODE, id: '2', nodeId: 'root_0' });
    expect(findPaperItemById).toHaveBeenCalledWith('root_0');
    expect(showHighlight).toHaveBeenCalledWith('root_0', HIGHLIGHT_TYPE.SELECTED);
  });

  it('TOGGLE_NODE_VISIBILITY 切换可见性', () => {
    const item = { visible: true };
    vi.mocked(findPaperItemById).mockReturnValue(item as any);
    vi.mocked(getActiveProject).mockReturnValue({ layers: [] } as any);
    sendMessage({ action: PANEL_ACTION.TOGGLE_NODE_VISIBILITY, id: '3', nodeId: 'root_0' });
    expect(item.visible).toBe(false);
  });

  it('UPDATE_NODE_PROPERTY 设置 fillColor', () => {
    const item: any = { fillColor: null };
    vi.mocked(findPaperItemById).mockReturnValue(item as any);
    sendMessage({ action: PANEL_ACTION.UPDATE_NODE_PROPERTY, id: '4', nodeId: 'root_0', property: 'fillColor', value: 'red' });
    expect(item.fillColor).toBe('red');
  });

  it('GET_NODE_INFO 返回节点信息', () => {
    vi.mocked(findPaperItemById).mockReturnValue({ className: 'Path' } as any);
    sendMessage({ action: PANEL_ACTION.GET_NODE_INFO, id: '5', nodeId: 'root_0' });
    expect(findPaperItemById).toHaveBeenCalledWith('root_0');
  });

  it('HIGHLIGHT_NODE 高亮节点（hover 类型标记非拾取器来源）', () => {
    sendMessage({ action: PANEL_ACTION.HIGHLIGHT_NODE, id: '6', nodeId: 'root_0', type: HIGHLIGHT_TYPE.HOVER });
    expect(setHoverFromPicker).toHaveBeenCalledWith(false);
    expect(showHighlight).toHaveBeenCalledWith('root_0', HIGHLIGHT_TYPE.HOVER);
  });

  it('CLEAR_HIGHLIGHT 清除高亮', () => {
    sendMessage({ action: PANEL_ACTION.CLEAR_HIGHLIGHT, id: '7' });
    expect(hideHighlight).toHaveBeenCalled();
  });

  it('SET_OVERLAY_ENABLED 设置覆盖层开关', () => {
    sendMessage({ action: PANEL_ACTION.SET_OVERLAY_ENABLED, id: '8', enabled: false });
    expect(setOverlayEnabled).toHaveBeenCalledWith(false);
  });

  it('ENABLE_PICKER / DISABLE_PICKER', () => {
    sendMessage({ action: PANEL_ACTION.ENABLE_PICKER, id: '9' });
    expect(enablePicker).toHaveBeenCalled();
    sendMessage({ action: PANEL_ACTION.DISABLE_PICKER, id: '10' });
    expect(disablePicker).toHaveBeenCalled();
  });

  it('DEVTOOLS_CLEANUP 调用所有清理函数', () => {
    sendMessage({ action: PANEL_ACTION.DEVTOOLS_CLEANUP, id: '11' });
    expect(disablePicker).toHaveBeenCalled();
    expect(disableExplodeMode).toHaveBeenCalled();
    expect(clearAllOverlays).toHaveBeenCalled();
    expect(clearFocusState).toHaveBeenCalled();
  });

  it('SET_AUTO_SWITCH_SCOPE / GET_AUTO_SWITCH_SCOPE', () => {
    sendMessage({ action: PANEL_ACTION.SET_AUTO_SWITCH_SCOPE, id: '12', enabled: false });
    expect(setAutoSwitchScope).toHaveBeenCalledWith(false);
    sendMessage({ action: PANEL_ACTION.GET_AUTO_SWITCH_SCOPE, id: '13' });
    expect(getAutoSwitchScope).toHaveBeenCalled();
    expect(lastResponse()).toEqual({ id: '13', response: { enabled: true } });
  });

  it('ENABLE/DISABLE/RESET_EXPLODE', () => {
    sendMessage({ action: PANEL_ACTION.ENABLE_EXPLODE_MODE, id: '14', nodeId: 'root_0' });
    expect(enableExplodeMode).toHaveBeenCalledWith('root_0');
    sendMessage({ action: PANEL_ACTION.DISABLE_EXPLODE_MODE, id: '15' });
    expect(disableExplodeMode).toHaveBeenCalled();
    sendMessage({ action: PANEL_ACTION.RESET_EXPLODE, id: '16' });
    expect(resetExplode).toHaveBeenCalled();
  });

  it('FOCUS_NODE / EXIT_FOCUS', () => {
    sendMessage({ action: PANEL_ACTION.FOCUS_NODE, id: '17', nodeId: 'root_0' });
    expect(focusNode).toHaveBeenCalledWith('root_0');
    sendMessage({ action: PANEL_ACTION.EXIT_FOCUS, id: '18' });
    expect(exitFocus).toHaveBeenCalled();
  });

  it('GET_AVAILABLE_SCOPES 返回 Scope 列表', () => {
    stubWindow({
      __PAPER_SCOPES__: {
        activeScope: 's1',
        getAllScopes: () => [
          { id: 's1', canvas: { id: 'c1' }, active: true },
          { id: 's2', canvas: { id: 'c2' }, active: false },
        ],
      },
    });
    sendMessage({ action: PANEL_ACTION.GET_AVAILABLE_SCOPES, id: '19' });
    expect(lastResponse()).toEqual({
      id: '19',
      response: {
        scopes: [
          { id: 's1', canvasId: 'c1', active: true },
          { id: 's2', canvasId: 'c2', active: false },
        ],
        activeScopeId: 's1',
      },
    });
  });

  it('SET_ACTIVE_SCOPE 切换 Scope', () => {
    const switchScope = vi.fn(() => true);
    stubWindow({ __PAPER_SCOPES__: { switchScope } });
    sendMessage({ action: PANEL_ACTION.SET_ACTIVE_SCOPE, id: '20', scopeId: 's2' });
    expect(switchScope).toHaveBeenCalledWith('s2');
    expect(lastResponse()).toEqual({ id: '20', response: { success: true } });
  });

  it('无 action 的消息被忽略，不派发响应', () => {
    sendMessage({ id: '21' });
    expect(mockDispatchEvent).not.toHaveBeenCalled();
  });
});
