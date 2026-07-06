import paper from 'paper';
import { createShapes, addRandomShape } from '@example/draw';

interface ScopeEntry {
  scope: paper.PaperScope;
  wrapper: HTMLDivElement;
  canvas: HTMLCanvasElement;
}

const scopeEntries: ScopeEntry[] = [];
let canvasIndex = 0;

/**
 * 初始化本地 Paper.js 场景：创建"创建画布"按钮 + 初始画布。
 *
 * 每个画布对应一个独立 PaperScope，注册到 `paper.PaperScope._scopes`，
 * 供 inject 的 discoverScopes 发现并纳入多 Scope 管理。
 * 复用 example 包的 createShapes / addRandomShape 绘图逻辑。
 */
export function initScene(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('[devtool-local] 未找到 #canvas-container');
    return;
  }

  const addButton = document.createElement('button');
  addButton.id = 'add-canvas-btn';
  addButton.textContent = '＋ 创建画布';
  addButton.style.cssText =
    'display:block;margin:10px auto;padding:8px 20px;border:2px dashed #1890ff;border-radius:6px;background:#fff;color:#1890ff;cursor:pointer;font-size:13px;';
  addButton.onclick = () => createScope(800, 600, `paper-canvas-${canvasIndex++}`);
  container.appendChild(addButton);

  createScope(800, 600, 'paper-canvas-0');
  canvasIndex = 1;
}

function createScope(width: number, height: number, id: string): ScopeEntry {
  const root = document.getElementById('canvas-container')!;
  const addButton = document.getElementById('add-canvas-btn');

  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'margin:10px 0;border:1px solid #ddd;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);';

  const header = document.createElement('div');
  header.style.cssText =
    'display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#f0f0f0;border-bottom:1px solid #ddd;';

  const label = document.createElement('span');
  label.textContent = `Canvas: ${id}`;
  label.style.cssText = 'font-size:12px;font-weight:600;color:#333;';

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:6px;';

  const addShapeBtn = document.createElement('button');
  addShapeBtn.textContent = '＋ 随机图元';
  addShapeBtn.style.cssText =
    'padding:3px 10px;border:1px solid #1890ff;border-radius:3px;background:#fff;color:#1890ff;cursor:pointer;font-size:11px;';

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '✕ 删除';
  deleteBtn.style.cssText =
    'padding:3px 10px;border:1px solid #dc3545;border-radius:3px;background:#fff;color:#dc3545;cursor:pointer;font-size:11px;';

  actions.appendChild(addShapeBtn);
  actions.appendChild(deleteBtn);
  header.appendChild(label);
  header.appendChild(actions);

  const canvas = document.createElement('canvas');
  canvas.id = id;
  canvas.width = width;
  canvas.height = height;
  canvas.style.display = 'block';
  canvas.style.background = '#fff';

  wrapper.appendChild(header);
  wrapper.appendChild(canvas);

  if (addButton) {
    root.insertBefore(wrapper, addButton);
  } else {
    root.appendChild(wrapper);
  }

  const scope = new paper.PaperScope();
  scope.setup(canvas);
  createShapes(scope);

  const entry: ScopeEntry = { scope, wrapper, canvas };
  scopeEntries.push(entry);

  addShapeBtn.onclick = () => addRandomShape(entry.scope);
  deleteBtn.onclick = () => removeScope(entry);

  return entry;
}

function removeScope(entry: ScopeEntry): void {
  try {
    (entry.scope as any).remove?.();
  } catch {
    /* PaperScope 可能已被销毁 */
  }
  entry.wrapper.remove();
  const idx = scopeEntries.indexOf(entry);
  if (idx !== -1) scopeEntries.splice(idx, 1);
}
