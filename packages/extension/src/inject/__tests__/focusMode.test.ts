import { describe, it, expect, beforeEach, vi } from 'vitest';

// mock sceneTreeBuilder：focusMode 依赖其 getActiveProject/getActiveView/buildScopeProject
vi.mock('../sceneTreeBuilder', () => ({
  getActiveProject: vi.fn(),
  getActiveView: vi.fn(() => null),
  buildScopeProject: vi.fn(() => ({ id: 'root', type: 'Project', children: [] })),
}));

import { focusNode, exitFocus, getFocusedNodeId, clearFocusState } from '../focusMode';
import { getActiveProject, buildScopeProject } from '../sceneTreeBuilder';

// 构造可被 focusTree 操作的类 paper.js 树
function makeProject(...layers: any[]): any {
  return { className: 'Project', layers, activeLayer: layers[0] ?? null };
}
function makeItem(visible = true, ...children: any[]): any {
  return { className: 'Path', visible, children };
}

const mockedGetActiveProject = vi.mocked(getActiveProject);
const mockedBuildScopeProject = vi.mocked(buildScopeProject);

describe('focusMode', () => {
  beforeEach(() => {
    clearFocusState();
    mockedGetActiveProject.mockReset();
    mockedBuildScopeProject.mockReset();
    mockedBuildScopeProject.mockReturnValue({ id: 'root', type: 'Project', children: [] } as any);
  });

  it('无激活 Project 时 focusNode 失败', () => {
    mockedGetActiveProject.mockReturnValue(null);
    expect(focusNode('root_0')).toEqual({ success: false, reason: '无激活 Project' });
  });

  it('首次聚焦采集快照并应用路径，返回 sceneTree', () => {
    const layer0 = makeItem(true);
    const layer1 = makeItem(true);
    const project = makeProject(layer0, layer1);
    mockedGetActiveProject.mockReturnValue(project);

    const result = focusNode('root_0');
    expect(result.success).toBe(true);
    expect(result.sceneTree).toEqual({ id: 'root', type: 'Project', children: [] });
    expect(getFocusedNodeId()).toBe('root_0');
    // root_0 可见，兄弟 root_1 隐藏
    expect(layer0.visible).toBe(true);
    expect(layer1.visible).toBe(false);
    expect(mockedBuildScopeProject).toHaveBeenCalledWith(project);
  });

  it('聚焦 root 不隐藏任何节点', () => {
    const layer0 = makeItem(true);
    const layer1 = makeItem(true);
    const project = makeProject(layer0, layer1);
    mockedGetActiveProject.mockReturnValue(project);

    focusNode('root');
    expect(layer0.visible).toBe(true);
    expect(layer1.visible).toBe(true);
  });

  it('路径无效时 focusNode 失败', () => {
    const project = makeProject(makeItem(true));
    mockedGetActiveProject.mockReturnValue(project);

    const result = focusNode('root_9');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('节点路径无效');
  });

  it('切换聚焦目标：先恢复快照再应用新路径', () => {
    const layer0 = makeItem(true);
    const layer1 = makeItem(true);
    const project = makeProject(layer0, layer1);
    mockedGetActiveProject.mockReturnValue(project);

    focusNode('root_0'); // layer1 被隐藏
    expect(layer1.visible).toBe(false);

    focusNode('root_1'); // 切换：layer0 隐藏，layer1 恢复可见
    expect(layer0.visible).toBe(false);
    expect(layer1.visible).toBe(true);
  });

  it('无快照时 exitFocus 失败', () => {
    mockedGetActiveProject.mockReturnValue(makeProject());
    expect(exitFocus().success).toBe(false);
    expect(getFocusedNodeId()).toBeNull();
  });

  it('exitFocus 恢复可见性并清空状态', () => {
    const layer0 = makeItem(true);
    const layer1 = makeItem(true);
    const project = makeProject(layer0, layer1);
    mockedGetActiveProject.mockReturnValue(project);

    focusNode('root_0'); // layer1 隐藏
    expect(layer1.visible).toBe(false);

    const result = exitFocus();
    expect(result.success).toBe(true);
    expect(layer0.visible).toBe(true);
    expect(layer1.visible).toBe(true);
    expect(getFocusedNodeId()).toBeNull();
  });

  it('clearFocusState 清空聚焦状态', () => {
    mockedGetActiveProject.mockReturnValue(makeProject(makeItem(true)));
    focusNode('root_0');
    clearFocusState();
    expect(getFocusedNodeId()).toBeNull();
  });
});
