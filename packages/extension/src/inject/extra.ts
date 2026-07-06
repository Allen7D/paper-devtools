import type { NodeItemPropertie, NodeProjectPropertie } from "types";

/**
 * 提取 paper.js 中 Project 的属性。
 *
 * 从 Project 实例中提取视图尺寸和图层数量等属性，
 * 用于在 DevTools 面板中展示项目级别的信息。
 *
 * @param project - paper.js Project 实例
 * @returns 包含项目属性的对象，包括 `type`、`viewSize`（视图尺寸）和 `layersCount`（图层数量）
 */
export function extractProjectProperties(project: paper.Project): NodeProjectPropertie {
  const properties: NodeProjectPropertie = {
    type: 'Project',
  };

  // 视图尺寸
  if (project.view?.size) {
    properties.viewSize = {
      width: project.view.size.width,
      height: project.view.size.height,
    };
  }

  // 图层数量
  if (project.layers) {
    properties.layersCount = project.layers.length;
  }

  return properties;
}

/**
 * 将 paper.js Color 转为 CSS 字符串，保留透明度。
 *
 * 注意：paper.js 的 `toCSS(true)`（hex 模式）会丢弃 alpha 通道，
 * 因此当颜色存在透明度（alpha < 1）时改用 `toCSS(false)`（rgba 模式）输出，
 * 使 DevTools 面板能够显示并修改 fillColor / strokeColor 的透明度。
 */
function colorToCssWithAlpha(color: paper.Color): string {
  if (!color.toCSS) return String(color);
  // alpha >= 1（含未设置 alpha 的默认值 1）用 hex；半透明用 rgba 保留透明度
  return color.toCSS(color.alpha >= 1);
}

/**
 * 提取 paper.js 图元的属性。
 *
 * 从 Item 实例中提取位置、边界框、填充颜色、描边颜色、描边宽度、
 * 透明度和闭合状态等属性，用于在 DevTools 面板中展示和编辑图元属性。
 *
 * @param item - paper.js 图元实例
 * @returns 图元属性对象，仅包含图元实际拥有的属性字段
 */
export function extractItemProperties(item: paper.Item): NodeItemPropertie {
  const properties: NodeItemPropertie = {};

  // 位置
  if (item.position) {
    properties.position = {
      x: item.position.x,
      y: item.position.y,
    };
  }

  // 边界框
  if (item.bounds) {
    properties.bounds = {
      x: item.bounds.x,
      y: item.bounds.y,
      width: item.bounds.width,
      height: item.bounds.height,
    };
  }

  // 填充颜色（保留透明度）
  if (item.fillColor) {
    properties.fillColor = colorToCssWithAlpha(item.fillColor);
  }

  // 描边颜色（保留透明度）
  if (item.strokeColor) {
    properties.strokeColor = colorToCssWithAlpha(item.strokeColor);
  }

  // 描边宽度
  if (item.strokeWidth !== undefined) {
    properties.strokeWidth = item.strokeWidth;
  }

  // 透明度
  if (item.opacity !== undefined) {
    properties.opacity = item.opacity;
  }

  // 闭合状态
  if ('closed' in item && item.closed != null) {
    properties.closed = item.closed as boolean;
  }

  return properties;
}
