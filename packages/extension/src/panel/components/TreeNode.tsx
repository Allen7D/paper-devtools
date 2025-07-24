import React from 'react';
import { EyeOutlined, EyeInvisibleOutlined, CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { usePaperStore, PaperNode } from '../store';

import './TreeNode.less';

interface TreeNodeProps {
  node: PaperNode;
  level: number;
}

export const TreeNode: React.FC<TreeNodeProps> = ({ node, level }) => {
  const { 
    expandedNodes, 
    toggleNodeExpanded, 
    selectNode, 
    toggleNodeVisibility,
    selectedNode
  } = usePaperStore();
  
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpanded(node.id);
  };
  
  const handleSelect = () => {
    selectNode(node.id);
  };
  
  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeVisibility(node.id);
  };

  // 根据节点类型返回对应的样式类名
  const getTypeClassName = (type: string) => {
    return type.toLowerCase().replace(/\s+/g, '-');
  };
  
  return (
    <div className="tree-node-container">
      <div 
        className={`tree-node ${isSelected ? 'selected' : ''}`} 
        style={{ '--indent': `${level * 16}px` } as React.CSSProperties}
        onClick={handleSelect}
      >
        {/* 展开/折叠图标 */}
        {node.children.length > 0 ? (
          <span 
            className={`expand-icon ${isExpanded ? 'expanded' : ''}`} 
            onClick={handleToggleExpand}
          >
           <CaretRightOutlined />
          </span>
        ) : (
          <span className="expand-icon" style={{ visibility: 'hidden' }}>
            <CaretRightOutlined />
          </span>
        )}
        
        {/* 可见性图标 */}
        <span 
          className={`visibility-icon ${node.visible ? 'visible' : 'hidden'}`}
          onClick={handleToggleVisibility}
          title={node.visible ? '点击隐藏' : '点击显示'}
        >
          {node.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
        </span>
        
        {/* 节点类型标签 */}
        <span className={`node-type ${getTypeClassName(node.type)}`}>
          {node.type}
        </span>
        
        {/* 节点名称 */}
        <span className={`node-name ${!node.name ? 'empty' : ''}`}>
          {node.name || ''}
        </span>
      </div>
      
      {/* 子节点 */}
      {isExpanded && node.children.length > 0 && (
        <div className="tree-node-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};