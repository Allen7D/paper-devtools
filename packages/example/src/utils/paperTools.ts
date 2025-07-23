import paper from 'paper';
import { ResizeHandle, OperationMode, type ControlPoint } from './paperSetup';

// 存储全局状态
let selectedItem: paper.Item | null = null;
let controlPoints: ControlPoint[] = [];
let currentMode: OperationMode = OperationMode.SELECT;
let activeHandle: ResizeHandle | null = null;
let dragStartPoint: paper.Point | null = null;
let originalBounds: paper.Rectangle | null = null;

// 选择工具
export class SelectTool extends paper.Tool {
  constructor() {
    super();
    
    // 鼠标按下事件
    this.onMouseDown = (event: paper.ToolEvent) => {
      // 检查是否点击在控制点上
      const handle = getHandleAtPoint(event.point);
      activeHandle = handle;

      if (handle) {
        // 点击在控制点上，进入调整大小模式
        currentMode = OperationMode.RESIZE;
        dragStartPoint = event.point;
        if (selectedItem) {
          originalBounds = selectedItem.bounds.clone();
        }
      } else {
        // 检查是否点击在已选中的项目上
        const hitResult = paper.project.hitTest(event.point, {
          fill: true,
          stroke: true,
          tolerance: 5
        });

        if (hitResult && hitResult.item) {
          if (selectedItem === hitResult.item || (selectedItem && selectedItem.isAncestor(hitResult.item))) {
            // 如果点击在当前选中项上，进入移动模式
            currentMode = OperationMode.MOVE;
            dragStartPoint = event.point;
          } else {
            // 选中新项目
            selectItem(hitResult.item);
            currentMode = OperationMode.SELECT;
          }
        } else {
          // 点击空白区域，取消选中
          unselectItem();
          currentMode = OperationMode.SELECT;
        }
      }
    };

    // 鼠标拖动事件
    this.onMouseDrag = (event: paper.ToolEvent) => {
      // 确保调整大小和移动是互斥的操作
      if (currentMode === OperationMode.MOVE) {
        moveItem(event);
      } else if (currentMode === OperationMode.RESIZE) {
        resizeItem(event);
      }
    };

    // 鼠标抬起事件
    this.onMouseUp = (event: paper.ToolEvent) => {
      // 重置状态
      dragStartPoint = null;
      originalBounds = null;

      // 从移动或调整大小模式回到选择模式
      if (currentMode !== OperationMode.SELECT) {
        activeHandle = null;
        currentMode = OperationMode.SELECT;
      }
    };

    // 鼠标移动事件
    this.onMouseMove = (event: paper.ToolEvent) => {
      updateCursor(event.point);
    };
  }
}

// 选中项目
export const selectItem = (item: paper.Item) => {
  // 先取消之前的选中状态
  unselectItem();

  // 设置新的选中项
  selectedItem = item;
  item.selected = true;

  // 创建控制点
  createControlPoints();
  
  // 触发选择事件，可以用于通知外部组件
  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('paper:item:selected', { 
      detail: { item } 
    });
    window.dispatchEvent(customEvent);
  }
};

// 取消选中
export const unselectItem = () => {
  if (selectedItem) {
    selectedItem.selected = false;
    selectedItem = null;

    // 移除控制点
    removeControlPoints();
    
    // 触发取消选择事件
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('paper:item:unselected');
      window.dispatchEvent(customEvent);
    }
  }

  // 重置操作模式
  currentMode = OperationMode.SELECT;
};

