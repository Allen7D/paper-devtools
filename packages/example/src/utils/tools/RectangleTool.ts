import paper from 'paper';
import BaseTool from './BaseTool';

/**
 * 矩形绘制工具
 */
export default class RectangleTool extends BaseTool {
  constructor() {
    super();
    
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
    
    // 创建矩形
    this.path = new paper.Path.Rectangle({
      from: this.startPoint,
      to: this.startPoint,
      ...this.getPathOptions()
    });
  }
  
  /**
   * 处理鼠标拖动事件
   */
  private handleMouseDrag(event: paper.ToolEvent) {
    if (!this.path || !this.startPoint) return;
    
    // 移除旧路径
    this.path.remove();
    
    // 创建新矩形 - 从起始点到当前点
    this.path = new paper.Path.Rectangle({
      from: this.startPoint,
      to: event.point,
      ...this.getPathOptions()
    });
    
    // 更新视图
    paper.view.update();
  }
  
  /**
   * 处理鼠标抬起事件
   */
  private handleMouseUp(event: paper.ToolEvent) {
    if (!this.path || !this.startPoint) return;
    
    // 检查矩形是否有有效尺寸
    const bounds = this.path.bounds;
    if (bounds.width < 2 || bounds.height < 2) {
      // 如果矩形太小，取消绘制
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