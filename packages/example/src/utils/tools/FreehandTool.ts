import paper from 'paper';
import BaseTool from './BaseTool';

/**
 * 自由绘制工具
 */
export default class FreehandTool extends BaseTool {
  constructor() {
    super();
    
    // 默认自由绘制工具不需要填充
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
    
    // 创建自由绘制路径
    this.path = this.createPath();
    
    // 添加起始点
    this.path.add(this.startPoint);
  }
  
  /**
   * 处理鼠标拖动事件
   */
  private handleMouseDrag(event: paper.ToolEvent) {
    if (!this.path) return;
    
    // 添加拖动点
    this.path.add(event.point);
    
    // 更新视图
    paper.view.update();
  }
  
  /**
   * 处理鼠标抬起事件
   */
  private handleMouseUp(event: paper.ToolEvent) {
    if (!this.path || this.path.segments.length < 2) {
      // 如果路径点数太少，取消绘制
      this.cancelDrawing();
      return;
    }
    
    // 对于自由绘制，可以选择性平滑路径
    this.path.simplify(2.5);
    
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