import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../overlayManager', () => ({ syncAllOverlays: vi.fn(), clearAllOverlays: vi.fn() }));
vi.mock('../pickerMode', () => ({ setupCanvasClickListeners: vi.fn(), getAutoSwitchScope: vi.fn(() => false) }));
vi.mock('../focusMode', () => ({ clearFocusState: vi.fn() }));
vi.mock('../messageRouter', () => ({ initMessageRouter: vi.fn() }));

const addEventListener = vi.fn();

describe('parse.ts 入口', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('window', { addEventListener });
  });

  it('注册 4 个全局监听器并初始化消息路由器', async () => {
    await import('../parse');
    expect(addEventListener).toHaveBeenCalledTimes(4);
    const { initMessageRouter } = await import('../messageRouter');
    expect(initMessageRouter).toHaveBeenCalledTimes(1);
  });

  it('监听事件名包含 PAPER_SCENE_CHANGED 与 PAPER_SCOPE_CHANGE', async () => {
    await import('../parse');
    const eventNames = addEventListener.mock.calls.map(c => c[0]);
    expect(eventNames).toContain('PAPER_SCENE_CHANGED');
    expect(eventNames).toContain('PAPER_SCOPE_CHANGE');
    expect(eventNames).toContain('resize');
    expect(eventNames).toContain('scroll');
  });
});
