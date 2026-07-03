import { describe, it, expect } from 'vitest';
import { getAncestorChain, getVisibleNodeIds } from '../navigation';
import type { PaperNode } from '../../store';

const makeNode = (id: string, name: string, type: string, children: PaperNode[] = []): PaperNode => ({
  id, name, type, children, properties: {}, visible: true, selected: false,
});

// 场景树:
// root (Project)
//   ├─ 0: Layer1 (root_0)
//   │    ├─ 0: GroupA (root_0_0)
//   │    │    ├─ 0: Path1 (root_0_0_0)
//   │    │    └─ 1: Path2 (root_0_0_1)
//   │    └─ 1: Path3 (root_0_1)
//   └─ 1: Layer2 (root_1)
const sceneTree: PaperNode = makeNode('root', 'Project', 'Project', [
  makeNode('root_0', 'Layer1', 'Layer', [
    makeNode('root_0_0', 'GroupA', 'Group', [
      makeNode('root_0_0_0', 'Path1', 'Path'),
      makeNode('root_0_0_1', 'Path2', 'Path'),
    ]),
    makeNode('root_0_1', 'Path3', 'Path'),
  ]),
  makeNode('root_1', 'Layer2', 'Layer'),
]);

describe('getAncestorChain', () => {
  it('深层节点 root_0_0_1 返回从根到自身的 4 项祖先链', () => {
    const chain = getAncestorChain('root_0_0_1', sceneTree);
    expect(chain).toHaveLength(4);
    expect(chain).toEqual([
      { id: 'root', name: 'Project', type: 'Project' },
      { id: 'root_0', name: 'Layer1', type: 'Layer' },
      { id: 'root_0_0', name: 'GroupA', type: 'Group' },
      { id: 'root_0_0_1', name: 'Path2', type: 'Path' },
    ]);
  });

  it('根节点 root 返回仅含自身的 1 项', () => {
    const chain = getAncestorChain('root', sceneTree);
    expect(chain).toHaveLength(1);
    expect(chain).toEqual([{ id: 'root', name: 'Project', type: 'Project' }]);
  });

  it('sceneTree 为 null 时返回空数组', () => {
    const chain = getAncestorChain('root_0', null);
    expect(chain).toEqual([]);
  });

  it('无效 ID root_9_9 索引越界时返回已匹配部分 [root]', () => {
    const chain = getAncestorChain('root_9_9', sceneTree);
    expect(chain).toEqual([{ id: 'root', name: 'Project', type: 'Project' }]);
  });
});

describe('getVisibleNodeIds', () => {
  it('全展开时返回全部 7 个 id，深度优先前序', () => {
    const expanded = new Set(['root', 'root_0', 'root_0_0', 'root_1']);
    const ids = getVisibleNodeIds(sceneTree, expanded);
    expect(ids).toEqual([
      'root',
      'root_0',
      'root_0_0',
      'root_0_0_0',
      'root_0_0_1',
      'root_0_1',
      'root_1',
    ]);
  });

  it('折叠 GroupA 时不含其子节点 Path1/Path2', () => {
    const expanded = new Set(['root', 'root_0']);
    const ids = getVisibleNodeIds(sceneTree, expanded);
    expect(ids).toEqual(['root', 'root_0', 'root_0_0', 'root_0_1', 'root_1']);
  });

  it('折叠 Layer1 时不含其全部子节点', () => {
    const expanded = new Set(['root']);
    const ids = getVisibleNodeIds(sceneTree, expanded);
    expect(ids).toEqual(['root', 'root_0', 'root_1']);
  });

  it('无子节点的叶子节点 root_1 单独测试', () => {
    const leaf = makeNode('root_1', 'Layer2', 'Layer');
    const expanded = new Set(['root_1']);
    const ids = getVisibleNodeIds(leaf, expanded);
    expect(ids).toEqual(['root_1']);
  });
});
