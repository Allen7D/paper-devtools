import { describe, it, expect } from 'vitest';
import { extractItemProperties } from '../extra';

/**
 * 构造一个模拟 paper.js Color 的对象，复刻其 toCSS 行为：
 * - toCSS(true)  → 始终返回 `#rrggbb`（丢弃 alpha，这是 paper.js 的实际行为）
 * - toCSS(false) → alpha < 1 时返回 `rgba(r,g,b,a)`，否则返回 `rgb(r,g,b)`
 * - alpha        → 已解析的 alpha 值（未设置时为 1，对应 paper.js 的 getAlpha）
 */
const makeColor = (
  r: number,
  g: number,
  b: number,
  alpha: number | null = null,
): paper.Color => {
  const a = alpha ?? 1;
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return {
    alpha: a,
    toCSS(hex: boolean) {
      if (hex) return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      return a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
    },
  } as unknown as paper.Color;
};

const makeItem = (props: {
  fillColor?: paper.Color;
  strokeColor?: paper.Color;
}): paper.Item => props as unknown as paper.Item;

describe('extractItemProperties - 颜色透明度保留', () => {
  it('不透明填充色（alpha=1）输出 hex 格式', () => {
    const item = makeItem({ fillColor: makeColor(255, 0, 0, 1) });
    const { fillColor } = extractItemProperties(item);
    expect(fillColor).toBe('#ff0000');
  });

  it('未设置 alpha 的填充色输出 hex 格式（默认不透明）', () => {
    const item = makeItem({ fillColor: makeColor(255, 0, 0) });
    const { fillColor } = extractItemProperties(item);
    expect(fillColor).toBe('#ff0000');
  });

  it('半透明填充色（alpha<1）输出 rgba 格式以保留透明度', () => {
    const item = makeItem({ fillColor: makeColor(255, 0, 0, 0.5) });
    const { fillColor } = extractItemProperties(item);
    expect(fillColor).toBe('rgba(255,0,0,0.5)');
  });

  it('半透明描边色（alpha<1）输出 rgba 格式以保留透明度', () => {
    const item = makeItem({ strokeColor: makeColor(0, 0, 255, 0.3) });
    const { strokeColor } = extractItemProperties(item);
    expect(strokeColor).toBe('rgba(0,0,255,0.3)');
  });

  it('不透明描边色输出 hex 格式', () => {
    const item = makeItem({ strokeColor: makeColor(0, 0, 255, 1) });
    const { strokeColor } = extractItemProperties(item);
    expect(strokeColor).toBe('#0000ff');
  });

  it('填充与描边可各自独立携带不同透明度', () => {
    const item = makeItem({
      fillColor: makeColor(255, 0, 0, 0.25),
      strokeColor: makeColor(0, 255, 0, 1),
    });
    const { fillColor, strokeColor } = extractItemProperties(item);
    expect(fillColor).toBe('rgba(255,0,0,0.25)');
    expect(strokeColor).toBe('#00ff00');
  });

  it('完全透明（alpha=0）也以 rgba 输出，不被丢弃', () => {
    const item = makeItem({ fillColor: makeColor(255, 0, 0, 0) });
    const { fillColor } = extractItemProperties(item);
    expect(fillColor).toBe('rgba(255,0,0,0)');
  });
});
