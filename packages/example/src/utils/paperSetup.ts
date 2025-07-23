import paper from 'paper';

// 调整大小的控制点位置枚举
export enum ResizeHandle {
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  TOP = 'top',
  RIGHT = 'right',
  BOTTOM = 'bottom',
  LEFT = 'left'
}

// 操作模式枚举
export enum OperationMode {
  SELECT = 'select',
  MOVE = 'move',
  RESIZE = 'resize'
}

// 控制点接口
export interface ControlPoint {
  handle: ResizeHandle;
  path: paper.Path;
}

// 初始化 Paper.js
export const initPaper = (): typeof paper => {
  // 延迟初始化，确保DOM已经渲染
  setTimeout(() => {
    const canvas = document.getElementById('paperCanvas') as HTMLCanvasElement;
    if (canvas) {
      paper.setup(canvas);
      
      // 暴露 Paper 实例给 DevTools 扩展
      (window as any).__PAPER_JS__ = paper;
    }
  }, 0);
  
  return paper;
};

// 随机获取数组中的一个元素
export const getRandomItem = <T,>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// 随机位置
export const getRandomPosition = (): paper.Point => {
  const width = paper.view?.size.width || 800;
  const height = paper.view?.size.height || 600;
  const margin = 100; // 边距
  return new paper.Point(
    margin + Math.random() * (width - margin * 2),
    margin + Math.random() * (height - margin * 2)
  );
}; 