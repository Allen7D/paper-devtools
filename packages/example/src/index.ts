import paper from 'paper';
import { createShapes } from './draw';

const createCanvas = (width: number, height: number, id: string) => {
  const canvas = document.createElement('canvas');
  canvas.id = id;
  canvas.style.border = '1px solid #ccc';
  canvas.style.display = 'block';
  canvas.style.margin = '20px auto';
  canvas.width = width;
  canvas.height = height;

  return canvas;
}

const drawPaperExample = (width: number, height: number, id: string): paper.PaperScope => {
  const canvas = createCanvas(width, height, id);
  document.body.appendChild(canvas);
  const paperScope = new paper.PaperScope();
  paperScope.setup(canvas);  // 初始化 Paper.js
  createShapes(paperScope);

  return paperScope;
}

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
  // 添加画布到页面
  const paperScope = drawPaperExample(800, 600, 'paper-canvas');

  // 添加画布2到页面
  const paperScope2 = drawPaperExample(800, 600, 'paper-canvas2');

  // TODO: 在界面上对 element 进行快速高亮
  globalThis.__PAPER_SCOPE__ = {
    scopeId: paperScope.view.element.id || 'default',
    paperScope: paperScope,
  }
});
