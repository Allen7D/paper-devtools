import { describe, it, expect } from 'vitest';
import {
  collectVisibilitySnapshot,
  restoreVisibility,
  applyFocusPath,
  type FocusableItem,
} from '../focusTree';

// 构造类 paper.js 的树：
// root (Project)
//   ├─ 0: Layer1 (root_0)
//   │    ├─ 0: GroupA (root_0_0)
//   │    │    ├─ 0: Path1 (root_0_0_0)
//   │    │    └─ 1: Path2 (root_0_0_1)
//   │    └─ 1: Path3 (root_0_1)
//   └─ 1: Layer2 (root_1)
const makeItem = (className: string, children: FocusableItem[] = [], visible = true): FocusableItem => ({
  className,
  visible,
  children,
});
const makeProject = (layers: FocusableItem[]): FocusableItem => ({
  className: 'Project',
  visible: true,
  layers,
  activeLayer: layers[0] ?? null,
});

function buildScene() {
  const path1 = makeItem('Path'); // root_0_0_0
  const path2 = makeItem('Path'); // root_0_0_1
  const groupA = makeItem('Group', [path1, path2]); // root_0_0
  const path3 = makeItem('Path'); // root_0_1
  const layer1 = makeItem('Layer', [groupA, path3]); // root_0
  const layer2 = makeItem('Layer'); // root_1
  return { project: makeProject([layer1, layer2]), path1, path2, groupA, path3, layer1, layer2 };
}

describe('collectVisibilitySnapshot', () => {
  it('记录所有节点的可见性，id 为路径式', () => {
    const { project } = buildScene();
    const snap = collectVisibilitySnapshot(project);
    expect(snap.get('root')).toBe(true);
    expect(snap.get('root_0')).toBe(true);
    expect(snap.get('root_1')).toBe(true);
    expect(snap.get('root_0_0')).toBe(true);
    expect(snap.get('root_0_1')).toBe(true);
    expect(snap.get('root_0_0_0')).toBe(true);
    expect(snap.get('root_0_0_1')).toBe(true);
    expect(snap.size).toBe(7);
  });

  it('隐藏节点如实记录为 false', () => {
    const { project, path1 } = buildScene();
    path1.visible = false;
    const snap = collectVisibilitySnapshot(project);
    expect(snap.get('root_0_0_0')).toBe(false);
  });
});

describe('restoreVisibility', () => {
  it('快照恢复所有节点 visible', () => {
    const { project, layer2, path3 } = buildScene();
    const snap = collectVisibilitySnapshot(project);
    // 人为改动
    layer2.visible = false;
    path3.visible = false;
    restoreVisibility(project, snap);
    expect(layer2.visible).toBe(true);
    expect(path3.visible).toBe(true);
  });
});

describe('applyFocusPath', () => {
  it('聚焦 root_0_0_1：隐藏各层兄弟，保留路径与目标子树', () => {
    const { project, layer1, layer2, groupA, path3, path1, path2 } = buildScene();
    expect(applyFocusPath(project, 'root_0_0_1')).toBe(true);
    // 路径上节点可见
    expect(layer1.visible).toBe(true);
    expect(groupA.visible).toBe(true);
    expect(path2.visible).toBe(true);
    // 各层兄弟隐藏
    expect(layer2.visible).toBe(false); // root_0 的兄弟
    expect(path3.visible).toBe(false); // root_0_0 的兄弟
    expect(path1.visible).toBe(false); // root_0_0_1 的兄弟
  });

  it('聚焦根节点 root：不隐藏任何节点', () => {
    const { project, layer1, layer2 } = buildScene();
    expect(applyFocusPath(project, 'root')).toBe(true);
    expect(layer1.visible).toBe(true);
    expect(layer2.visible).toBe(true);
  });

  it('索引越界返回 false', () => {
    const { project } = buildScene();
    expect(applyFocusPath(project, 'root_9_9')).toBe(false);
  });

  it('聚焦时强制隐藏的祖先变可见', () => {
    const { project, layer1, groupA } = buildScene();
    layer1.visible = false;
    groupA.visible = false;
    applyFocusPath(project, 'root_0_0_1');
    expect(layer1.visible).toBe(true);
    expect(groupA.visible).toBe(true);
  });
});

describe('聚焦生命周期（快照 + 路径隐藏 + 恢复）', () => {
  it('切换聚焦目标：先恢复再按新路径隐藏，快照不变', () => {
    const { project, layer1, layer2, groupA, path3, path1, path2 } = buildScene();
    const snapshot = collectVisibilitySnapshot(project);

    // 先聚焦 root_0_0_1
    applyFocusPath(project, 'root_0_0_1');
    expect(layer2.visible).toBe(false);
    expect(path1.visible).toBe(false);

    // 切换到 root_1：先恢复快照，再按新路径隐藏
    restoreVisibility(project, snapshot);
    applyFocusPath(project, 'root_1');
    // root_1 路径：layer2 可见，layer1 隐藏；内部节点恢复为 true
    expect(layer1.visible).toBe(false);
    expect(layer2.visible).toBe(true);
    expect(groupA.visible).toBe(true);
    expect(path3.visible).toBe(true);
    expect(path1.visible).toBe(true);
    expect(path2.visible).toBe(true);
    // 快照本身未被修改
    expect(snapshot.get('root_0')).toBe(true);
    expect(snapshot.get('root_1')).toBe(true);
  });

  it('退出聚焦：按快照恢复全部节点，含聚焦期间被强制可见的祖先', () => {
    const { project, layer1, groupA, layer2, path1 } = buildScene();
    // 聚焦前部分节点隐藏
    layer1.visible = false;
    groupA.visible = false;
    layer2.visible = false;
    path1.visible = false;
    const snapshot = collectVisibilitySnapshot(project);

    // 聚焦会强制路径祖先可见
    applyFocusPath(project, 'root_0_0_1');
    expect(layer1.visible).toBe(true);
    expect(groupA.visible).toBe(true);

    // 退出聚焦恢复
    restoreVisibility(project, snapshot);
    expect(layer1.visible).toBe(false);
    expect(groupA.visible).toBe(false);
    expect(layer2.visible).toBe(false);
    expect(path1.visible).toBe(false);
  });
});
