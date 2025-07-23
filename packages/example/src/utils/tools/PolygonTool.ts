import paper from 'paper';
import BaseTool from './BaseTool';

/**
 * 多边形绘制工具
 */
export default class PolygonTool extends BaseTool {
  private isDrawing: boolean = false;
  private doubleClickTimer: number | null = null;
  private lastClickTime: number = 0;
  
  constructor(private sides: number = 5) {
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
   * 设置多边形边数
   */
  public setSides(sides: number) {
    this.sides = Math.max(3, Math.floor(sides)); // 至少3条边
  }
  
  /**
   * 处理鼠标按下事件
   */
  private handleMouseDown(event: paper.ToolEvent) {
    // 检测双击 - 结束绘制
    const now = Date.now();
    if (now - this.lastClickTime < 300) { // 300ms内的点击视为双击
      if (this.isDrawing) {
        this.finishDrawing();
        this.isDrawing = false;
      }
      this.lastClickTime = 0; // 重置点击时间
      return;
    }
    this.lastClickTime = now;
    
    if (!this.isDrawing) {
      // 开始一个新的路径
      this.cancelDrawing(); // 清除之前可能存在的路径
      
      // 记录起始点
      this.startPoint = event.point;
      this.currentPoint = event.point;
      
      // 创建多边形路径
      this.path = this.createPath();
      this.path.closed = true;
      
      // 添加初始多边形点
      this.updatePolygonPath(event.point, event.point);
      
      this.isDrawing = true;
    }
  }
  
  /**
   * 处理鼠标拖动事件
   */
  private handleMouseDrag(event: paper.ToolEvent) {
    if (!this.path || !this.startPoint || !this.isDrawing) return;
    
    this.currentPoint = event.point;
    this.updatePolygonPath(this.startPoint, this.currentPoint);
    
    // 更新视图
    paper.view.update();
  }
  
  /**
   * 处理鼠标抬起事件
   */
  private handleMouseUp(event: paper.ToolEvent) {
    if (!this.path || !this.startPoint || !this.isDrawing) return;
    
    this.currentPoint = event.point;
    this.updatePolygonPath(this.startPoint, this.currentPoint);
    
    // 计算多边形大小
    const size = this.startPoint.getDistance(this.currentPoint);
    if (size < 5) {
      // 如果多边形太小，取消绘制
      this.cancelDrawing();
      this.isDrawing = false;
      return;
    }
    
    // 完成绘制
    this.finishDrawing();
    this.isDrawing = false;
  }
  
  /**
   * 更新多边形路径
   */
  private updatePolygonPath(center: paper.Point, radiusPoint: paper.Point) {
    if (!this.path) return;
    
    // 清除现有路径
    this.path.removeSegments();
    
    // 计算半径和角度
    const radius = center.getDistance(radiusPoint);
    const angle = (radiusPoint.subtract(center)).angle;
    
    // 创建多边形点
    for (let i = 0; i < this.sides; i++) {
      const theta = angle + (360 / this.sides) * i;
      const x = center.x + radius * Math.cos(theta * Math.PI / 180);
      const y = center.y + radius * Math.sin(theta * Math.PI / 180);
      this.path.add(new paper.Point(x, y));
    }
  }
  
  /**
   * 处理键盘事件
   */
  private handleKeyDown(event: paper.KeyEvent) {
    // 按下ESC键取消绘制
    if (event.key === 'escape') {
      this.cancelDrawing();
      this.isDrawing = false;
    }
  }
} 