// 创建控制点
export const createControlPoints = () => {
  if (!paper || !selectedItem || !selectedItem.bounds) return;

  // 清除旧的控制点
  removeControlPoints();

  const bounds = selectedItem.bounds;
  const handleSize = 8;
  const handleOptions = {
    fillColor: '#4c8bf5',
    strokeColor: 'white',
    strokeWidth: 1,
    radius: handleSize / 2
  };

  // 创建8个控制点
  const positions = [
    { x: bounds.left, y: bounds.top, handle: ResizeHandle.TOP_LEFT },
    { x: bounds.right, y: bounds.top, handle: ResizeHandle.TOP_RIGHT },
    { x: bounds.left, y: bounds.bottom, handle: ResizeHandle.BOTTOM_LEFT },
    { x: bounds.right, y: bounds.bottom, handle: ResizeHandle.BOTTOM_RIGHT },
    { x: bounds.center.x, y: bounds.top, handle: ResizeHandle.TOP },
    { x: bounds.right, y: bounds.center.y, handle: ResizeHandle.RIGHT },
    { x: bounds.center.x, y: bounds.bottom, handle: ResizeHandle.BOTTOM },
    { x: bounds.left, y: bounds.center.y, handle: ResizeHandle.LEFT }
  ];

  const newControlPoints: ControlPoint[] = [];

  positions.forEach(pos => {
    const handle = new paper.Path.Circle({
      center: new paper.Point(pos.x, pos.y),
      ...handleOptions
    });

    // 保持控制点位于前景
    handle.bringToFront();

    // 设置数据属性
    handle.data = {
      isControlPoint: true,
      handle: pos.handle
    };

    // 添加到控制点数组
    newControlPoints.push({
      handle: pos.handle,
      path: handle
    });
  });

  controlPoints = newControlPoints;
};

// 移除控制点
export const removeControlPoints = () => {
  controlPoints.forEach(cp => cp.path.remove());
  controlPoints = [];
};

// 更新控制点位置
export const updateControlPoints = () => {
  if (!selectedItem || !selectedItem.bounds) return;

  const bounds = selectedItem.bounds;

  controlPoints.forEach(cp => {
    let position: paper.Point;

    switch (cp.handle) {
      case ResizeHandle.TOP_LEFT:
        position = new paper.Point(bounds.left, bounds.top);
        break;
      case ResizeHandle.TOP_RIGHT:
        position = new paper.Point(bounds.right, bounds.top);
        break;
      case ResizeHandle.BOTTOM_LEFT:
        position = new paper.Point(bounds.left, bounds.bottom);
        break;
      case ResizeHandle.BOTTOM_RIGHT:
        position = new paper.Point(bounds.right, bounds.bottom);
        break;
      case ResizeHandle.TOP:
        position = new paper.Point(bounds.center.x, bounds.top);
        break;
      case ResizeHandle.RIGHT:
        position = new paper.Point(bounds.right, bounds.center.y);
        break;
      case ResizeHandle.BOTTOM:
        position = new paper.Point(bounds.center.x, bounds.bottom);
        break;
      case ResizeHandle.LEFT:
        position = new paper.Point(bounds.left, bounds.center.y);
        break;
      default:
        position = new paper.Point(0, 0);
    }

    cp.path.position = position;
  });
};

// 判断是否点击在控制点上
export const getHandleAtPoint = (point: paper.Point): ResizeHandle | null => {
  for (const cp of controlPoints) {
    if (cp.path.contains(point)) {
      return cp.handle;
    }
  }
  return null;
};

// 获取控制点对应的鼠标样式
export const getCursorForHandle = (handle: ResizeHandle): string => {
  switch (handle) {
    case ResizeHandle.TOP_LEFT:
    case ResizeHandle.BOTTOM_RIGHT:
      return 'nwse-resize';
    case ResizeHandle.TOP_RIGHT:
    case ResizeHandle.BOTTOM_LEFT:
      return 'nesw-resize';
    case ResizeHandle.TOP:
    case ResizeHandle.BOTTOM:
      return 'ns-resize';
    case ResizeHandle.LEFT:
    case ResizeHandle.RIGHT:
      return 'ew-resize';
    default:
      return 'default';
  }
};

