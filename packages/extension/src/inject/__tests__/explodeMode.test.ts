import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../sceneTreeBuilder', () => ({
  findPaperItemById: vi.fn(),
  getActiveView: vi.fn(() => null),
}));
vi.mock('../overlayManager', () => ({
  getOverlayContainer: vi.fn(() => ({ appendChild: vi.fn() } as any)),
}));

import { enableExplodeMode, disableExplodeMode, resetExplode } from '../explodeMode';
import { findPaperItemById } from '../sceneTreeBuilder';

describe('explodeMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        style: {} as Record<string, string>,
        addEventListener: vi.fn(),
        classList: { add: vi.fn() },
      })),
      getElementById: vi.fn(() => null),
      head: { appendChild: vi.fn() } as any,
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: () => void) => { cb(); return 1; }));
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('CustomEvent', vi.fn((name: string, opts?: any) => ({ type: name, detail: opts?.detail })) as any);
    // 确保从无爆炸模式状态开始
    disableExplodeMode();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('非 Group 节点返回失败', () => {
    vi.mocked(findPaperItemById).mockReturnValue({ className: 'Path' } as any);
    const result = enableExplodeMode('root_0');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('所选节点不是 Group');
  });

  it('Group 无子图元返回失败', () => {
    vi.mocked(findPaperItemById).mockReturnValue({ className: 'Group', children: [] } as any);
    const result = enableExplodeMode('root_0');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Group 无子图元');
  });

  it('Group 无 bounds 返回失败', () => {
    vi.mocked(findPaperItemById).mockReturnValue({
      className: 'Group',
      children: [{ position: { x: 0, y: 0 } }],
      bounds: null,
    } as any);
    const result = enableExplodeMode('root_0');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Group bounds 不可用');
  });

  it('合法 Group 启用爆炸模式成功', () => {
    vi.mocked(findPaperItemById).mockReturnValue({
      className: 'Group',
      children: [{ position: { x: 0, y: 0 }, data: {} }],
      bounds: { width: 10, height: 10 },
      position: { x: 0, y: 0 },
    } as any);
    const result = enableExplodeMode('root_0');
    expect(result.success).toBe(true);
  });

  it('未启用爆炸模式时 disable/reset 返回失败', () => {
    expect(disableExplodeMode().success).toBe(false);
    expect(resetExplode().success).toBe(false);
  });

  it('启用后 reset 重置 factor 为 0', () => {
    vi.mocked(findPaperItemById).mockReturnValue({
      className: 'Group',
      children: [{ position: { x: 0, y: 0 }, data: {} }],
      bounds: { width: 10, height: 10 },
      position: { x: 0, y: 0 },
    } as any);
    enableExplodeMode('root_0');
    expect(resetExplode().success).toBe(true);
    // 清理
    disableExplodeMode();
  });
});
