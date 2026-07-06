import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildScopeProject,
  buildScopeTree,
  getActiveScope,
  getActiveProject,
  getActiveView,
  findPaperItemById,
  findNodeIdByItem,
} from '../sceneTreeBuilder';

// ===== 构建函数（不依赖 window）=====

describe('buildScopeTree', () => {
  it('单叶子节点：提取基本信息', () => {
    const item = { className: 'Path', name: 'MyPath', visible: true, selected: false, children: [] };
    const node = buildScopeTree(item as any, 'root_0');
    expect(node.id).toBe('root_0');
    expect(node.name).toBe('MyPath');
    expect(node.type).toBe('Path');
    expect(node.visible).toBe(true);
    expect(node.selected).toBe(false);
    expect(node.children).toEqual([]);
  });

  it('name 缺省为空字符串', () => {
    const node = buildScopeTree({ className: 'Path', children: [] } as any, 'root_0');
    expect(node.name).toBe('');
  });

  it('className 缺省时 type 为 Item', () => {
    const node = buildScopeTree({ children: [] } as any, 'root_0');
    expect(node.type).toBe('Item');
  });

  it('visible 缺省为 true', () => {
    const node = buildScopeTree({ className: 'Path', children: [] } as any, 'root_0');
    expect(node.visible).toBe(true);
  });

  it('递归构建子节点，id 路径拼接', () => {
    const child1 = { className: 'Group', children: [{ className: 'Path', children: [] }] };
    const item = { className: 'Layer', children: [{ className: 'Path', children: [] }, child1] };
    const node = buildScopeTree(item as any, 'root_0');
    expect(node.children).toHaveLength(2);
    expect(node.children[0].id).toBe('root_0_0');
    expect(node.children[1].id).toBe('root_0_1');
    expect(node.children[1].children[0].id).toBe('root_0_1_0');
  });

  it('空 children 时 children 为空数组', () => {
    const node = buildScopeTree({ className: 'Path', children: [] } as any, 'root_0');
    expect(node.children).toEqual([]);
  });
});

describe('buildScopeProject', () => {
  it('根节点 id 固定为 root，type 为 Project', () => {
    const node = buildScopeProject({ layers: [] } as any);
    expect(node.id).toBe('root');
    expect(node.name).toBe('Project');
    expect(node.type).toBe('Project');
    expect(node.children).toEqual([]);
  });

  it('遍历 layers 生成子节点', () => {
    const project = {
      layers: [
        { className: 'Layer', children: [] },
        { className: 'Layer', children: [] },
      ],
    };
    const node = buildScopeProject(project as any);
    expect(node.children).toHaveLength(2);
    expect(node.children[0].id).toBe('root_0');
    expect(node.children[1].id).toBe('root_1');
  });

  it('layers 缺省时 children 为空数组', () => {
    const node = buildScopeProject({} as any);
    expect(node.children).toEqual([]);
  });
});

// ===== 全局函数（依赖 window.__PAPER_SCOPES__）=====

describe('getActiveScope / getActiveProject / getActiveView', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('无 __PAPER_SCOPES__ 时 getActiveScope 返回 null', () => {
    vi.stubGlobal('window', {});
    expect(getActiveScope()).toBeNull();
  });

  it('无 getActiveScope 方法时返回 null', () => {
    vi.stubGlobal('window', { __PAPER_SCOPES__: {} });
    expect(getActiveScope()).toBeNull();
  });

  it('正常返回激活的 scope 及 project/view', () => {
    const scope = { project: { id: 'p' }, view: { id: 'v' } };
    vi.stubGlobal('window', { __PAPER_SCOPES__: { getActiveScope: () => scope } });
    expect(getActiveScope()).toBe(scope);
    expect(getActiveProject()).toBe(scope.project);
    expect(getActiveView()).toBe(scope.view);
  });

  it('scope 无 project/view 时返回 null', () => {
    vi.stubGlobal('window', { __PAPER_SCOPES__: { getActiveScope: () => ({}) } });
    expect(getActiveProject()).toBeNull();
    expect(getActiveView()).toBeNull();
  });
});

describe('findPaperItemById', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('无 project 时返回 null', () => {
    vi.stubGlobal('window', { __PAPER_SCOPES__: { getActiveScope: () => null } });
    expect(findPaperItemById('root_0')).toBeNull();
  });

  it('root 返回 project 自身', () => {
    const project = { className: 'Project', layers: [] };
    vi.stubGlobal('window', { __PAPER_SCOPES__: { getActiveScope: () => ({ project }) } });
    expect(findPaperItemById('root')).toBe(project);
  });

  it('多层路径解析（Project 走 layers，Item 走 children）', () => {
    const leaf = { className: 'Path' };
    const layer = { className: 'Layer', children: [leaf] };
    const project = { className: 'Project', layers: [layer] };
    vi.stubGlobal('window', { __PAPER_SCOPES__: { getActiveScope: () => ({ project }) } });
    expect(findPaperItemById('root_0')).toBe(layer);
    expect(findPaperItemById('root_0_0')).toBe(leaf);
  });

  it('索引越界返回 null', () => {
    const project = { className: 'Project', layers: [] };
    vi.stubGlobal('window', { __PAPER_SCOPES__: { getActiveScope: () => ({ project }) } });
    expect(findPaperItemById('root_9')).toBeNull();
  });
});

describe('findNodeIdByItem', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('命中根节点返回 root', () => {
    const project = { className: 'Project', layers: [] };
    vi.stubGlobal('window', { __PAPER_SCOPES__: { getActiveScope: () => ({ project }) } });
    expect(findNodeIdByItem(project as any)).toBe('root');
  });

  it('命中深层节点返回路径 id', () => {
    const leaf = { className: 'Path' };
    const layer = { className: 'Layer', children: [leaf] };
    const project = { className: 'Project', layers: [layer] };
    vi.stubGlobal('window', { __PAPER_SCOPES__: { getActiveScope: () => ({ project }) } });
    expect(findNodeIdByItem(layer as any)).toBe('root_0');
    expect(findNodeIdByItem(leaf as any)).toBe('root_0_0');
  });

  it('未命中返回 null', () => {
    const project = { className: 'Project', layers: [] };
    vi.stubGlobal('window', { __PAPER_SCOPES__: { getActiveScope: () => ({ project }) } });
    expect(findNodeIdByItem({ className: 'NotFound' } as any)).toBeNull();
  });
});
