import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../sceneTreeBuilder', () => ({
  findPaperItemById: vi.fn(),
  getActiveProject: vi.fn(),
  getActiveView: vi.fn(() => null),
}));

import {
  showHighlight,
  hideHighlight,
  clearAllOverlays,
  setOverlayEnabled,
  getHighlightedNodeId,
  setHoverFromPicker,
  syncAllOverlays,
} from '../overlayManager';
import { findPaperItemById, getActiveProject } from '../sceneTreeBuilder';
import { HIGHLIGHT_TYPE } from '@/shared/constants';

function mockDiv() {
  return {
    style: {} as Record<string, string>,
    className: '',
    remove: vi.fn(),
    appendChild: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    parentNode: { insertBefore: vi.fn(), style: {} as Record<string, string> },
  };
}

describe('overlayManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockDiv()),
    });
    vi.stubGlobal('getComputedStyle', vi.fn(() => ({ position: 'static' })));
    vi.mocked(getActiveProject).mockReturnValue({ view: { element: mockDiv() } } as any);
    clearAllOverlays();
    setOverlayEnabled(true);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('初始无高亮节点', () => {
    expect(getHighlightedNodeId()).toBeNull();
  });

  it('showHighlight SELECTED 记录高亮节点 id', () => {
    vi.mocked(findPaperItemById).mockReturnValue({ bounds: { x: 0, y: 0, width: 10, height: 10 } } as any);
    showHighlight('root_0', HIGHLIGHT_TYPE.SELECTED);
    expect(getHighlightedNodeId()).toBe('root_0');
  });

  it('overlayEnabled=false 时 SELECTED 高亮不生效', () => {
    vi.mocked(findPaperItemById).mockReturnValue({ bounds: {} } as any);
    setOverlayEnabled(false);
    showHighlight('root_0', HIGHLIGHT_TYPE.SELECTED);
    expect(getHighlightedNodeId()).toBeNull();
  });

  it('hideHighlight SELECTED 清空高亮节点 id', () => {
    vi.mocked(findPaperItemById).mockReturnValue({ bounds: {} } as any);
    showHighlight('root_0', HIGHLIGHT_TYPE.SELECTED);
    hideHighlight(HIGHLIGHT_TYPE.SELECTED);
    expect(getHighlightedNodeId()).toBeNull();
  });

  it('clearAllOverlays 重置高亮状态', () => {
    vi.mocked(findPaperItemById).mockReturnValue({ bounds: {} } as any);
    showHighlight('root_0', HIGHLIGHT_TYPE.SELECTED);
    clearAllOverlays();
    expect(getHighlightedNodeId()).toBeNull();
  });

  it('setHoverFromPicker + syncAllOverlays 不抛错', () => {
    setHoverFromPicker(true);
    expect(() => syncAllOverlays()).not.toThrow();
  });
});
