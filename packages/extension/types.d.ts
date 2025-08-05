/**
 * 图元节点属性接口
 */
export interface NodeItemPropertie {
  position?: { x: number; y: number };
  bounds?: { x: number; y: number; width: number; height: number };
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  closed?: boolean;
  type?: string;
}

export interface NodeProjectPropertie {
  viewSize?: { width: number; height: number };
  layersCount?: number;
  type?: string;
}


export interface ScopeProjectNode {
  id: string;
  name: string;
  type: 'Project';
  properties: NodeProjectPropertie;
  viewSize?: { width: number; height: number };
  layersCount?: number;
  children?: ScopeTreeNode[];
  visible: boolean;
  selected: boolean;
}

export interface ScopeTreeNode {
  id: string;
  name: string;
  type: string;
  children: SceneTreeNode[];
  properties: Record<string, any>;
  visible: boolean;
  selected: boolean;
}