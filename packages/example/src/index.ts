import paper from 'paper';
import { createShapes, addRandomShape } from './draw';

interface ScopeEntry {
  scope: paper.PaperScope;
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  scopeId: string;
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
  const container = document.createElement('div');
  container.style.cssText =
    'margin: 20px auto; display: block; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 820px;';

  const header = document.createElement('div');
  header.style.cssText =
    'display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: #f0f0f0; border-bottom: 1px solid #ddd;';

  const label = document.createElement('span');
  label.textContent = `Canvas: ${id}`;
  label.style.cssText = 'font-size: 13px; font-weight: 600; color: #333;';

  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display: flex; gap: 8px;';

  const addShapeBtn = document.createElement('button');
  addShapeBtn.textContent = '＋ 随机图元';
  addShapeBtn.style.cssText =
    'padding: 4px 12px; border: 1px solid #1890ff; border-radius: 4px; background: #fff; color: #1890ff; cursor: pointer; font-size: 12px;';
  addShapeBtn.onmouseenter = () => {
    addShapeBtn.style.background = '#1890ff';
    addShapeBtn.style.color = '#fff';
  };
  addShapeBtn.onmouseleave = () => {
    addShapeBtn.style.background = '#fff';
    addShapeBtn.style.color = '#1890ff';
  };

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

  actionsDiv.appendChild(addShapeBtn);
  actionsDiv.appendChild(deleteBtn);

  header.appendChild(label);
  header.appendChild(actionsDiv);

  const canvas = createCanvas(width, height, id);

  const paperScope = new paper.PaperScope();
  paperScope.setup(canvas);
  createShapes(paperScope);

  container.appendChild(header);
  container.appendChild(canvas);

  const addBtn = document.getElementById('add-canvas-btn');
  if (addBtn) {
    document.body.insertBefore(container, addBtn);
  } else {
    document.body.appendChild(container);
  }

  const scopeId = canvas.id || `scope-${canvasIndex}`;
  const entry: ScopeEntry = { scope: paperScope, container, canvas, scopeId };
  scopeEntries.push(entry);

  globalThis.__PAPER_SCOPES__?.register(scopeId, paperScope, canvas);

  if (!globalThis.__PAPER_SCOPE__) {
    globalThis.__PAPER_SCOPE__ = {
      scopeId,
      paperScope,
    };
  }

  deleteBtn.onclick = () => removeScope(entry);

  addShapeBtn.onclick = () => addRandomShape(entry.scope);

  return entry;
};

const removeScope = (entry: ScopeEntry) => {
  globalThis.__PAPER_SCOPES__?.unregister(entry.scopeId);

  try {
    (entry.scope as any).remove?.();
  } catch (e) {
    /* PaperScope 可能已被销毁 */
  }
  entry.container.remove();
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

document.addEventListener('DOMContentLoaded', () => {
  addButton();

  const entry = drawPaperExample(800, 600, 'paper-canvas-0');
  canvasIndex = 1;

  globalThis.__PAPER_SCOPE__ = {
    scopeId: entry.scopeId,
    paperScope: entry.scope,
  };
});
