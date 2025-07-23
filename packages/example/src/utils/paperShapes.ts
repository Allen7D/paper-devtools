import paper from 'paper';
import { getRandomItem, getRandomPosition } from './paperSetup';

// 设置一些颜色数组，用于随机选择
const fillColors: string[] = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8F00FF', '#FF6D01', '#00A8E1'];
const strokeColors: string[] = ['#000000', '#333333', '#555555', '#777777', '#999999'];

// 创建矩形的函数
export const createRectangle = (): paper.Path.Rectangle => {
  const position = getRandomPosition();
  const size = new paper.Size(
    50 + Math.random() * 100,
    50 + Math.random() * 100
  );
  
  const rectangle = new paper.Path.Rectangle({
    point: position.subtract(size.divide(2)),
    size: size,
    fillColor: getRandomItem(fillColors),
    strokeColor: getRandomItem(strokeColors),
    strokeWidth: 2,
    name: `矩形_${paper.project.activeLayer.children.length + 1}`
  });
  
  // 旋转随机角度
  rectangle.rotate(Math.random() * 360);
  
  paper.view.update();
  return rectangle;
};

// 创建圆形的函数
export const createCircle = (): paper.Path.Circle => {
  const position = getRandomPosition();
  const radius = 25 + Math.random() * 50;
  
  const circle = new paper.Path.Circle({
    center: position,
    radius: radius,
    fillColor: getRandomItem(fillColors),
    strokeColor: getRandomItem(strokeColors),
    strokeWidth: 2,
    name: `圆形_${paper.project.activeLayer.children.length + 1}`
  });
  
  paper.view.update();
  return circle;
};

// 创建路径的函数
export const createPath = (): paper.Path => {
  const position = getRandomPosition();
  const numPoints = 3 + Math.floor(Math.random() * 5); // 3-7个点
  const path = new paper.Path({
    strokeColor: getRandomItem(strokeColors),
    strokeWidth: 2,
    fillColor: getRandomItem(fillColors),
    closed: true,
    name: `路径_${paper.project.activeLayer.children.length + 1}`
  });
  
  // 添加随机点
  for (let i = 0; i < numPoints; i++) {
    const angle = i * (360 / numPoints);
    const radius = 25 + Math.random() * 50;
    const point = position.add(
      new paper.Point(
        Math.cos(angle * Math.PI / 180) * radius,
        Math.sin(angle * Math.PI / 180) * radius
      )
    );
    path.add(point);
  }
  
  // 平滑路径
  path.smooth();
  
  paper.view.update();
  return path;
};

// 创建组的函数
export const createGroup = (): paper.Group => {
  const rect = createRectangle();
  const circle = createCircle();
  
  // 确保圆在矩形内部
  circle.scale(0.5);
  circle.position = rect.position;
  
  // 创建组
  const group = new paper.Group({
    children: [rect, circle],
    name: `组_${paper.project.activeLayer.children.length + 1}`
  });
  
  paper.view.update();
  return group;
};

// 清空画布的函数
export const clearCanvas = (): void => {
  if (paper && paper.project) {
    paper.project.activeLayer.removeChildren();
    paper.view.update();
  }
}; 

export const createRandomInitShapeSet = (): void => {
  		// 创建示例图形

			createRectangle();
			createCircle();
			createPath();

			// 创建一个简单的组
			const group = new paper.Group({
				name: '示例组'
			});

			// 在组内添加一些图形
			const rect = new paper.Path.Rectangle({
				point: [100, 100],
				size: [100, 50],
				fillColor: '#4285F4',
				strokeColor: '#000000',
				strokeWidth: 2,
				name: '组内矩形'
			});

			const circle = new paper.Path.Circle({
				center: [150, 125],
				radius: 20,
				fillColor: '#EA4335',
				name: '组内圆形'
			});

			group.addChild(rect);
			group.addChild(circle);
}
