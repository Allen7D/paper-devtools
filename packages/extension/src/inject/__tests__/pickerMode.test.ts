import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../sceneTreeBuilder', () => ({
  getActiveScope: vi.fn(),
  getActiveView: vi.fn(() => null),
  getActiveProject: vi.fn(),
  findNodeIdByItem: vi.fn(),
  findPaperItemById: vi.fn(),
}));
vi.mock('../overlayManager', () => ({
  showHighlight: vi.fn(),
  hideHighlight: vi.fn(),
  getHighlightedNodeId: vi.fn(() => null),
  setHoverFromPicker: vi.fn(),
}));

import {
  setAutoSwitchScope,
  getAutoSwitchScope,
  isPickerActive,
  enablePicker,
  disablePicker,
  setupCanvasClickListeners,
} from '../pickerMode';

describe('pickerMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { __PAPER_SCOPES__: undefined });
    disablePicker();
    setAutoSwitchScope(true);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('autoSwitchScope 默认启用', () => {
    expect(getAutoSwitchScope()).toBe(true);
  });

  it('setAutoSwitchScope(false) 后禁用', () => {
    setAutoSwitchScope(false);
    expect(getAutoSwitchScope()).toBe(false);
  });

  it('isPickerActive 初始为 false', () => {
    expect(isPickerActive()).toBe(false);
  });

  it('enable/disable 切换 pickerActive 状态（无 canvas 时仍标记激活）', () => {
    enablePicker();
    expect(isPickerActive()).toBe(true);
    disablePicker();
    expect(isPickerActive()).toBe(false);
  });

  it('重复 enable 不会重复激活', () => {
    enablePicker();
    enablePicker();
    expect(isPickerActive()).toBe(true);
    disablePicker();
  });

  it('setupCanvasClickListeners 无 __PAPER_SCOPES__ 时不抛错', () => {
    vi.stubGlobal('window', {});
    expect(() => setupCanvasClickListeners()).not.toThrow();
  });
});
