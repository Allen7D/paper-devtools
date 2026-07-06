/**
 * Group 爆炸预览模式的纯数学函数。
 *
 * 独立于 Paper.js 运行时，便于单元测试。
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * 计算爆炸模式下各子图元的目标位置。
 *
 * 每个子图元沿"自身原始位置 → Group 中心"的反方向径向远离中心，
 * 远离距离 = `factor * maxDist`。子图元恰在中心点时方向向量退化，
 * 改为在零向量子图元中均匀分配角度（`2π * i / n`），避免堆叠。
 *
 * @param origins 子图元原始位置数组（中心坐标）
 * @param center Group 中心点
 * @param factor 爆炸程度 ∈ [0, 1]
 * @param maxDist 最大远离距离（Paper.js 坐标系单位）
 * @returns 子图元新位置数组，与 `origins` 等长
 */
export function computeExplodePositions(
  origins: Point[],
  center: Point,
  factor: number,
  maxDist: number
): Point[] {
  // 先收集零向量子图元的索引
  const zeroIndices: number[] = [];
  const results: Point[] = origins.map((origin, i) => {
    const dx = origin.x - center.x;
    const dy = origin.y - center.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      zeroIndices.push(i);
      return origin; // 占位，稍后填充
    }
    const ux = dx / len;
    const uy = dy / len;
    return {
      x: origin.x + ux * factor * maxDist,
      y: origin.y + uy * factor * maxDist,
    };
  });

  // 零向量子图元：以中心为圆心，均匀分布在圆周上
  const n = zeroIndices.length;
  if (n > 0) {
    const offset = factor * maxDist;
    zeroIndices.forEach((idx, i) => {
      const angle = (2 * Math.PI * i) / n;
      results[idx] = {
        x: center.x + Math.cos(angle) * offset,
        y: center.y + Math.sin(angle) * offset,
      };
    });
  }

  return results;
}

/**
 * 将拖拽像素距离映射为爆炸程度 factor。
 *
 * @param dragDistance 拖拽距离（像素，非负）
 * @param maxDrag 达到满爆炸所需的拖拽距离（像素），必须为正
 * @returns factor ∈ [0, 1]
 */
export function dragToFactor(dragDistance: number, maxDrag: number): number {
  if (maxDrag <= 0) return 0;
  return Math.min(1, Math.max(0, dragDistance / maxDrag));
}
