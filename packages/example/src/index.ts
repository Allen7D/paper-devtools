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
  
  // 创建多层示例图形
  createShapes();
});

function createShapes() {
  // 创建背景 (放在默认图层)
  paper.project.activeLayer.name = 'Default Layer（Init）'
  const background = new paper.Path.Rectangle({
    point: [0, 0],
    size: [paper.view.size.width, paper.view.size.height],
    fillColor: '#f8f9fa'
  });
  background.name = 'Background';
  
  // 创建三个图层
  const geometryLayer = new paper.Layer();
  geometryLayer.name = '几何图形图层';

  geometryLayer.activate();
  
  const pathsLayer = new paper.Layer();
  pathsLayer.name = '路径和线条图层';
  
  const textEffectsLayer = new paper.Layer();
  textEffectsLayer.name = '文本图层';
  
  // === 图层 1: 基本几何图形 ===
  geometryLayer.activate();
  
  // 圆形
  const circle1 = new paper.Path.Circle({
    center: [120, 120],
    radius: 40,
    fillColor: '#ff6b6b',
    strokeColor: '#dc3545',
    strokeWidth: 2
  });
  circle1.name = 'Red Circle';
  
  // 矩形
  const rectangle = new paper.Path.Rectangle({
    point: [200, 80],
    size: [80, 80],
    fillColor: '#4ecdc4',
    strokeColor: '#17a2b8',
    strokeWidth: 2
  });
  rectangle.name = 'Teal Rectangle';
  
  // 椭圆
  const ellipse = new paper.Path.Ellipse({
    point: [320, 70],
    size: [100, 60],
    fillColor: '#ffe66d',
    strokeColor: '#ffc107',
    strokeWidth: 2
  });
  ellipse.name = 'Yellow Ellipse';
  
  // 圆角矩形
  const roundRect = new paper.Path.Rectangle({
    point: [450, 80],
    size: [80, 80],
    radius: 15,
    fillColor: '#a855f7',
    strokeColor: '#7c3aed',
    strokeWidth: 2
  });
  roundRect.name = 'Purple Round Rectangle';
  
  // 多边形 (六边形)
  const hexagon = new paper.Path.RegularPolygon({
    center: [250, 320],
    sides: 6,
    radius: 35,
    fillColor: '#6f42c1',
    strokeColor: '#563d7c',
    strokeWidth: 2
  });
  hexagon.name = 'Purple Hexagon';
  
  // 三角形
  const triangle = new paper.Path([
    [320, 290],
    [370, 350],
    [370, 290]
  ]);
  triangle.fillColor = new paper.Color('#fd7e14');
  triangle.strokeColor = new paper.Color('#e8590c');
  triangle.strokeWidth = 2;
  triangle.closed = true;
  triangle.name = 'Orange Triangle';
  
  // 渐变图形
  const gradientCircle = new paper.Path.Circle({
    center: [600, 120],
    radius: 40,
    fillColor: {
      gradient: {
        stops: ['#ff6b6b', '#4ecdc4'],
        radial: true
      },
      origin: [600, 120],
      destination: [640, 120]
    }
  });
  gradientCircle.name = 'Gradient Circle';
  
  // === 图层 2: 路径和线条 ===
  pathsLayer.activate();
  
  // 直线
  const line = new paper.Path.Line({
    from: [50, 220],
    to: [200, 220],
    strokeColor: '#28a745',
    strokeWidth: 3
  });
  line.name = 'Green Line';
  
  // 折线路径
  const zigzag = new paper.Path();
  zigzag.strokeColor = new paper.Color('#fd7e14');
  zigzag.strokeWidth = 3;
  zigzag.moveTo([220, 200]);
  zigzag.lineTo([260, 230]);
  zigzag.lineTo([300, 200]);
  zigzag.lineTo([340, 230]);
  zigzag.lineTo([380, 200]);
  zigzag.name = 'Orange Zigzag';
  
  // 贝塞尔曲线
  const curve = new paper.Path();
  curve.strokeColor = new paper.Color('#e83e8c');
  curve.strokeWidth = 4;
  curve.strokeCap = 'round';
  curve.moveTo([420, 200]);
  curve.curveTo([460, 180], [500, 240]);
  curve.curveTo([540, 160], [580, 220]);
  curve.name = 'Pink Curve';
  
  // 星形 (手绘路径)
  const star = new paper.Path();
  star.fillColor = new paper.Color('#20c997');
  star.strokeColor = new paper.Color('#17a2b8');
  star.strokeWidth = 2;
  star.name = 'Green Star';
  
  const starPoints = 6;
  const outerRadius = 35;
  const innerRadius = 18;
  const center = new paper.Point(120, 320);
  
  for (let i = 0; i < starPoints * 2; i++) {
    const angle = (i * Math.PI) / starPoints;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const point = center.add([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    
    if (i === 0) {
      star.moveTo(point);
    } else {
      star.lineTo(point);
    }
  }
  star.closePath();
  
  // 图案填充路径
  const patternRect = new paper.Path.Rectangle({
    point: [600, 200],
    size: [80, 60],
    strokeColor: '#495057',
    strokeWidth: 2
  });
  patternRect.name = 'Pattern Rectangle';
  
  // 点状图案组
  const patternGroup = new paper.Group();
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 6; y++) {
      if ((x + y) % 2 === 0) {
        const dot = new paper.Path.Circle({
          center: [610 + x * 10, 210 + y * 10],
          radius: 2,
          fillColor: '#6c757d'
        });
        patternGroup.addChild(dot);
      }
    }
  }
  patternGroup.name = 'Dot Pattern Group';
  
  // === 图层 3: 文本和特效 ===
  textEffectsLayer.activate();
  
  // 主标题
  const title = new paper.PointText({
    point: [400, 50],
    content: 'Paper.js 多图层示例',
    fillColor: '#343a40',
    fontFamily: 'Arial',
    fontSize: 18,
    fontWeight: 'bold'
  });
  title.name = 'Main Title';
  
  // 副标题
  const subtitle = new paper.PointText({
    point: [450, 320],
    content: 'DevTools 测试',
    fillColor: '#6c757d',
    fontFamily: 'Arial',
    fontSize: 14
  });
  subtitle.name = 'Subtitle';
  
  // 图层说明文本
  const layerInfo = new paper.PointText({
    point: [50, 50],
    content: '图层 1: 几何图形\n图层 2: 路径线条\n图层 3: 文本特效',
    fillColor: '#495057',
    fontFamily: 'Arial',
    fontSize: 11,
    leading: 16
  });
  layerInfo.name = 'Layer Info Text';
  
  // 组合图形
  const shapeGroup = new paper.Group();
  shapeGroup.name = 'Geometric Shapes Group';
  
  // 在组中添加一些小图形
  for (let i = 0; i < 4; i++) {
    const smallShape = new paper.Path.Circle({
      center: [480 + (i % 2) * 30, 400 + Math.floor(i / 2) * 30],
      radius: 10,
      fillColor: `hsl(${i * 90}, 70%, 60%)`
    });
    smallShape.name = `Group Circle ${i + 1}`;
    shapeGroup.addChild(smallShape);
  }
  
  // 带透明度的图形
  const transparentShape = new paper.Path.Rectangle({
    point: [50, 400],
    size: [150, 80],
    fillColor: '#17a2b8',
    opacity: 0.6
  });
  transparentShape.name = 'Transparent Rectangle';
  
  // 重叠的透明圆形
  const overlappingCircles = new paper.Group();
  overlappingCircles.name = 'Overlapping Circles Group';
  
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
  for (let i = 0; i < 3; i++) {
    const circle = new paper.Path.Circle({
      center: [280 + i * 25, 450],
      radius: 30,
      fillColor: colors[i],
      opacity: 0.7
    });
    circle.name = `Overlay Circle ${i + 1}`;
    overlappingCircles.addChild(circle);
  }
  
  // 发光效果文本
  const glowText = new paper.PointText({
    point: [400, 480],
    content: '✨ 特殊效果文本 ✨',
    fillColor: '#ffd700',
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 'bold'
  });
  glowText.name = 'Glow Text';
  
  // 添加文本阴影效果
  const shadowText = glowText.clone();
  shadowText.fillColor = new paper.Color('#333333');
  shadowText.position = shadowText.position.add([2, 2]);
  shadowText.name = 'Text Shadow';
  shadowText.insertBelow(glowText);
  
  // 确保所有图层都可见
  geometryLayer.visible = true;
  pathsLayer.visible = true;
  textEffectsLayer.visible = true;
  
  // 激活第一个图层作为活动图层
  geometryLayer.activate();
}