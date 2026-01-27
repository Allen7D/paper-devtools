import paper from 'paper';
import { createShapes } from './draw';

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.id = 'paper-canvas';
  canvas.style.border = '1px solid #ccc';
  canvas.style.display = 'block';
  canvas.style.margin = '20px auto';
  canvas.width = width;
  canvas.height = height;

  return canvas;
}

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
  const canvas = createCanvas(800, 600);
  const paperScope = new paper.PaperScope();

  // 添加画布到页面
  document.body.appendChild(canvas);

  // 初始化 Paper.js
  paperScope.setup(canvas);

  // 注册当前的 paperScope
  // TODO: 在界面上对 element 进行快速高亮
  globalThis.__PAPER_SCOPE__ = {
    scopeId: paperScope.view.element.id || 'default',
    paperScope: paperScope,
  }
  // 创建多层示例图形
  createShapes(paperScope);
});