// 更新鼠标指针样式
export const updateCursor = (point: paper.Point) => {
  if (!paper.view.element) return;

  const handle = getHandleAtPoint(point);
  const canvas = paper.view.element as HTMLCanvasElement;

  if (handle) {
    canvas.style.cursor = getCursorForHandle(handle);
  } else {
    const hitResult = paper.project.hitTest(point, {
      fill: true,
      stroke: true,
      tolerance: 5
    });

    // 如果鼠标在已选中的项目上，显示移动光标
    if (hitResult && hitResult.item && (selectedItem === hitResult.item || (selectedItem && selectedItem.isAncestor(hitResult.item)))) {
      canvas.style.cursor = 'move';
    } else {
      canvas.style.cursor = 'default';
    }
  }
};

// 调整大小
export const resizeItem = (event: paper.ToolEvent) => {
  if (!selectedItem || !activeHandle || !dragStartPoint || !originalBounds) return;

  const dragPoint = event.point;
  const dragDelta = dragPoint.subtract(dragStartPoint);

  // 创建新的边界矩形
  let newBounds = originalBounds.clone();

  switch (activeHandle) {
    case ResizeHandle.TOP_LEFT:
      newBounds.left += dragDelta.x;
      newBounds.top += dragDelta.y;
      break;
    case ResizeHandle.TOP_RIGHT:
      newBounds.right += dragDelta.x;
      newBounds.top += dragDelta.y;
      break;
    case ResizeHandle.BOTTOM_LEFT:
      newBounds.left += dragDelta.x;
      newBounds.bottom += dragDelta.y;
      break;
    case ResizeHandle.BOTTOM_RIGHT:
      newBounds.right += dragDelta.x;
      newBounds.bottom += dragDelta.y;
      break;
    case ResizeHandle.TOP:
      newBounds.top += dragDelta.y;
      break;
    case ResizeHandle.RIGHT:
      newBounds.right += dragDelta.x;
      break;
    case ResizeHandle.BOTTOM:
      newBounds.bottom += dragDelta.y;
      break;
    case ResizeHandle.LEFT:
      newBounds.left += dragDelta.x;
      break;
  }

  // 确保宽度和高度不为负
  if (newBounds.width < 10) {
    if ([ResizeHandle.LEFT, ResizeHandle.TOP_LEFT, ResizeHandle.BOTTOM_LEFT].includes(activeHandle)) {
      newBounds.left = newBounds.right - 10;
    } else {
      newBounds.right = newBounds.left + 10;
    }
  }

  if (newBounds.height < 10) {
    if ([ResizeHandle.TOP, ResizeHandle.TOP_LEFT, ResizeHandle.TOP_RIGHT].includes(activeHandle)) {
      newBounds.top = newBounds.bottom - 10;
    } else {
      newBounds.bottom = newBounds.top + 10;
    }
  }

  // 应用新的边界
  selectedItem.bounds = newBounds;

  // 更新控制点位置
  updateControlPoints();

  // 触发调整大小事件
  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('paper:item:resized', { 
      detail: { item: selectedItem, bounds: newBounds } 
    });
    window.dispatchEvent(customEvent);
  }

  paper.view.update();
};

// 移动项目
export const moveItem = (event: paper.ToolEvent) => {
  if (!selectedItem || !dragStartPoint) return;

  const dragPoint = event.point;
  const dragDelta = dragPoint.subtract(dragStartPoint);

  selectedItem.position = selectedItem.position.add(dragDelta);
  dragStartPoint = dragPoint;

  // 更新控制点位置
  updateControlPoints();
  
  // 触发移动事件
  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('paper:item:moved', { 
      detail: { item: selectedItem, position: selectedItem.position } 
    });
    window.dispatchEvent(customEvent);
  }

  paper.view.update();
};

// 初始化工具
export const initTools = (): paper.Tool => {
  // 创建选择工具
  const selectTool = new SelectTool();
  
  // 激活选择工具
  selectTool.activate();
  
  return selectTool;
}; 