// 导出工具接口
export type { Tool } from './ToolManager';
export { ToolType } from './ToolManager';

// 导出基础工具
export { default as BaseTool } from './BaseTool';

// 导出具体工具
export { default as RectangleTool } from './RectangleTool';
export { default as CircleTool } from './CircleTool';
export { default as EllipseTool } from './EllipseTool';
export { default as LineTool } from './LineTool';
export { default as FreehandTool } from './FreehandTool';
export { default as PolygonTool } from './PolygonTool';

// 导出工具管理器
export { default as ToolManager } from './ToolManager';

// 从旧的paperTools中导出选择工具
export { SelectTool } from '../paperTools'; 