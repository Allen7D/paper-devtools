import React, { useEffect, useRef } from 'react';
import { EyeOutlined, EyeInvisibleOutlined, CaretRightOutlined, UngroupOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
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
    explodeGroupId,
    enableExplodeMode,
    disableExplodeMode,
    expandAllDescendants,
    collapseAllDescendants,
    focusedNodeId,
    focusNode,
    exitFocus,
  } = usePaperStore();

  const nodeRef = useRef<HTMLDivElement>(null);

  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const isHovered = hoveredNode?.id === node.id;
  const isExplodeActive = explodeGroupId === node.id;
  const hasChildren = node.children.length > 0;

  const contextMenuItems: MenuProps['items'] = [
    {
      key: 'expandAll',
      label: '递归展开',
      disabled: !hasChildren,
      onClick: () => expandAllDescendants(node.id),
    },
    {
      key: 'collapseAll',
      label: '递归折叠',
      disabled: !hasChildren,
      onClick: () => collapseAllDescendants(node.id),
    },
    { type: 'divider' },
    {
      key: 'focus',
      label: '聚焦',
      onClick: () => focusNode(node.id),
    },
    ...(focusedNodeId !== null
      ? [{ key: 'exitFocus', label: '退出聚焦', onClick: () => exitFocus() }]
      : []),
  ];

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

  const handleSelect = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // 交互式 icon 点击：分别处理，不触发行选中。
    // 统一在行点击中处理，避免 Dropdown 的 Trigger 在扩展环境下
    // 干扰子元素 onClick 事件传播（devtool-local 不受影响）。
    if (target.closest('.expand-icon')) {
      toggleNodeExpanded(node.id);
      return;
    }
    if (target.closest('.visibility-icon')) {
      toggleNodeVisibility(node.id);
      return;
    }
    if (target.closest('.explode-icon')) {
      if (isExplodeActive) {
        disableExplodeMode();
      } else {
        enableExplodeMode(node.id);
      }
      return;
    }

    selectNode(node.id);
  };

  const handleMouseEnter = () => {
    hoverNode(node.id);
  };

  const handleMouseLeave = () => {
    clearHover();
  };

  const getTypeClassName = (type: string) => {
    return type.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
      <div
        className="tree-node-container"
        onContextMenu={(e) => e.stopPropagation()}
      >
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

          {node.type === 'Group' && (
            <span
              className={`explode-icon ${isExplodeActive ? 'active' : ''}`}
              title={isExplodeActive ? '退出组合爆炸' : '启用组合爆炸'}
            >
              <UngroupOutlined />
            </span>
          )}
        </div>

        {isExpanded && node.children.length > 0 && (
          <div className="tree-node-children">
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} level={level + 1} searchQuery={searchQuery} />
            ))}
          </div>
        )}
      </div>
    </Dropdown>
  );
};
