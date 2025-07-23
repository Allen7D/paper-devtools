import paper from 'paper';

/**
 * 基础工具类，所有工具的基类
 */
export default abstract class BaseTool extends paper.Tool {
  // 存储临时路径，用于绘制过程
  protected path: paper.Path | null = null;
  
  // 是否启用填充
  protected fill: boolean = true;
  
  // 填充颜色
  protected fillColor: paper.Color | string = '#4285F4';
  
  // 描边颜色
  protected strokeColor: paper.Color | string = '#000000';
  
  // 描边宽度
  protected strokeWidth: number = 2;
  
  // 起始点
  protected startPoint: paper.Point | null = null;
  
  // 当前点
  protected currentPoint: paper.Point | null = null;
  
  constructor() {
    super();
    this.minDistance = 2;
    this.maxDistance = 10;
  }
  
  /**
   * 设置工具样式
   */
  setStyle(options: {
    fill?: boolean;
    fillColor?: paper.Color | string;
    strokeColor?: paper.Color | string;
    strokeWidth?: number;
  }) {
    if (options.fill !== undefined) this.fill = options.fill;
    if (options.fillColor) this.fillColor = options.fillColor;
    if (options.strokeColor) this.strokeColor = options.strokeColor;
    if (options.strokeWidth !== undefined) this.strokeWidth = options.strokeWidth;
  }
  
  /**
   * 创建路径
   */
  protected createPath(): paper.Path {
    const path = new paper.Path();
    
    path.strokeColor = this.strokeColor as any;
    path.strokeWidth = this.strokeWidth;
    
    if (this.fill) {
      path.fillColor = this.fillColor as any;
    }
    
    return path;
  }
  
  /**
   * 创建路径时应用的样式选项
   */
  protected getPathOptions(): any {
    const options: any = {
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
    };
    
    if (this.fill) {
      options.fillColor = this.fillColor;
    }
    
    return options;
  }
  
  /**
   * 完成绘制
   */
  protected finishDrawing() {
    if (this.path) {
      this.path.simplify();
      
      // 触发路径创建事件
      if (typeof window !== 'undefined') {
        const customEvent = new CustomEvent('paper:path:created', { 
          detail: { item: this.path } 
        });
        window.dispatchEvent(customEvent);
      }
      
      this.path = null;
    }
    
    this.startPoint = null;
    this.currentPoint = null;
  }
  
  /**
   * 取消绘制
   */
  protected cancelDrawing() {
    if (this.path) {
      this.path.remove();
      this.path = null;
    }
    
    this.startPoint = null;
    this.currentPoint = null;
  }
  
  /**
   * 激活工具
   */
  activate() {
    super.activate();
    paper.project.deselectAll();
    
    if (paper.view) {
      if (paper.view.element) {
        (paper.view.element as HTMLCanvasElement).style.cursor = 'crosshair';
      }
    }
    
    // 触发工具激活事件
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('paper:tool:activated', { 
        detail: { tool: this } 
      });
      window.dispatchEvent(customEvent);
    }
  }
  
  /**
   * 停用工具
   */
  deactivate() {
    this.cancelDrawing();
    
    if (paper.view && paper.view.element) {
      (paper.view.element as HTMLCanvasElement).style.cursor = 'default';
    }
    
    // 触发工具停用事件
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('paper:tool:deactivated', { 
        detail: { tool: this } 
      });
      window.dispatchEvent(customEvent);
    }
  }
} 