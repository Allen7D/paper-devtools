import { describe, it, expect } from 'vitest';
import { computeExplodePositions, dragToFactor } from '../explodeMath';

describe('computeExplodePositions', () => {
  it('factor=0 时返回原位置', () => {
    const origins = [
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ];
    const center = { x: 0, y: 0 };
    const result = computeExplodePositions(origins, center, 0, 100);
    expect(result).toEqual([
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ]);
  });

  it('factor=1 时子图元沿径向远离中心 maxDist', () => {
    const origins = [{ x: 10, y: 0 }]; // 在中心右侧 10 单位
    const center = { x: 0, y: 0 };
    const result = computeExplodePositions(origins, center, 1, 50);
    // 方向 (1,0)，新位置 = (10 + 1*50, 0) = (60, 0)
    expect(result[0]).toEqual({ x: 60, y: 0 });
  });

  it('factor=0.5 时远离距离为 maxDist 的一半', () => {
    const origins = [{ x: 0, y: 20 }]; // 在中心上方 20 单位
    const center = { x: 0, y: 0 };
    const result = computeExplodePositions(origins, center, 0.5, 40);
    // 方向 (0,1)，新位置 = (0, 20 + 0.5*40) = (0, 40)
    expect(result[0]).toEqual({ x: 0, y: 40 });
  });

  it('子图元恰在中心点时保持原地（零向量退化）', () => {
    const origins = [{ x: 5, y: 5 }];
    const center = { x: 5, y: 5 };
    const result = computeExplodePositions(origins, center, 1, 100);
    expect(result[0]).toEqual({ x: 5, y: 5 });
  });

  it('多个子图元各自沿自身方向径向远离', () => {
    const origins = [
      { x: 10, y: 0 },  // 右
      { x: 0, y: 10 },  // 上
      { x: -10, y: 0 }, // 左
    ];
    const center = { x: 0, y: 0 };
    const result = computeExplodePositions(origins, center, 1, 10);
    expect(result[0]).toEqual({ x: 20, y: 0 });
    expect(result[1]).toEqual({ x: 0, y: 20 });
    expect(result[2]).toEqual({ x: -20, y: 0 });
  });

  it('非原点中心：相对中心计算方向', () => {
    const origins = [{ x: 110, y: 100 }]; // 中心 (100,100) 右侧 10
    const center = { x: 100, y: 100 };
    const result = computeExplodePositions(origins, center, 1, 30);
    expect(result[0]).toEqual({ x: 140, y: 100 });
  });

  it('返回数组长度与输入一致', () => {
    const origins = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];
    const center = { x: 0, y: 0 };
    const result = computeExplodePositions(origins, center, 0.5, 10);
    expect(result).toHaveLength(3);
  });
});

describe('dragToFactor', () => {
  it('0 拖拽距离 → factor 0', () => {
    expect(dragToFactor(0, 100)).toBe(0);
  });

  it('达到 maxDrag → factor 1', () => {
    expect(dragToFactor(100, 100)).toBe(1);
  });

  it('超过 maxDrag → factor 1（clamp）', () => {
    expect(dragToFactor(150, 100)).toBe(1);
  });

  it('半个 maxDrag → factor 0.5', () => {
    expect(dragToFactor(50, 100)).toBe(0.5);
  });

  it('负拖拽距离 → factor 0', () => {
    expect(dragToFactor(-20, 100)).toBe(0);
  });

  it('maxDrag <= 0 → factor 0（防除零）', () => {
    expect(dragToFactor(100, 0)).toBe(0);
    expect(dragToFactor(100, -10)).toBe(0);
  });
});
