import paper from 'paper';

/**
 * 初始化本地 Paper.js 场景：创建 Canvas + PaperScope + 示例图元。
 *
 * 将 Canvas 挂载到 #canvas-container，PaperScope 实例注册到
 * paper.PaperScope._scopes，供 inject 的 discoverScopes 发现。
 */
export function initScene(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('[devtool-local] 未找到 #canvas-container');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'paper-canvas-0';
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.border = '1px solid #ccc';
  canvas.style.background = '#fff';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const scope = new paper.PaperScope();
  scope.setup(canvas);

  // 绘制示例图元：一个 Group 包含 Circle 和 Rectangle
  const circle = new scope.Path.Circle({
    center: [200, 200],
    radius: 50,
    fillColor: '#e74c3c',
    name: 'Circle',
  });

  const rect = new scope.Path.Rectangle({
    point: [350, 150],
    size: [120, 80],
    fillColor: '#3498db',
    name: 'Rect',
  });

  new scope.Group({ children: [circle, rect], name: 'Shapes' });

  // 触发一次视图更新，让 inject 的 view.update 代理生效
  scope.view.update();
}
