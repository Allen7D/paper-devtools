import paper from 'paper';
import BaseTool from './BaseTool';

/**
 * 线条绘制工具
 */
export default class LineTool extends BaseTool {
  constructor() {
    super();
    
    // 默认线条工具不需要填充
    this.fill = false;
    
    // 鼠标按下事件
    this.onMouseDown = this.handleMouseDown.bind(this);
    
    // 鼠标拖动事件
    this.onMouseDrag = this.handleMouseDrag.bind(this);
    
    // 鼠标抬起事件
    this.onMouseUp = this.handleMouseUp.bind(this);
    
    // 按键事件 - 用于取消绘制
    this.onKeyDown = this.handleKeyDown.bind(this);
  }
  
  /**
   * 处理鼠标按下事件
   */
  private handleMouseDown(event: paper.ToolEvent) {
    // 开始一个新的路径
    this.cancelDrawing(); // 清除之前可能存在的路径
    
    // 记录起始点
    this.startPoint = event.point;
    
    // 创建线条路径
    this.path = new paper.Path();
    this.path.strokeColor = this.strokeColor as any;
    this.path.strokeWidth = this.strokeWidth;
    
    // 添加起始点
    this.path.add(this.startPoint);
    // 添加当前点（与起始点相同）
    this.path.add(this.startPoint);
  }
  
  /**
   * 处理鼠标拖动事件
   */
  private handleMouseDrag(event: paper.ToolEvent) {
    if (!this.path || !this.startPoint) return;
    
    // 更新线条终点
    this.path.removeSegment(1); // 移除最后一个点
    this.path.add(event.point); // 添加新的终点
    
    // 更新视图
    paper.view.update();
  }
  
  /**
   * 处理鼠标抬起事件
   */
  private handleMouseUp(event: paper.ToolEvent) {
    if (!this.path || !this.startPoint) return;
    
    // 检查线条是否有有效长度
    const length = this.startPoint.getDistance(event.point);
    if (length < 2) {
      // 如果线条太短，取消绘制
      this.cancelDrawing();
      return;
    }
    
    // 完成绘制
    this.finishDrawing();
  }
  
  /**
   * 处理键盘事件
   */
  private handleKeyDown(event: paper.KeyEvent) {
    // 按下ESC键取消绘制
    if (event.key === 'escape') {
      this.cancelDrawing();
    }
  }
} 