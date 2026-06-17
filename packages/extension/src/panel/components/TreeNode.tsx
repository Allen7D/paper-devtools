import React from 'react';
import { EyeOutlined, EyeInvisibleOutlined, CaretRightOutlined } from '@ant-design/icons';
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
    selectedNode,
    hoveredNode,
    hoverNode,
    clearHover,
    overlayEnabled
  } = usePaperStore();

  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const isHovered = hoveredNode?.id === node.id;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpanded(node.id);
  };

  const handleSelect = () => {
    selectNode(node.id);
  };

  const handleMouseEnter = () => {
    if (overlayEnabled) {
      hoverNode(node.id);
    }
  };

  const handleMouseLeave = () => {
    if (overlayEnabled) {
      clearHover();
    }
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeVisibility(node.id);
  };

  const getTypeClassName = (type: string) => {
    return type.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <div className="tree-node-container">
      <div
        className={`tree-node ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
        style={{ '--indent': `${level * 16}px` } as React.CSSProperties}
        onClick={handleSelect}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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

        <span
          className={`visibility-icon ${node.visible ? 'visible' : 'hidden'}`}
          onClick={handleToggleVisibility}
          title={node.visible ? '点击隐藏' : '点击显示'}
        >
          {node.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
        </span>

        <span className={`node-type ${getTypeClassName(node.type)}`}>
          {node.type}
        </span>

        <span className={`node-name ${!node.name ? 'empty' : ''}`}>
          {node.name || ''}
        </span>
      </div>

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
