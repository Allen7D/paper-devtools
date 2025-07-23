import BaseTool from './BaseTool';
import { SelectTool } from '../paperTools';
import RectangleTool from './RectangleTool';
import CircleTool from './CircleTool';
import EllipseTool from './EllipseTool';
import LineTool from './LineTool';
import FreehandTool from './FreehandTool';
import PolygonTool from './PolygonTool';

// 工具类型枚举
export enum ToolType {
  SELECT = 'select',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  ELLIPSE = 'ellipse',
  LINE = 'line',
  FREEHAND = 'freehand',
  POLYGON = 'polygon'
}

// 工具接口
export interface Tool {
  activate(): void;
}

/**
 * 工具管理器
 */
export default class ToolManager {
  private tools: Map<ToolType, Tool> = new Map();
  private activeTool: ToolType | null = null;
  private selectTool: SelectTool;
  
  constructor() {
    // 初始化各种工具
    this.selectTool = new SelectTool();
    
    // 将工具添加到管理器
    this.tools.set(ToolType.SELECT, this.selectTool);
    this.tools.set(ToolType.RECTANGLE, new RectangleTool());
    this.tools.set(ToolType.CIRCLE, new CircleTool());
    this.tools.set(ToolType.ELLIPSE, new EllipseTool());
    this.tools.set(ToolType.LINE, new LineTool());
    this.tools.set(ToolType.FREEHAND, new FreehandTool());
    this.tools.set(ToolType.POLYGON, new PolygonTool());
    
    // 默认激活选择工具
    this.activateTool(ToolType.SELECT);
    
    // 监听自动切换到选择工具的事件
    if (typeof window !== 'undefined') {
      window.addEventListener('paper:path:created', () => {
        // 当创建新路径后，自动切换到选择工具
        this.activateTool(ToolType.SELECT);
      });
    }
  }
  
  /**
   * 激活指定工具
   */
  public activateTool(toolType: ToolType): Tool | null {
    // 如果已经激活了该工具，则不做任何操作
    if (this.activeTool === toolType) {
      return this.tools.get(toolType) || null;
    }
    
    // 获取要激活的工具
    const tool = this.tools.get(toolType);
    if (!tool) return null;
    
    // 激活工具
    tool.activate();
    this.activeTool = toolType;
    
    // 触发工具切换事件
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('paper:tool:changed', { 
        detail: { toolType, tool } 
      });
      window.dispatchEvent(customEvent);
    }
    
    return tool;
  }
  
  /**
   * 获取当前激活的工具
   */
  public getActiveTool(): { type: ToolType | null, tool: Tool | null } {
    if (!this.activeTool) return { type: null, tool: null };
    return { 
      type: this.activeTool, 
      tool: this.tools.get(this.activeTool) || null 
    };
  }
  
  /**
   * 获取指定类型的工具
   */
  public getTool(toolType: ToolType): Tool | null {
    return this.tools.get(toolType) || null;
  }
  
  /**
   * 为工具设置样式
   */
  public setToolStyle(toolType: ToolType, options: {
    fill?: boolean;
    fillColor?: paper.Color | string;
    strokeColor?: paper.Color | string;
    strokeWidth?: number;
  }): void {
    const tool = this.tools.get(toolType);
    if (tool && toolType !== ToolType.SELECT) {
      (tool as BaseTool).setStyle(options);
    }
  }
  
  /**
   * 为多边形工具设置边数
   */
  public setPolygonSides(sides: number): void {
    const polygonTool = this.tools.get(ToolType.POLYGON) as PolygonTool;
    if (polygonTool) {
      polygonTool.setSides(sides);
    }
  }
} 