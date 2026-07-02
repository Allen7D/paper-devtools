import React, { useEffect, useRef } from 'react';
import { EyeOutlined, EyeInvisibleOutlined, CaretRightOutlined } from '@ant-design/icons';
import { usePaperStore, PaperNode } from '../store';

import './TreeNode.less';

interface TreeNodeProps {
  node: PaperNode;
  level: number;
  searchQuery?: string;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="search-highlight">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

export const TreeNode: React.FC<TreeNodeProps> = ({ node, level, searchQuery = '' }) => {
  const {
    expandedNodes,
    toggleNodeExpanded,
    selectNode,
    toggleNodeVisibility,
    selectedNode,
    hoveredNode,
    hoverNode,
    clearHover,
  } = usePaperStore();

  const nodeRef = useRef<HTMLDivElement>(null);

  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const isHovered = hoveredNode?.id === node.id;

  useEffect(() => {
    if (isSelected && nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      const container = nodeRef.current.closest('.scene-tree-content');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const isVisible =
        rect.top >= containerRect.top &&
        rect.bottom <= containerRect.bottom;

      if (!isVisible) {
        nodeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [isSelected, selectedNode?.id]);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpanded(node.id);
  };

  const handleSelect = () => {
    selectNode(node.id);
  };

  const handleMouseEnter = () => {
    hoverNode(node.id);
  };

  const handleMouseLeave = () => {
    clearHover();
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
        ref={nodeRef}
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
          <HighlightText text={node.type} query={searchQuery} />
        </span>

        <span className={`node-name ${!node.name ? 'empty' : ''}`}>
          {node.name ? <HighlightText text={node.name} query={searchQuery} /> : ''}
        </span>
      </div>

      {isExpanded && node.children.length > 0 && (
        <div className="tree-node-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
};
