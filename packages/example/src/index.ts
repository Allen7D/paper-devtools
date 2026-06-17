import paper from 'paper';
import { createShapes } from './draw';

interface ScopeEntry {
  scope: paper.PaperScope;
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
}

const scopeEntries: ScopeEntry[] = [];
let canvasIndex = 0;

const createCanvas = (width: number, height: number, id: string) => {
  const canvas = document.createElement('canvas');
  canvas.id = id;
  canvas.style.border = '1px solid #ccc';
  canvas.style.display = 'block';
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  canvas.width = width;
  canvas.height = height;

  return canvas;
};

const drawPaperExample = (
  width: number,
  height: number,
  id: string,
): ScopeEntry => {
  // 创建容器 div
  const container = document.createElement('div');
  container.style.cssText =
    'margin: 20px auto; display: block; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 820px;';

  // 创建 header（含标题和删除按钮）
  const header = document.createElement('div');
  header.style.cssText =
    'display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: #f0f0f0; border-bottom: 1px solid #ddd;';

  const label = document.createElement('span');
  label.textContent = `Canvas: ${id}`;
  label.style.cssText = 'font-size: 13px; font-weight: 600; color: #333;';

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '✕ 删除';
  deleteBtn.style.cssText =
    'padding: 4px 12px; border: 1px solid #dc3545; border-radius: 4px; background: #fff; color: #dc3545; cursor: pointer; font-size: 12px;';
  deleteBtn.onmouseenter = () => {
    deleteBtn.style.background = '#dc3545';
    deleteBtn.style.color = '#fff';
  };
  deleteBtn.onmouseleave = () => {
    deleteBtn.style.background = '#fff';
    deleteBtn.style.color = '#dc3545';
  };

  header.appendChild(label);
  header.appendChild(deleteBtn);

  // 创建 Canvas
  const canvas = createCanvas(width, height, id);

  // 创建 PaperScope
  const paperScope = new paper.PaperScope();
  paperScope.setup(canvas);
  createShapes(paperScope);

  // 组装容器
  container.appendChild(header);
  container.appendChild(canvas);

  // 插入到"创建画布"按钮之前
  const addBtn = document.getElementById('add-canvas-btn');
  if (addBtn) {
    document.body.insertBefore(container, addBtn);
  } else {
    document.body.appendChild(container);
  }

  // 创建 entry 并注册（在设置 onclick 前需要 entry 引用）
  const entry: ScopeEntry = { scope: paperScope, container, canvas };
  scopeEntries.push(entry);

  // 绑定删除按钮事件
  deleteBtn.onclick = () => removeScope(entry);

  return entry;
};

const removeScope = (entry: ScopeEntry) => {
  // 清理 PaperScope
  try {
    (entry.scope as any).remove?.();
  } catch (e) {
    /* PaperScope 可能已被销毁 */
  }
  // 移除 DOM
  entry.container.remove();
  // 从列表中移除
  const idx = scopeEntries.indexOf(entry);
  if (idx !== -1) scopeEntries.splice(idx, 1);
};

const addButton = () => {
  const btn = document.createElement('button');
  btn.id = 'add-canvas-btn';
  btn.textContent = '＋ 创建画布';
  btn.style.cssText =
    'display: block; margin: 20px auto; padding: 10px 24px; border: 2px dashed #1890ff; border-radius: 8px; background: #fff; color: #1890ff; cursor: pointer; font-size: 14px; font-weight: 600;';
  btn.onmouseenter = () => {
    btn.style.background = '#e6f7ff';
  };
  btn.onmouseleave = () => {
    btn.style.background = '#fff';
  };
  btn.onclick = () => {
    drawPaperExample(800, 600, `paper-canvas-${canvasIndex++}`);
  };
  document.body.appendChild(btn);
};

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
  // 按钮触发添加画布到页面
  addButton();

  // 添加首张画布到页面
  const entry = drawPaperExample(800, 600, 'paper-canvas-0');
  canvasIndex = 1;

  // 兼容初始检测：指向第一个创建的 Scope
  globalThis.__PAPER_SCOPE__ = {
    scopeId: entry.scope.view.element.id || 'default',
    paperScope: entry.scope,
  };
});
