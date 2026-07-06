import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * index.ts 是 IIFE 检测脚本，import 时立即执行：
 * - 初始化 globalThis.__PAPER_SCOPES__ 多 Scope 管理接口
 * - 启动轮询检测与 MutationObserver
 * 本测试聚焦 __PAPER_SCOPES__ 接口的方法行为（核心多 Scope 管理逻辑）。
 */
describe('inject/index.ts IIFE - __PAPER_SCOPES__ 接口', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as any).__PAPER_SCOPES__;
    delete (globalThis as any).__PAPER_SCOPE__;
    vi.stubGlobal('window', {
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
    });
    vi.stubGlobal('document', {
      body: {},
      addEventListener: vi.fn(),
    });
    vi.stubGlobal('MutationObserver', vi.fn(() => ({ observe: vi.fn() })));
    vi.stubGlobal('CustomEvent', vi.fn((name: string, opts?: any) => ({ type: name, detail: opts?.detail })) as any);
    vi.stubGlobal('HTMLCanvasElement', class HTMLCanvasElement {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as any).__PAPER_SCOPES__;
    delete (globalThis as any).__PAPER_SCOPE__;
  });

  async function loadIndex() {
    await import('../index');
    return (globalThis as any).__PAPER_SCOPES__;
  }

  it('IIFE 执行后初始化 __PAPER_SCOPES__', async () => {
    const ps = await loadIndex();
    expect(ps).toBeDefined();
    expect(ps.scopes).toBeInstanceOf(Map);
    expect(ps.activeScope).toBeNull();
  });

  it('register 注册首个 scope 并自动设为激活', async () => {
    const ps = await loadIndex();
    const scope = { view: { update: vi.fn() } };
    ps.register('s1', scope, { id: 'c1' });
    expect(ps.scopes.has('s1')).toBe(true);
    expect(ps.activeScope).toBe('s1');
    expect(ps.getActiveScope()).toBe(scope);
  });

  it('register 重复 id 不覆盖', async () => {
    const ps = await loadIndex();
    const a = { view: { update: vi.fn() } };
    const b = { view: { update: vi.fn() } };
    ps.register('s1', a, {});
    ps.register('s1', b, {});
    expect(ps.scopes.get('s1').scope).toBe(a);
  });

  it('switchScope 切换激活，不存在时返回 false', async () => {
    const ps = await loadIndex();
    ps.register('s1', { view: { update: vi.fn() } }, {});
    ps.register('s2', { view: { update: vi.fn() } }, {});
    expect(ps.switchScope('s2')).toBe(true);
    expect(ps.activeScope).toBe('s2');
    expect(ps.switchScope('nope')).toBe(false);
  });

  it('unregister 注销激活项时自动切换到剩余项', async () => {
    const ps = await loadIndex();
    ps.register('s1', { view: { update: vi.fn() } }, {});
    ps.register('s2', { view: { update: vi.fn() } }, {});
    ps.switchScope('s1');
    expect(ps.unregister('s1')).toBe(true);
    expect(ps.scopes.has('s1')).toBe(false);
    expect(ps.activeScope).toBe('s2');
  });

  it('unregister 不存在的 id 返回 false', async () => {
    const ps = await loadIndex();
    expect(ps.unregister('nope')).toBe(false);
  });

  it('getAllScopes 返回带 active 标记的摘要列表', async () => {
    const ps = await loadIndex();
    ps.register('s1', { view: { update: vi.fn() } }, { id: 'c1' });
    ps.register('s2', { view: { update: vi.fn() } }, { id: 'c2' });
    const all = ps.getAllScopes();
    expect(all).toHaveLength(2);
    expect(all[0]).toEqual({ id: 's1', canvas: { id: 'c1' }, active: true });
    expect(all[1]).toEqual({ id: 's2', canvas: { id: 'c2' }, active: false });
  });

  it('无激活 scope 时 getActiveScope 返回 null', async () => {
    const ps = await loadIndex();
    expect(ps.getActiveScope()).toBeNull();
  });
});
