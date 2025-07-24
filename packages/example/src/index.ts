import paper from 'paper';

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
  // 创建画布元素
  const canvas = document.createElement('canvas');
  canvas.id = 'paper-canvas';
  canvas.style.border = '1px solid #ccc';
  canvas.style.display = 'block';
  canvas.style.margin = '20px auto';
  canvas.width = 800;
  canvas.height = 600;
  
  // 添加画布到页面
  document.body.appendChild(canvas);
  
  // 初始化 Paper.js
  paper.setup(canvas);
  
  // 将 paper 实例暴露到全局，以便 DevTools 扩展访问
  (window as any).paper = paper;
  
  // 创建简单的示例图形
  createSimpleShapes();
});

function createSimpleShapes() {
  // 创建背景
  const background = new paper.Path.Rectangle({
    point: [0, 0],
    size: [paper.view.size.width, paper.view.size.height],
    fillColor: '#f8f9fa'
  });
  background.name = 'Background';
  
  // 创建一个红色圆形
  const circle1 = new paper.Path.Circle({
    center: [200, 200],
    radius: 60,
    fillColor: '#ff6b6b'
  });
  circle1.name = 'Red Circle';
  
  // 创建一个蓝色矩形
  const rectangle = new paper.Path.Rectangle({
    point: [350, 150],
    size: [120, 100],
    fillColor: '#4ecdc4'
  });
  rectangle.name = 'Blue Rectangle';
  
  // 创建一个黄色圆形
  const circle2 = new paper.Path.Circle({
    center: [550, 200],
    radius: 50,
    fillColor: '#ffe66d'
  });
  circle2.name = 'Yellow Circle';
  
  // 创建文本
  const text = new paper.PointText({
    point: [400, 400],
    content: '文本',
    fillColor: '#2c3e50',
    fontFamily: 'Arial',
    fontSize: 14
  });
  text.name = 'Title Text';
  
  // 创建一个简单的组
  const group = new paper.Group();
  group.name = 'Small Circles Group';
  
  // 在组中添加3个小圆形
  for (let i = 0; i < 3; i++) {
    const smallCircle = new paper.Path.Circle({
      center: [380 + i * 40, 300],
      radius: 15,
      fillColor: '#e74c3c'
    });
    smallCircle.name = `Small Circle ${i + 1}`;
    group.addChild(smallCircle);
  }
}
