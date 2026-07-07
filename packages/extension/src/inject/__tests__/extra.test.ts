import { describe, it, expect } from 'vitest';
import { extractItemProperties, extractProjectProperties } from '../extra';

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

describe('extractProjectProperties', () => {
  it('完整提取 viewSize 和 layersCount', () => {
    const project = {
      view: { size: { width: 100, height: 200 } },
      layers: [{}, {}, {}],
    };
    expect(extractProjectProperties(project as any)).toEqual({
      type: 'Project',
      viewSize: { width: 100, height: 200 },
      layersCount: 3,
    });
  });

  it('无 view 时不包含 viewSize', () => {
    const project = { layers: [] };
    expect(extractProjectProperties(project as any)).toEqual({
      type: 'Project',
      layersCount: 0,
    });
  });

  it('无 layers 时不包含 layersCount', () => {
    const project = { view: { size: { width: 50, height: 50 } } };
    expect(extractProjectProperties(project as any)).toEqual({
      type: 'Project',
      viewSize: { width: 50, height: 50 },
    });
  });
});

describe('extractItemProperties - 字段提取', () => {
  it('完整提取 position/bounds/strokeWidth/opacity/closed', () => {
    const item = {
      position: { x: 1, y: 2 },
      bounds: { x: 0, y: 0, width: 10, height: 20 },
      strokeWidth: 2,
      opacity: 0.8,
      closed: true,
    };
    const props = extractItemProperties(item as any);
    expect(props.position).toEqual({ x: 1, y: 2 });
    expect(props.bounds).toEqual({ x: 0, y: 0, width: 10, height: 20 });
    expect(props.strokeWidth).toBe(2);
    expect(props.opacity).toBe(0.8);
    expect(props.closed).toBe(true);
  });

  it('部分字段缺失时只提取存在的字段', () => {
    const item = { position: { x: 1, y: 2 } };
    const props = extractItemProperties(item as any);
    expect(props.position).toEqual({ x: 1, y: 2 });
    expect(props.bounds).toBeUndefined();
    expect(props.fillColor).toBeUndefined();
    expect(props.strokeWidth).toBeUndefined();
  });
});

describe('extractItemProperties - data 字段提取', () => {
  it('提取 data 对象中的用户字段', () => {
    const item = {
      data: { uuid: 'abc', paperId: 1591, visible: true },
    };
    const props = extractItemProperties(item as any);
    expect(props.data).toEqual({ uuid: 'abc', paperId: 1591, visible: true });
  });

  it('过滤以 __ 开头的内部字段', () => {
    const item = {
      data: { uuid: 'abc', __explodeOrigin__: { x: 0, y: 0 }, __internal__: true },
    };
    const props = extractItemProperties(item as any);
    expect(props.data).toEqual({ uuid: 'abc' });
  });

  it('data 为空对象时不输出 data 字段', () => {
    const item = { data: {} };
    const props = extractItemProperties(item as any);
    expect(props.data).toBeUndefined();
  });

  it('data 仅含内部字段时不输出 data 字段', () => {
    const item = { data: { __explodeOrigin__: { x: 1 } } };
    const props = extractItemProperties(item as any);
    expect(props.data).toBeUndefined();
  });

  it('data 为 null/undefined/非对象时不输出 data 字段', () => {
    expect(extractItemProperties({ data: null } as any).data).toBeUndefined();
    expect(extractItemProperties({ data: undefined } as any).data).toBeUndefined();
    expect(extractItemProperties({ data: 'string' } as any).data).toBeUndefined();
    expect(extractItemProperties({ data: [1, 2] } as any).data).toBeUndefined();
  });

  it('data 含嵌套对象时正确序列化', () => {
    const item = {
      data: {
        style: { bgColor: '#ff0000', opacity: 0.5 },
        shape: { hybrid: true, hybridItems: [{ uuid: 'item1' }, { uuid: 'item2' }] },
      },
    };
    const props = extractItemProperties(item as any);
    expect(props.data).toEqual({
      style: { bgColor: '#ff0000', opacity: 0.5 },
      shape: { hybrid: true, hybridItems: [{ uuid: 'item1' }, { uuid: 'item2' }] },
    });
  });

  it('data 含循环引用时不崩溃', () => {
    const data: any = { uuid: 'abc' };
    data.self = data;
    const item = { data };
    const props = extractItemProperties(item as any);
    // 循环引用时 JSON.stringify 抛错，fallback 返回原始过滤对象
    expect(props.data).toBeDefined();
    expect(props.data!.uuid).toBe('abc');
  });
});
