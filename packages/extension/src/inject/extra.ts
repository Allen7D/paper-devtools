import paper from 'paper';
import type { NodeItemPropertie, NodeProjectPropertie } from "types";

/**
 * 提取 paper.js 中 Project 的属性
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
 * 提取 paper.js 图元的属性
 * @param item - paper.js 图元
 * @returns NodeItemPropertie - 图元属性对象
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

  // 填充颜色
  if (item.fillColor) {
    properties.fillColor = item.fillColor.toCSS ? item.fillColor.toCSS(true) : String(item.fillColor);
  }

  // 描边颜色
  if (item.strokeColor) {
    properties.strokeColor = item.strokeColor.toCSS ? item.strokeColor.toCSS(true) : String(item.strokeColor);
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
  if (item instanceof paper.Path && item.closed !== undefined) {
    properties.closed = item.closed;
  }

  return properties;
}
